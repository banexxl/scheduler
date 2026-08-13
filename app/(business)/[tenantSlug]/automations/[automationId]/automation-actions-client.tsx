"use client";

/**
 * Automation Actions Client — Milestone 15.8.
 *
 * Action buttons based on automation status:
 * - Draft: Edit, Activate, Archive
 * - Active: Pause
 * - Paused: Resume, Archive
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import {
  activateAutomationAction,
  pauseAutomationAction,
  resumeAutomationAction,
  archiveAutomationAction,
} from "@/features/automations/actions/automation-actions";
import type { AutomationStatus, StepType } from "@/features/automations/types/automation";

type Props = {
  tenantSlug: string;
  automationId: string;
  status: AutomationStatus;
  steps: Array<{ stepType: StepType; config: Record<string, unknown> }>;
};

export default function AutomationActionsClient({ tenantSlug, automationId, status, steps }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleActivate = () => {
    if (!confirm("Activate this automation? New trigger events will start enrolling customers.")) return;
    startTransition(async () => {
      const result = await activateAutomationAction(tenantSlug, automationId, steps);
      if (result.success) router.refresh();
      else alert(result.message);
    });
  };

  const handlePause = () => {
    startTransition(async () => {
      await pauseAutomationAction(tenantSlug, automationId);
      router.refresh();
    });
  };

  const handleResume = () => {
    startTransition(async () => {
      await resumeAutomationAction(tenantSlug, automationId);
      router.refresh();
    });
  };

  const handleArchive = () => {
    if (!confirm("Archive this automation? It cannot be re-activated.")) return;
    startTransition(async () => {
      const result = await archiveAutomationAction(tenantSlug, automationId);
      if (result.success) router.push(`/${tenantSlug}/automations`);
    });
  };

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {status === "draft" && (
        <>
          <Button href={`/${tenantSlug}/automations/${automationId}/edit`} variant="outlined" size="small" disabled={pending}>Edit</Button>
          <Button variant="contained" size="small" onClick={handleActivate} disabled={pending || steps.length === 0}>Activate</Button>
          <Button variant="outlined" color="error" size="small" onClick={handleArchive} disabled={pending}>Archive</Button>
        </>
      )}
      {status === "active" && (
        <Button variant="outlined" color="warning" size="small" onClick={handlePause} disabled={pending}>Pause</Button>
      )}
      {status === "paused" && (
        <>
          <Button variant="contained" size="small" onClick={handleResume} disabled={pending}>Resume</Button>
          <Button variant="outlined" color="error" size="small" onClick={handleArchive} disabled={pending}>Archive</Button>
        </>
      )}
    </Stack>
  );
}
