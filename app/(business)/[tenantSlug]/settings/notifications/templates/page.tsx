import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { resolveTemplate } from "@/features/notifications/services/notification-template-service";
import NotificationTemplateEditor from "@/features/notifications/components/notification-template-editor";
import type { NotificationTemplateType } from "@/features/notifications/types/notification";

const TEMPLATE_TYPES: NotificationTemplateType[] = [
  "appointment_created",
  "appointment_rescheduled",
  "appointment_cancelled",
];

export default async function NotificationTemplatesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  // Load all templates with defaults
  const templates = await Promise.all(
    TEMPLATE_TYPES.map(async (type) => {
      const resolved = await resolveTemplate(tenant.id, type);
      return { type, ...resolved };
    })
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/settings/notifications`} variant="body2">
          &larr; Back to Notification Settings
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Email Templates
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize email templates for appointment notifications. Use {"{{variables}}"} to insert
        dynamic appointment data. Changes affect future notifications only.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {templates.map((template) => (
          <NotificationTemplateEditor
            key={template.type}
            tenantSlug={tenantSlug}
            templateType={template.type}
            subjectTemplate={template.subject}
            bodyTemplate={template.body}
            isCustom={template.isCustom}
          />
        ))}
      </Box>
    </Box>
  );
}
