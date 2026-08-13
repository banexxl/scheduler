import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateExport } from "@/features/analytics/services/export-service";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { AdvancedAnalyticsFilters, AnalyticsReportType } from "@/features/analytics/types/advanced-analytics";

/**
 * GET /api/internal/analytics/export
 *
 * Generates and returns a CSV export for analytics reports.
 * Requires authenticated user with tenant membership.
 *
 * Query params: tenantId, reportType, period, customStart?, customEnd?, locationId?, resourceId?, serviceId?
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const reportType = searchParams.get("reportType") as AnalyticsReportType | null;
  const period = searchParams.get("period") ?? "30days";

  if (!tenantId || !reportType) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  // Verify membership
  const { data: membership } = await supabase
    .from("tenant_members" as never)
    .select("role" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("user_id" as never, user.id)
    .eq("status" as never, "active")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Finance reports require owner/admin
  const role = (membership as unknown as { role: string }).role;
  if (reportType === "finance" && !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions for financial exports" }, { status: 403 });
  }

  // Get tenant timezone
  const { data: tenant } = await supabase
    .from("tenants")
    .select("default_timezone")
    .eq("id", tenantId)
    .single();

  const timeZone = (tenant as { default_timezone: string } | null)?.default_timezone ?? "UTC";

  const filters: AdvancedAnalyticsFilters = {
    period: period as AdvancedAnalyticsFilters["period"],
    customStart: searchParams.get("customStart") ?? undefined,
    customEnd: searchParams.get("customEnd") ?? undefined,
    locationId: searchParams.get("locationId") ?? undefined,
    resourceId: searchParams.get("resourceId") ?? undefined,
    serviceId: searchParams.get("serviceId") ?? undefined,
  };

  const log = createServerActionLogger({
    action: "analytics.export",
    tenantId,
    userId: user.id,
  });

  try {
    const result = await generateExport(tenantId, timeZone, reportType, filters);

    await log.success({ reportType, format: "csv", rowCount: result.rowCount });

    return new NextResponse(result.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    await log.failure(error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
