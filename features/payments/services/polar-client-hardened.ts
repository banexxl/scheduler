import "server-only";

/**
 * Hardened Polar Client — Milestone 11.9.
 *
 * Centralized provider HTTP with timeout, retry, rate-limit handling,
 * and normalized error types. All Polar calls should flow through here.
 */

import { logger } from "@/lib/logging";

// ─── Provider Error Types ────────────────────────────────────────────────────

export class ProviderRateLimitError extends Error {
  readonly retryAfterMs: number | null;
  constructor(retryAfterMs: number | null = null) {
    super("Provider rate limit exceeded");
    this.name = "ProviderRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class ProviderAuthenticationError extends Error {
  constructor() {
    super("Provider authentication failed");
    this.name = "ProviderAuthenticationError";
  }
}

export class ProviderNotFoundError extends Error {
  constructor(resource: string) {
    super(`Provider resource not found: ${resource}`);
    this.name = "ProviderNotFoundError";
  }
}

export class ProviderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderValidationError";
  }
}

export class ProviderUnavailableError extends Error {
  constructor() {
    super("Provider temporarily unavailable");
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderTimeoutError extends Error {
  constructor() {
    super("Provider request timed out");
    this.name = "ProviderTimeoutError";
  }
}

// ─── Hardened Fetch ──────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 12_000; // 12 seconds

export async function polarFetchHardened<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new ProviderAuthenticationError();
  }

  const baseUrl = (process.env.POLAR_API_BASE_URL ?? "https://api.polar.sh").replace(/\/$/, "");
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const timeout = init?.timeoutMs ?? REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : null;
      throw new ProviderRateLimitError(retryMs);
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderAuthenticationError();
    }

    if (response.status === 404) {
      throw new ProviderNotFoundError(path);
    }

    if (response.status === 400 || response.status === 422) {
      const body = await response.text().catch(() => "");
      throw new ProviderValidationError(`Polar validation error: ${body.slice(0, 150)}`);
    }

    if (response.status >= 500) {
      throw new ProviderUnavailableError();
    }

    if (!response.ok) {
      throw new ProviderUnavailableError();
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Determines if a provider error is retryable.
 */
export function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof ProviderRateLimitError) return true;
  if (error instanceof ProviderUnavailableError) return true;
  if (error instanceof ProviderTimeoutError) return true;
  return false;
}
