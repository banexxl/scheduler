"use client";

/**
 * Campaign Edit Client — Milestone 15.7.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import { updateCampaignAction } from "@/features/campaigns/actions/campaign-actions";
import type { CampaignAudienceSource } from "@/features/campaigns/types/campaign";

type Props = {
  tenantSlug: string;
  campaignId: string;
  initialName: string;
  initialSubject: string;
  initialContent: string;
  initialCtaText: string;
  initialCtaUrl: string;
  initialSegmentId: string;
  initialAudienceSource: CampaignAudienceSource;
  savedSegments: Array<{ id: string; name: string }>;
  builtInSegments: Array<{ key: string; name: string }>;
};

export default function CampaignEditClient({
  tenantSlug,
  campaignId,
  initialName,
  initialSubject,
  initialContent,
  initialCtaText,
  initialCtaUrl,
  initialSegmentId,
  initialAudienceSource,
  savedSegments,
  builtInSegments,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);
  const [ctaText, setCtaText] = useState(initialCtaText);
  const [ctaUrl, setCtaUrl] = useState(initialCtaUrl);
  const [segmentId, setSegmentId] = useState(initialSegmentId);
  const [audienceSource, setAudienceSource] = useState<CampaignAudienceSource>(initialAudienceSource);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateCampaignAction(tenantSlug, campaignId, {
        name,
        subject,
        content,
        ctaText: ctaText || null,
        ctaUrl: ctaUrl || null,
        segmentId: audienceSource === "segment" ? segmentId : null,
        audienceSource,
      });
      if (result.success) {
        router.push(`/${tenantSlug}/campaigns/${campaignId}`);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} size="small" required fullWidth />

      <FormControl size="small" fullWidth>
        <InputLabel>Audience Type</InputLabel>
        <Select value={audienceSource} label="Audience Type" onChange={(e) => { setAudienceSource(e.target.value as CampaignAudienceSource); setSegmentId(""); }}>
          <MenuItem value="segment">Saved Segment</MenuItem>
          <MenuItem value="built_in_segment">Built-in Segment</MenuItem>
        </Select>
      </FormControl>

      {audienceSource === "segment" && (
        <FormControl size="small" fullWidth>
          <InputLabel>Select Segment</InputLabel>
          <Select value={segmentId} label="Select Segment" onChange={(e) => setSegmentId(e.target.value)}>
            {savedSegments.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {audienceSource === "built_in_segment" && (
        <FormControl size="small" fullWidth>
          <InputLabel>Select Built-in Segment</InputLabel>
          <Select value={segmentId} label="Select Built-in Segment" onChange={(e) => setSegmentId(e.target.value)}>
            {builtInSegments.map((s) => (
              <MenuItem key={s.key} value={s.key}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} size="small" required fullWidth />
      <TextField label="Message" value={content} onChange={(e) => setContent(e.target.value)} size="small" required fullWidth multiline rows={6} />
      <TextField label="CTA Button Text (optional)" value={ctaText} onChange={(e) => setCtaText(e.target.value)} size="small" fullWidth />
      <TextField label="CTA Button URL (optional)" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} size="small" fullWidth />

      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={handleSave} disabled={pending || !name.trim()} size="small">
          Save Changes
        </Button>
        <Button variant="outlined" href={`/${tenantSlug}/campaigns/${campaignId}`} size="small">
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
