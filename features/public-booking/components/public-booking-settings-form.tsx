"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useRouter } from "next/navigation";
import { updatePublicBookingSettingsAction } from "../actions/update-public-booking-settings-action";
import type { PublicBookingSettings } from "../types/public-booking";

type Props = {
  tenantSlug: string;
  initialSettings: PublicBookingSettings;
};

export default function PublicBookingSettingsForm({ tenantSlug, initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update<K extends keyof PublicBookingSettings>(key: K, value: PublicBookingSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);

    const result = await updatePublicBookingSettingsAction(tenantSlug, settings);

    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Settings saved.</Alert>}

      <FormControlLabel
        control={<Switch checked={settings.isEnabled} onChange={(e) => update("isEnabled", e.target.checked)} />}
        label={<Typography fontWeight={600}>Enable Public Booking</Typography>}
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Display Options</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <FormControlLabel control={<Switch checked={settings.allowResourceSelection} onChange={(e) => update("allowResourceSelection", e.target.checked)} />} label="Allow resource selection" />
        <FormControlLabel control={<Switch checked={settings.allowNoPreference} onChange={(e) => update("allowNoPreference", e.target.checked)} />} label="Allow 'no preference' option" />
        <FormControlLabel control={<Switch checked={settings.showServicePrices} onChange={(e) => update("showServicePrices", e.target.checked)} />} label="Show prices" />
        <FormControlLabel control={<Switch checked={settings.showServiceDuration} onChange={(e) => update("showServiceDuration", e.target.checked)} />} label="Show duration" />
        <FormControlLabel control={<Switch checked={settings.showResourceNames} onChange={(e) => update("showResourceNames", e.target.checked)} />} label="Show resource names" />
      </Box>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Custom Messages</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
        <TextField label="Booking Page Title" value={settings.bookingPageTitle ?? ""} onChange={(e) => update("bookingPageTitle", e.target.value || null)} fullWidth size="small" inputProps={{ maxLength: 160 }} />
        <TextField label="Booking Page Description" value={settings.bookingPageDescription ?? ""} onChange={(e) => update("bookingPageDescription", e.target.value || null)} fullWidth multiline rows={2} size="small" inputProps={{ maxLength: 2000 }} />
        <TextField label="Confirmation Message" value={settings.confirmationMessage ?? ""} onChange={(e) => update("confirmationMessage", e.target.value || null)} fullWidth multiline rows={2} size="small" inputProps={{ maxLength: 2000 }} helperText="Shown after successful booking" />
      </Box>

      <Button onClick={handleSave} disabled={saving} variant="contained">
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </Paper>
  );
}
