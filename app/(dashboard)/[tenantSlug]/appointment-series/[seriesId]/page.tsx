import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import StatusChip from "@/components/ui/status-chip";

/**
 * Appointment Series Detail — Milestone 15.1.
 */
export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; seriesId: string }>;
}) {
  const { tenantSlug, seriesId } = await params;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();

  // Load series
  const { data: series } = await supabase
    .from("appointment_series")
    .select("*")
    .eq("id", seriesId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!series) notFound();

  const s = series as Record<string, unknown>;

  // Load occurrences
  const { data: occurrences } = await supabase
    .from("appointments")
    .select("id, status, starts_at, series_occurrence_index, is_series_exception")
    .eq("series_id", seriesId)
    .eq("tenant_id", tenant.id)
    .order("series_occurrence_index", { ascending: true })
    .limit(52);

  const appts = (occurrences ?? []) as Array<{
    id: string;
    status: string;
    starts_at: string;
    series_occurrence_index: number;
    is_series_exception: boolean;
  }>;

  const upcoming = appts.filter((a) => ["confirmed", "pending"].includes(a.status));
  const completed = appts.filter((a) => a.status === "completed");
  const cancelled = appts.filter((a) => a.status === "cancelled");

  // Build summary
  const recurrenceType = String(s.recurrence_type ?? "");
  const interval = Number(s.recurrence_interval ?? 1);
  const time = String(s.starts_at_local_time ?? "").slice(0, 5);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Recurring Series"
        description={`${String(s.service_name_snapshot)} — ${String(s.customer_name)}`}
        breadcrumbs={[
          { label: "Appointments", href: `/${tenantSlug}/appointments` },
          { label: "Series" },
        ]}
        status={<StatusChip label={String(s.status ?? "active")} size="small" />}
      />

      {/* Summary */}
      <SectionCard title="Recurrence Pattern">
        <Stack spacing={1}>
          <Typography sx={{ fontSize: "0.875rem" }}>
            <strong>Type:</strong> {recurrenceType} (every {interval})
          </Typography>
          <Typography sx={{ fontSize: "0.875rem" }}>
            <strong>Time:</strong> {time} ({String(s.timezone ?? "")})
          </Typography>
          <Typography sx={{ fontSize: "0.875rem" }}>
            <strong>Starts:</strong> {String(s.starts_on ?? "")}
          </Typography>
          {s.ends_on ? (
            <Typography sx={{ fontSize: "0.875rem" }}>
              <strong>Ends:</strong> {String(s.ends_on)}
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: "0.875rem" }}>
            <strong>Total occurrences:</strong> {appts.length}
          </Typography>
        </Stack>
      </SectionCard>

      {/* Details */}
      <SectionCard title="Details">
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: "0.8125rem" }}><strong>Service:</strong> {String(s.service_name_snapshot)}</Typography>
          <Typography sx={{ fontSize: "0.8125rem" }}><strong>Location:</strong> {String(s.location_name_snapshot)}</Typography>
          {s.resource_name_snapshot ? (
            <Typography sx={{ fontSize: "0.8125rem" }}><strong>Resource:</strong> {String(s.resource_name_snapshot)}</Typography>
          ) : null}
          <Typography sx={{ fontSize: "0.8125rem" }}><strong>Duration:</strong> {String(s.duration_minutes)} min</Typography>
          <Typography sx={{ fontSize: "0.8125rem" }}><strong>Customer:</strong> {String(s.customer_name)}</Typography>
        </Stack>
      </SectionCard>

      {/* Upcoming */}
      <SectionCard title={`Upcoming (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <Typography sx={{ fontSize: "0.8125rem", color: "#6b7280" }}>No upcoming appointments.</Typography>
        ) : (
          <Stack spacing={1}>
            {upcoming.slice(0, 20).map((a) => (
              <Box key={a.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontSize: "0.8125rem" }}>
                  #{a.series_occurrence_index} — {new Date(a.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {a.is_series_exception && " *"}
                </Typography>
                <StatusChip label={a.status} size="small" />
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>

      {/* Completed */}
      {completed.length > 0 && (
        <SectionCard title={`Completed (${completed.length})`}>
          <Stack spacing={0.5}>
            {completed.slice(0, 10).map((a) => (
              <Typography key={a.id} sx={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                #{a.series_occurrence_index} — {new Date(a.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </Typography>
            ))}
          </Stack>
        </SectionCard>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <SectionCard title={`Cancelled (${cancelled.length})`}>
          <Stack spacing={0.5}>
            {cancelled.slice(0, 10).map((a) => (
              <Typography key={a.id} sx={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
                #{a.series_occurrence_index} — {new Date(a.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </Typography>
            ))}
          </Stack>
        </SectionCard>
      )}
    </Stack>
  );
}
