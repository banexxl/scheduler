import { notFound } from "next/navigation";
import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import AutomationEditClient from "./client-page";

/**
 * Edit Automation Page — Milestone 15.8.
 */
export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; automationId: string }>;
}) {
  const { tenantSlug, automationId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin", "manager"]);

  const supabase = createServiceRoleClient();

  const { data: automation } = await supabase
    .from("marketing_automations" as never)
    .select("id, name, description, trigger_type, trigger_config, re_enrollment_policy, timezone, status" as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!automation) notFound();

  const a = automation as unknown as {
    id: string; name: string; description: string | null;
    trigger_type: string; trigger_config: Record<string, unknown>;
    re_enrollment_policy: string; timezone: string; status: string;
  };

  if (a.status !== "draft") notFound();

  return (
    <Stack spacing={2}>
      <PageHeader
        title={`Edit: ${a.name}`}
        breadcrumbs={[
          { label: "Automations", href: `/${tenantSlug}/automations` },
          { label: a.name, href: `/${tenantSlug}/automations/${automationId}` },
          { label: "Edit" },
        ]}
      />
      <AutomationEditClient
        tenantSlug={tenantSlug}
        automationId={automationId}
        initialName={a.name}
        initialDescription={a.description ?? ""}
        initialTriggerType={a.trigger_type}
        initialTriggerConfig={a.trigger_config}
      />
    </Stack>
  );
}
