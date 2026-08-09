/**
 * GET /api/health
 *
 * Lightweight liveness check. Returns minimal safe response.
 * No secrets, no DB calls, no sensitive data.
 */
export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "dev",
  });
}
