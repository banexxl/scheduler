"use client";

/**
 * Template Card — Milestone 16.2.
 *
 * Displays a single template option in the settings page.
 * Shows thumbnail, name, description, and action buttons.
 */

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { TemplateInfo } from "@/features/templates/types";

type Props = {
  template: TemplateInfo;
  isActive: boolean;
  onPreview: (templateId: string) => void;
  onActivate: (templateId: string) => void;
  activating: boolean;
};

export default function TemplateCard({
  template,
  isActive,
  onPreview,
  onActivate,
  activating,
}: Props) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        borderColor: isActive ? "primary.main" : "divider",
        borderWidth: isActive ? 2 : 1,
        transition: "border-color 0.2s",
        "&:hover": {
          borderColor: isActive ? "primary.main" : "primary.light",
        },
      }}
    >
      {/* Active badge */}
      {isActive && (
        <Chip
          icon={<CheckCircleIcon />}
          label="Active"
          color="primary"
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 1,
          }}
        />
      )}

      {/* Preview thumbnail */}
      <Box
        sx={{
          height: 180,
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          component="img"
          src={template.previewImage}
          alt={`${template.name} template preview`}
          sx={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </Box>

      <CardContent>
        <Typography variant="h6" gutterBottom>
          {template.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {template.description}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onPreview(template.id)}
        >
          Preview
        </Button>
        {!isActive && (
          <Button
            size="small"
            variant="contained"
            onClick={() => onActivate(template.id)}
            disabled={activating}
          >
            {activating ? "Activating..." : "Activate"}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
