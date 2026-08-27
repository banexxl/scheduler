"use client";

/**
 * Template Preview Modal — Milestone 16.2.
 *
 * Full-screen dialog showing a live preview of a template
 * with the tenant&apos;s own branding. Supports desktop/mobile toggle.
 */

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import DeviceFrame, { type DeviceMode } from "./DeviceFrame";
import type { TemplateInfo } from "@/features/templates/types";

type Props = {
  open: boolean;
  template: TemplateInfo | null;
  isActive: boolean;
  onClose: () => void;
  onActivate: (templateId: string) => void;
  activating: boolean;
  /** Content rendered inside the device frame for preview. */
  previewContent?: React.ReactNode;
};

export default function TemplatePreview({
  open,
  template,
  isActive,
  onClose,
  onActivate,
  activating,
  previewContent,
}: Props) {
  const [device, setDevice] = useState<DeviceMode>("desktop");

  if (!template) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      aria-labelledby="template-preview-title"
    >
      <DialogTitle
        id="template-preview-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          py: 1.5,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" component="span">
            {template.name}
          </Typography>

          {/* Device toggle */}
          <ToggleButtonGroup
            value={device}
            exclusive
            onChange={(_, val) => val && setDevice(val as DeviceMode)}
            size="small"
            aria-label="Preview device"
          >
            <ToggleButton value="desktop" aria-label="Desktop preview">
              <DesktopWindowsIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="mobile" aria-label="Mobile preview">
              <SmartphoneIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <IconButton onClick={onClose} aria-label="Close preview">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          py: 3,
          bgcolor: "grey.100",
        }}
      >
        <DeviceFrame mode={device}>
          {previewContent ?? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="body1">
                Preview with your branding applied
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Your services, staff, and locations will appear here
                using the {template.name} layout.
              </Typography>
            </Box>
          )}
        </DeviceFrame>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Close</Button>
        {!isActive && (
          <Button
            variant="contained"
            onClick={() => onActivate(template.id)}
            disabled={activating}
          >
            {activating ? "Activating..." : "Activate"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
