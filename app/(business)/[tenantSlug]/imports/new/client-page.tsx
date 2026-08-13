"use client";

/**
 * Import Wizard Client — Milestone 15.10.
 *
 * Steps: Type → Upload → Map → Validate → Confirm → Processing
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import { createImportJobAction, validateImportAction, startImportProcessingAction } from "@/features/imports/actions/import-actions";
import type { ImportType } from "@/features/imports/types/import";

type Props = { tenantSlug: string };

export default function ImportWizardClient({ tenantSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"type" | "upload" | "processing">("type");
  const [importType, setImportType] = useState<ImportType>("customers");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      startTransition(async () => {
        const result = await createImportJobAction(tenantSlug, importType, content, file.name, file.size);
        if (result.success && result.jobId) {
          setJobId(result.jobId);
          setMapping(result.mapping ?? {});
          // Auto-validate with auto-mapped fields
          const valResult = await validateImportAction(tenantSlug, result.jobId, result.mapping ?? {});
          if (valResult.success) {
            setStep("processing");
          } else {
            setError(valResult.message);
          }
        } else if (!result.success) {
          setError(result.message);
        }
      });
    };
    reader.readAsText(file);
  };

  const handleStartImport = () => {
    if (!jobId) return;
    startTransition(async () => {
      const result = await startImportProcessingAction(tenantSlug, jobId);
      if (result.success) {
        router.push(`/${tenantSlug}/imports/${jobId}`);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      {step === "type" && (
        <Stack spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>Import Type</InputLabel>
            <Select value={importType} label="Import Type" onChange={(e) => setImportType(e.target.value as ImportType)}>
              <MenuItem value="customers">Customers</MenuItem>
              <MenuItem value="services">Services</MenuItem>
              <MenuItem value="staff_resources">Staff / Resources</MenuItem>
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: "0.8125rem", color: "#6b7280" }}>
            Download template:{" "}
            <a href={`/api/internal/imports/template?type=${importType}`} style={{ color: "#2563eb" }}>
              {importType}-template.csv
            </a>
          </Typography>
          <Button variant="contained" size="small" onClick={() => setStep("upload")} sx={{ alignSelf: "flex-start" }}>
            Next: Upload CSV
          </Button>
        </Stack>
      )}

      {step === "upload" && (
        <Stack spacing={2}>
          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>Upload {importType.replace(/_/g, " ")} CSV</Typography>
          <input type="file" accept=".csv,.txt" onChange={handleUpload} disabled={pending} />
          <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            Max 10 MB, 10,000 rows. UTF-8 encoding.
          </Typography>
          <Button variant="outlined" size="small" onClick={() => setStep("type")} sx={{ alignSelf: "flex-start" }}>Back</Button>
        </Stack>
      )}

      {step === "processing" && (
        <Stack spacing={2}>
          <Alert severity="success">File validated successfully. Ready to import.</Alert>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Mapped fields: {Object.entries(mapping).map(([k, v]) => `${k} → ${v}`).join(", ") || "auto-mapped"}
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" size="small" onClick={handleStartImport} disabled={pending}>
              Start Import
            </Button>
            <Button variant="outlined" size="small" href={`/${tenantSlug}/imports`}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
