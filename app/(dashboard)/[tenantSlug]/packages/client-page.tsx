"use client";

/**
 * Packages Client Page — Milestone 8.9.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";
import { togglePackageAction } from "@/features/packages/actions/package-actions";
import type { ServicePackageListItem } from "@/features/packages/types/package";

type Props = {
  tenantSlug: string;
  packages: ServicePackageListItem[];
  canManage: boolean;
};

export default function PackagesClientPage({ tenantSlug, packages, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleToggle(pkgId: string, active: boolean) {
    const result = await togglePackageAction(tenantSlug, pkgId, active);
    if (result.success) startTransition(() => router.refresh());
    else setFeedback(result.error);
  }

  return (
    <Box>
      {feedback && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback}</Alert>}

      {canManage && (
        <Button
          component="a"
          href={`/${tenantSlug}/packages/new`}
          variant="contained"
          size="small"
          sx={{ mb: 2 }}
        >
          Create Package
        </Button>
      )}

      {packages.length === 0 ? (
        <Typography color="text.secondary">No packages created yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {packages.map((pkg) => (
            <Paper key={pkg.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{pkg.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pkg.totalCredits} credits
                    {pkg.validityDays && ` • ${pkg.validityDays} days validity`}
                    {` • ${pkg.serviceCount} service${pkg.serviceCount !== 1 ? "s" : ""}`}
                    {` • ${pkg.assignmentCount} assigned`}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={pkg.isActive ? "Active" : "Inactive"}
                    size="small"
                    color={pkg.isActive ? "success" : "default"}
                    variant="outlined"
                  />
                  {pkg.isPublic && <Chip label="Public" size="small" variant="outlined" />}
                  {canManage && (
                    <>
                      <Switch
                        checked={pkg.isActive}
                        onChange={(e) => handleToggle(pkg.id, e.target.checked)}
                        size="small"
                        disabled={isPending}
                      />
                      <Button
                        component="a"
                        href={`/${tenantSlug}/packages/${pkg.id}/edit`}
                        size="small"
                        variant="text"
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
