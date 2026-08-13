import { notFound } from "next/navigation";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import type { CampaignStatus, RecipientStatus } from "@/features/campaigns/types/campaign";
import CampaignActionsClient from "./campaign-actions-client";

/**
 * Campaign Detail Page — Milestone 15.7.
 */
export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; campaignId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tenantSlug, campaignId } = await params;
  const { page: pageParam } = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();

  // Load campaign
  const { data: campaign } = await supabase
    .from("customer_campaigns" as never)
    .select("*" as never)
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!campaign) notFound();

  type CampaignRow = {
    id: string; name: string; channel: string; status: CampaignStatus;
    subject: string | null; content: string | null; cta_text: string | null; cta_url: string | null;
    segment_id: string | null; audience_source: string; audience_name_snapshot: string | null;
    matched_count: number; eligible_count: number; sent_count: number;
    delivered_count: number; failed_count: number; skipped_count: number;
    scheduled_for: string | null; started_at: string | null;
    completed_at: string | null; cancelled_at: string | null;
    created_at: string; updated_at: string;
  };

  const c = campaign as unknown as CampaignRow;

  // Load recipients (paginated)
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));
  const pageSize = 25;
  const offset = (currentPage - 1) * pageSize;

  const { data: recipients, count: recipientCount } = await supabase
    .from("customer_campaign_recipients" as never)
    .select("id, customer_id, recipient_email, status, skip_reason, sent_at, failed_at, error_code" as never, { count: "exact" })
    .eq("campaign_id" as never, campaignId)
    .order("created_at" as never, { ascending: false })
    .range(offset, offset + pageSize - 1);

  type RecipientRow = {
    id: string; customer_id: string | null; recipient_email: string | null;
    status: RecipientStatus; skip_reason: string | null;
    sent_at: string | null; failed_at: string | null; error_code: string | null;
  };

  const recipientRows = (recipients ?? []) as unknown as RecipientRow[];
  const totalRecipientPages = Math.max(1, Math.ceil((recipientCount ?? 0) / pageSize));

  function getStatusColor(status: CampaignStatus): "default" | "success" | "warning" | "error" | "info" {
    switch (status) {
      case "draft": return "default";
      case "scheduled": return "info";
      case "processing": return "warning";
      case "completed": return "success";
      case "cancelled": return "default";
      case "failed": return "error";
    }
  }

  function getRecipientStatusColor(status: RecipientStatus): "default" | "success" | "warning" | "error" | "info" {
    switch (status) {
      case "eligible": return "info";
      case "queued": return "warning";
      case "sent": return "success";
      case "delivered": return "success";
      case "failed": return "error";
      case "skipped": return "default";
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={c.name}
        breadcrumbs={[
          { label: "Campaigns", href: `/${tenantSlug}/campaigns` },
          { label: c.name },
        ]}
        status={<Chip label={c.status} size="small" color={getStatusColor(c.status)} />}
        action={
          c.status === "draft" ? (
            <CampaignActionsClient tenantSlug={tenantSlug} campaignId={c.id} status={c.status} />
          ) : c.status === "scheduled" ? (
            <CampaignActionsClient tenantSlug={tenantSlug} campaignId={c.id} status={c.status} />
          ) : undefined
        }
      />

      {/* Metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: "#f0f9ff", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#2563eb" }}>{c.matched_count}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Matched</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: "#f0fdf4", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#16a34a" }}>{c.eligible_count}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Eligible</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: "#ecfdf5", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669" }}>{c.sent_count}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Sent</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: "#fef2f2", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#dc2626" }}>{c.failed_count}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Failed</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: "#f5f5f5", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#737373" }}>{c.skipped_count}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Skipped</Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Campaign Info */}
      <SectionCard title="Campaign Details">
        <Stack spacing={1.5} sx={{ fontSize: "0.8125rem" }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af", minWidth: 100 }}>Audience</Typography>
            <Typography sx={{ fontSize: "0.8125rem" }}>{c.audience_name_snapshot ?? "—"}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af", minWidth: 100 }}>Subject</Typography>
            <Typography sx={{ fontSize: "0.8125rem" }}>{c.subject ?? "—"}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af", minWidth: 100 }}>Content</Typography>
            <Typography sx={{ fontSize: "0.8125rem", whiteSpace: "pre-wrap", maxWidth: 500 }}>{c.content ?? "—"}</Typography>
          </Box>
          {c.cta_text && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af", minWidth: 100 }}>CTA</Typography>
              <Typography sx={{ fontSize: "0.8125rem" }}>{c.cta_text} → {c.cta_url}</Typography>
            </Box>
          )}
          {c.scheduled_for && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af", minWidth: 100 }}>Scheduled</Typography>
              <Typography sx={{ fontSize: "0.8125rem" }}>{new Date(c.scheduled_for).toLocaleString()}</Typography>
            </Box>
          )}
          {c.started_at && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af", minWidth: 100 }}>Started</Typography>
              <Typography sx={{ fontSize: "0.8125rem" }}>{new Date(c.started_at).toLocaleString()}</Typography>
            </Box>
          )}
          {c.completed_at && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af", minWidth: 100 }}>Completed</Typography>
              <Typography sx={{ fontSize: "0.8125rem" }}>{new Date(c.completed_at).toLocaleString()}</Typography>
            </Box>
          )}
        </Stack>
      </SectionCard>

      {/* Recipients */}
      <SectionCard title={`Recipients (${recipientCount ?? 0})`}>
        {recipientRows.length === 0 ? (
          <PlatformEmptyState title="No recipients" description="Recipients will appear here after the campaign is sent." />
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Sent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recipientRows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{r.recipient_email ?? "—"}</TableCell>
                    <TableCell>
                      <Chip label={r.status} size="small" color={getRecipientStatusColor(r.status)} />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      {r.skip_reason?.replace(/_/g, " ") ?? r.error_code ?? "—"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalRecipientPages > 1 && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
                {currentPage > 1 && (
                  <Button href={`/${tenantSlug}/campaigns/${campaignId}?page=${currentPage - 1}`} size="small" variant="text">
                    Previous
                  </Button>
                )}
                <Typography sx={{ fontSize: "0.8125rem", lineHeight: "32px", color: "#6b7280" }}>
                  Page {currentPage} of {totalRecipientPages}
                </Typography>
                {currentPage < totalRecipientPages && (
                  <Button href={`/${tenantSlug}/campaigns/${campaignId}?page=${currentPage + 1}`} size="small" variant="text">
                    Next
                  </Button>
                )}
              </Stack>
            )}
          </>
        )}
      </SectionCard>
    </Stack>
  );
}
