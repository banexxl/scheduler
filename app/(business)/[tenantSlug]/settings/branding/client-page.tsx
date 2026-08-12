"use client";

/**
 * Branding Editor Client — Milestone 14.4.
 *
 * Interactive editor with live preview, save draft, and publish controls.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import type { TenantBrandingConfig } from "@/features/branding/types/branding-config";
import { FONT_PRESETS, RADIUS_PRESETS, APPEARANCE_MODES, HERO_LAYOUTS } from "@/features/branding/types/branding-config";
import {
  saveTenantBrandingDraftAction,
  publishTenantBrandingAction,
  resetTenantBrandingDraftAction,
} from "@/features/branding/actions/branding-actions";

type Props = {
  tenantSlug: string;
  draftConfig: TenantBrandingConfig;
  publishedConfig: TenantBrandingConfig;
  draftVersion: number;
  publishedVersion: number;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
};

export default function BrandingEditorClient({
  tenantSlug,
  draftConfig,
  draftVersion,
  publishedVersion,
  publishedAt,
  hasUnpublishedChanges,
}: Props) {
  const [config, setConfig] = useState<TenantBrandingConfig>(draftConfig);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const updateField = <K extends keyof TenantBrandingConfig>(key: K, value: TenantBrandingConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveDraft = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveTenantBrandingDraftAction(tenantSlug, config);
      if (result.success) setMessage(result.message ?? "Saved!");
      else setError(result.message);
    });
  };

  const handlePublish = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await publishTenantBrandingAction(tenantSlug, draftVersion);
      if (result.success) setMessage(result.message ?? "Published!");
      else setError(result.message);
    });
  };

  const handleReset = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await resetTenantBrandingDraftAction(tenantSlug);
      if (result.success) {
        setMessage(result.message ?? "Reset!");
        window.location.reload();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Stack spacing={3}>
      {/* Status */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {publishedVersion > 0 && (
          <Chip label={`Published v${publishedVersion}`} size="small" color="success" variant="outlined" />
        )}
        {hasUnpublishedChanges && (
          <Chip label="Unpublished changes" size="small" color="warning" variant="outlined" />
        )}
        {publishedAt && (
          <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            Last published: {new Date(publishedAt).toLocaleString()}
          </Typography>
        )}
      </Stack>

      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Editor */}
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        {/* Controls */}
        <Stack spacing={2.5}>
          <Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>Colors</Typography>
          <TextField label="Primary Color" value={config.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} size="small" type="color" InputLabelProps={{ shrink: true }} />
          <TextField label="Accent Color" value={config.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} size="small" type="color" InputLabelProps={{ shrink: true }} />
          <TextField label="Background" value={config.backgroundColor} onChange={(e) => updateField("backgroundColor", e.target.value)} size="small" type="color" InputLabelProps={{ shrink: true }} />
          <TextField label="Surface" value={config.surfaceColor} onChange={(e) => updateField("surfaceColor", e.target.value)} size="small" type="color" InputLabelProps={{ shrink: true }} />

          <Divider />
          <Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>Style</Typography>

          <FormControl size="small">
            <InputLabel>Appearance</InputLabel>
            <Select value={config.appearance} label="Appearance" onChange={(e) => updateField("appearance", e.target.value as typeof config.appearance)}>
              {APPEARANCE_MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Font</InputLabel>
            <Select value={config.fontPreset} label="Font" onChange={(e) => updateField("fontPreset", e.target.value as typeof config.fontPreset)}>
              {FONT_PRESETS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Border Radius</InputLabel>
            <Select value={config.radiusPreset} label="Border Radius" onChange={(e) => updateField("radiusPreset", e.target.value as typeof config.radiusPreset)}>
              {RADIUS_PRESETS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Hero Layout</InputLabel>
            <Select value={config.heroLayout} label="Hero Layout" onChange={(e) => updateField("heroLayout", e.target.value as typeof config.heroLayout)}>
              {HERO_LAYOUTS.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
            </Select>
          </FormControl>

          <Divider />
          <Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>Identity</Typography>
          <TextField label="Tagline" value={config.tagline ?? ""} onChange={(e) => updateField("tagline", e.target.value || null)} size="small" placeholder="Short business description" inputProps={{ maxLength: 200 }} />
        </Stack>

        {/* Preview */}
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            bgcolor: config.backgroundColor,
            color: config.appearance === "dark" ? "#ffffff" : "#1f2937",
            minHeight: 300,
          }}
        >
          <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", mb: 2 }}>Preview</Typography>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: config.primaryColor }}>
              Business Name
            </Typography>
            {config.tagline && (
              <Typography sx={{ fontSize: "0.8125rem", mt: 0.5, opacity: 0.7 }}>
                {config.tagline}
              </Typography>
            )}
          </Box>
          <Box sx={{ p: 2, bgcolor: config.surfaceColor, borderRadius: `${config.radiusPreset === "square" ? 4 : config.radiusPreset === "soft" ? 10 : 18}px`, mb: 2 }}>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>Haircut</Typography>
            <Typography sx={{ fontSize: "0.75rem", opacity: 0.7 }}>30 min • €15.00</Typography>
          </Box>
          <Button variant="contained" size="small" sx={{ bgcolor: config.primaryColor, color: "#fff", borderRadius: `${config.radiusPreset === "square" ? 4 : config.radiusPreset === "soft" ? 10 : 18}px` }}>
            Book Now
          </Button>
        </Box>
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Button variant="contained" onClick={handleSaveDraft} disabled={pending} size="small">
          Save Draft
        </Button>
        <Button variant="outlined" onClick={handlePublish} disabled={pending} size="small" color="success">
          Publish
        </Button>
        <Button variant="text" onClick={handleReset} disabled={pending} size="small" color="warning">
          Reset Draft
        </Button>
      </Stack>
    </Stack>
  );
}
