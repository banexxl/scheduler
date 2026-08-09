import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";

/**
 * GET /api/health/supabase
 *
 * Readiness check — verifies core DB dependency is reachable.
 * Uses a lightweight single-row query with limit 1.
 * Does not expose connection details or secrets.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("tenants")
      .select("id")
      .limit(1);

    if (error) {
      logger.warn("health_supabase_failed", { errorCategory: "DATABASE" });
      return Response.json(
        { status: "error", supabase: "unavailable" },
        { status: 503 }
      );
    }

    return Response.json({ status: "ok", supabase: "connected" });
  } catch {
    logger.warn("health_supabase_unexpected_error", { errorCategory: "DATABASE" });
    return Response.json(
      { status: "error", supabase: "unavailable" },
      { status: 503 }
    );
  }
}
