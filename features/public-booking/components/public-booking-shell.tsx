"use client";

/**
 * Public Booking Shell — Milestone 8.5.
 *
 * Provides branded wrapper for the entire public booking flow:
 * - Tenant branding (logo, name, description)
 * - Progress stepper (desktop: labels, mobile: step X of Y)
 * - Consistent spacing and max-width
 * - Error boundary surface
 * - Responsive layout (mobile-first)
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Fade from "@mui/material/Fade";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import type { PublicBookingTenant, PublicBookingSettings } from "../types/public-booking";

const DEFAULT_STEP_LABELS = ["Service", "Date", "Location", "Time", "Details", "Review"];

type Props = {
  tenant: PublicBookingTenant;
  settings: PublicBookingSettings;
  currentStep: number;
  totalSteps: number;
  /** Labels for the active (dynamic) step sequence. */
  stepLabels?: string[];
  isConfirmed: boolean;
  children: React.ReactNode;
};

export default function PublicBookingShell({
  tenant,
  settings,
  currentStep,
  totalSteps,
  stepLabels,
  isConfirmed,
  children,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const primaryColor = theme.palette.primary.main;
  const labels = stepLabels && stepLabels.length > 0 ? stepLabels : DEFAULT_STEP_LABELS;

  // Dark "purpleish" surface, consistent with the rest of the public page.
  // The step components use MUI theme colors (text.primary etc.), so we scope
  // an override that maps those tokens to light-on-dark values inside the card.
  const darkContentSx = {
    color: "#e9e6f5",
    "& .MuiTypography-root": { color: "inherit" },
    "& .MuiIconButton-root": { color: "#e9e6f5" },
    "& .MuiIconButton-root.Mui-disabled": { color: "rgba(240,240,245,0.25)" },
    "& .MuiInputBase-input": { color: "#f0f0f5" },
    "& .MuiInputBase-input::placeholder": { color: "rgba(240,240,245,0.5)", opacity: 1 },
    "& .MuiInputLabel-root": { color: "rgba(233,230,245,0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#a78bfa" },
    "& .MuiFormHelperText-root": { color: "rgba(233,230,245,0.55)" },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(167,139,250,0.5)" },
    // Cards / list items in the step content
    "& .MuiPaper-root": {
      backgroundColor: "rgba(255,255,255,0.03)",
      borderColor: "rgba(255,255,255,0.08)",
      color: "#e9e6f5",
    },
    // Outlined "Back" buttons and text buttons
    "& .MuiButton-text": { color: "#a78bfa" },
    // Alerts (info notices) — keep readable on dark
    "& .MuiAlert-root": {
      backgroundColor: "rgba(167,139,250,0.08)",
      color: "#e9e6f5",
      border: "1px solid rgba(167,139,250,0.25)",
    },
    "& .MuiAlert-icon": { color: "#a78bfa" },
  } as const;

  return (
    // Dark purple glass surface for the whole "Book an Appointment" section.
    <Box
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "rgba(22, 22, 30, 0.55)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        pb: 4,
      }}
    >
      {/* Business Hero — dark purple gradient header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${primaryColor}55 0%, rgba(124,58,237,0.28) 45%, rgba(22,22,30,0.2) 100%)`,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          color: "#f0f0f5",
          pt: { xs: 3, sm: 4 },
          pb: { xs: 3, sm: 4 },
          px: 2,
          textAlign: "center",
        }}
      >
        {tenant.logoUrl && (
          <Box
            sx={{
              position: "relative",
              display: "inline-flex",
              width: 76,
              height: 76,
              mb: 1.5,
              mx: "auto",
              borderRadius: "20px",
              // Outer border (primary) + inner white ring separation
              border: `3px solid ${primaryColor}`,
              boxShadow: `0 0 0 2px rgba(255,255,255,0.85) inset, 0 0 18px ${primaryColor}80, 0 6px 16px rgba(0,0,0,0.25)`,
              overflow: "hidden",
              bgcolor: "rgba(255,255,255,0.9)",
            }}
          >
            <Box
              component="img"
              src={tenant.logoUrl}
              alt={`${tenant.name} logo`}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "16px",
                display: "block",
              }}
            />
            {/* Primary color tint layered over the logo so it always
                picks up some of the brand color regardless of its own hue */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "16px",
                backgroundColor: primaryColor,
                opacity: 0.28,
                mixBlendMode: "color",
                pointerEvents: "none",
              }}
            />
          </Box>
        )}
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: "#f0f0f5" }}>
          {settings.bookingPageTitle ?? `Book with ${tenant.name}`}
        </Typography>
        {settings.bookingPageDescription && (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, maxWidth: 480, mx: "auto", color: "rgba(240,240,245,0.75)" }}
          >
            {settings.bookingPageDescription}
          </Typography>
        )}
      </Box>

      {/* Content Card */}
      <Box sx={{ maxWidth: 560, mx: "auto", mt: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Stepper */}
          {!isConfirmed && (
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                pt: { xs: 2, sm: 3 },
                pb: 1,
                // Light-on-dark stepper styling
                "& .MuiStepLabel-label": { color: "rgba(240,240,245,0.55)" },
                "& .MuiStepLabel-label.Mui-active": { color: "#f0f0f5", fontWeight: 600 },
                "& .MuiStepLabel-label.Mui-completed": { color: "rgba(240,240,245,0.8)" },
                "& .MuiStepIcon-root": { color: "rgba(255,255,255,0.15)" },
                "& .MuiStepIcon-root.Mui-active": { color: primaryColor },
                "& .MuiStepIcon-root.Mui-completed": { color: "#a78bfa" },
              }}
            >
              {isMobile ? (
                <Typography variant="body2" textAlign="center" sx={{ color: "rgba(240,240,245,0.7)" }}>
                  Step {currentStep + 1} of {totalSteps} — {labels[currentStep] ?? ""}
                </Typography>
              ) : (
                <Stepper activeStep={currentStep} alternativeLabel>
                  {labels.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}
            </Box>
          )}

          {/* Step Content */}
          <Fade in timeout={350} appear>
            <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 }, ...darkContentSx }}>
              {children}
            </Box>
          </Fade>
        </Paper>

        {/* Footer */}
        <Typography
          variant="caption"
          sx={{ display: "block", textAlign: "center", mt: 2, color: "rgba(240,240,245,0.55)" }}
        >
          Powered by {tenant.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: "block", textAlign: "center", mt: 0.5 }}
        >
          <Box
            component="a"
            href={`/book/${tenant.slug}/portal`}
            sx={{ color: "rgba(240,240,245,0.6)", textDecoration: "underline", "&:hover": { color: "#a78bfa" } }}
          >
            Already booked? View your appointments
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
