"use client";

/**
 * Campaign Builder Client — Milestone 15.7.
 *
 * Multi-step form: Campaign → Audience → Message → Review.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import { createCampaignAction } from "@/features/campaigns/actions/campaign-actions";
import type { CampaignAudienceSource } from "@/features/campaigns/types/campaign";

type Props = {
  tenantSlug: string;
  savedSegments: Array<{ id: string; name: string }>;
  builtInSegments: Array<{ key: string; name: string }>;
};

const STEPS = ["Campaign", "Audience", "Message", "Review"];

export default function CampaignBuilderClient({ tenantSlug, savedSegments, builtInSegments }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [audienceSource, setAudienceSource] = useState<CampaignAudienceSource>("segment");
  const [segmentId, setSegmentId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const canAdvance = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return segmentId.length > 0;
      case 2: return subject.trim().length > 0 && content.trim().length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCampaignAction(tenantSlug, {
        name,
        channel: "email",
        subject,
        content,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        segmentId: audienceSource === "segment" ? segmentId : null,
        audienceSource,
      });
      if (result.success && result.campaignId) {
        toast.success("Campaign created!");
        router.push(`/${tenantSlug}/campaigns/${result.campaignId}`);
      } else if (!result.success) {
        setError(result.message);
        toast.error(result.message);
      }
    });
  };

  const selectedAudienceName = audienceSource === "built_in_segment"
    ? builtInSegments.find((s) => s.key === segmentId)?.name
    : savedSegments.find((s) => s.id === segmentId)?.name;

  return (
    <Stack spacing={3}>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 1 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Step 0: Campaign */}
      {step === 0 && (
        <Stack spacing={2}>
          <TextField label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} size="small" required fullWidth placeholder="e.g. Win Back Inactive Customers" />
          <Box sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1, fontSize: "0.8125rem", color: "#8b8b9e" }}>
            Channel: Email (only supported channel)
          </Box>
        </Stack>
      )}

      {/* Step 1: Audience */}
      {step === 1 && (
        <Stack spacing={2}>
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

          <Box sx={{ p: 2, bgcolor: "rgba(245, 158, 11, 0.08)", borderRadius: 1, fontSize: "0.8125rem", color: "#F59E0B" }}>
            Audience will be re-evaluated when the campaign is sent. Counts shown are previews only.
          </Box>
        </Stack>
      )}

      {/* Step 2: Message */}
      {step === 2 && (
        <Stack spacing={2}>
          <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} size="small" required fullWidth placeholder="e.g. We'd love to see you again" />
          <TextField label="Message" value={content} onChange={(e) => setContent(e.target.value)} size="small" required fullWidth multiline rows={6} placeholder="Write your campaign message..." />
          <TextField label="CTA Button Text (optional)" value={ctaText} onChange={(e) => setCtaText(e.target.value)} size="small" fullWidth placeholder="e.g. Book Now" />
          <TextField label="CTA Button URL (optional)" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} size="small" fullWidth placeholder="https://..." />
        </Stack>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Stack spacing={2}>
          <Box sx={{ p: 2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72", mb: 0.5 }}>Campaign</Typography>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{name}</Typography>
          </Box>
          <Box sx={{ p: 2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72", mb: 0.5 }}>Audience</Typography>
            <Typography sx={{ fontSize: "0.875rem" }}>{selectedAudienceName ?? "Not selected"}</Typography>
          </Box>
          <Box sx={{ p: 2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72", mb: 0.5 }}>Subject</Typography>
            <Typography sx={{ fontSize: "0.875rem" }}>{subject}</Typography>
          </Box>
          <Box sx={{ p: 2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72", mb: 0.5 }}>Message</Typography>
            <Typography sx={{ fontSize: "0.8125rem", whiteSpace: "pre-wrap" }}>{content}</Typography>
          </Box>
          {ctaText && (
            <Box sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
              <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", mb: 0.5 }}>CTA</Typography>
              <Typography sx={{ fontSize: "0.875rem" }}>{ctaText} → {ctaUrl}</Typography>
            </Box>
          )}
        </Stack>
      )}

      {/* Navigation */}
      <Stack direction="row" spacing={1.5} justifyContent="space-between">
        <Button variant="outlined" size="small" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <Stack direction="row" spacing={1}>
          {step < 3 && (
            <Button variant="contained" size="small" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          )}
          {step === 3 && (
            <Button variant="contained" size="small" disabled={pending} onClick={handleSave}>
              Save as Draft
            </Button>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
