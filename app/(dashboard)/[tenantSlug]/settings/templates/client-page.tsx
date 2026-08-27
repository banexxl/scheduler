"use client";

/**
 * Templates Settings Client Page — Milestone 16.2.
 *
 * Interactive template browser with preview and one-click activation.
 */

import { useState, useTransition } from "react";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import TemplateCard from "@/components/templates/TemplateCard";
import TemplatePreview from "@/components/templates/TemplatePreview";
import { updateTenantTemplate } from "@/features/templates/actions/template-actions";
import type { TemplateInfo, TemplateId } from "@/features/templates/types";

type Props = {
  tenantSlug: string;
  templates: TemplateInfo[];
  activeTemplateId: TemplateId;
};

export default function TemplatesClientPage({
  tenantSlug,
  templates,
  activeTemplateId,
}: Props) {
  const [active, setActive] = useState<TemplateId>(activeTemplateId);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleActivate = (templateId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await updateTenantTemplate(tenantSlug, templateId);
      if (result.success) {
        setActive(templateId as TemplateId);
        setPreviewTemplate(null);
      } else {
        setError(result.message);
      }
    });
  };

  const handlePreview = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId) ?? null;
    setPreviewTemplate(tpl);
  };

  return (
    <>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {templates.map((tpl) => (
          <Grid key={tpl.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <TemplateCard
              template={tpl}
              isActive={tpl.id === active}
              onPreview={handlePreview}
              onActivate={handleActivate}
              activating={isPending}
            />
          </Grid>
        ))}
      </Grid>

      <TemplatePreview
        open={previewTemplate !== null}
        template={previewTemplate}
        isActive={previewTemplate?.id === active}
        onClose={() => setPreviewTemplate(null)}
        onActivate={handleActivate}
        activating={isPending}
      />
    </>
  );
}
