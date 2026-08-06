/**
 * Rate-limiting foundation — Milestone 6.11.
 *
 * Simple in-memory sliding-window rate limiter for public endpoints.
 * Uses a Map-based store that resets on server restart.
 *
 * For production, this should be backed by Redis or a persistent store.
 * The abstraction allows swapping the backend without changing consumer code.
 *
 * Limits:
 * - Availability: 60 requests per 10 minutes per key
 * - Booking submission: 10 attempts per 10 minutes per key
 *
 * Key format: `${tenantSlug}:${ip}:${route}`
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type RateLimitConfig = {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

// ─── Preset Configurations ───────────────────────────────────────────────────

export const RATE_LIMIT_AVAILABILITY: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 10 * 60 * 1000, // 10 minutes
};

export const RATE_LIMIT_BOOKING: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 10 * 60 * 1000, // 10 minutes
};

// ─── In-Memory Store ─────────────────────────────────────────────────────────

type WindowEntry = {
  timestamps: number[];
  windowStart: number;
};

const store = new Map<string, WindowEntry>();

// Periodic cleanup (every 5 minutes, remove expired entries)
let cleanupScheduled = false;

function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  if (typeof globalThis !== "undefined" && "setInterval" in globalThis) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now - entry.windowStart > 20 * 60 * 1000) {
          store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

// ─── Check Rate Limit ────────────────────────────────────────────────────────

/**
 * Checks and records a request against the rate limit.
 *
 * @param key - Unique identifier (e.g., `tenantSlug:ip:route`)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  scheduleCleanup();

  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [], windowStart: now };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
  entry.windowStart = now;

  const currentCount = entry.timestamps.length;

  if (currentCount >= config.maxRequests) {
    // Find when the oldest request in window will expire
    const oldestInWindow = entry.timestamps[0] ?? now;
    const resetAt = oldestInWindow + config.windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
    resetAt: now + config.windowMs,
  };
}

// ─── Build Rate-Limit Key ────────────────────────────────────────────────────

/**
 * Builds a rate-limit key from components.
 * Uses tenant slug + IP + route type for isolation.
 */
export function buildRateLimitKey(
  tenantSlug: string,
  clientIp: string,
  route: "availability" | "booking"
): string {
  return `${tenantSlug}:${clientIp}:${route}`;
}
