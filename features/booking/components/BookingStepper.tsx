"use client";

/**
 * Booking Stepper — Milestone 17.0.
 *
 * Horizontal progress indicator for the booking flow.
 * Future steps (datetime, details, confirm) are visible but disabled.
 */

import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Box from "@mui/material/Box";
import { BOOKING_STEPS, type BookingStepKey } from "../types";

const ENABLED_STEPS: BookingStepKey[] = ["services", "staff", "location", "datetime", "details", "confirm"];

type Props = {
  activeStep: BookingStepKey;
};

export default function BookingStepper({ activeStep }: Props) {
  const activeIndex = BOOKING_STEPS.findIndex((s) => s.key === activeStep);

  return (
    <Box sx={{ mb: 3, overflowX: "auto" }}>
      <Stepper
        activeStep={activeIndex}
        alternativeLabel
        sx={{
          minWidth: 500,
          "& .MuiStepLabel-label": { fontSize: "0.75rem" },
        }}
      >
        {BOOKING_STEPS.map((step) => {
          const isEnabled = ENABLED_STEPS.includes(step.key);
          return (
            <Step key={step.key} disabled={!isEnabled}>
              <StepLabel
                sx={{
                  "& .MuiStepLabel-label": {
                    color: !isEnabled ? "text.disabled" : undefined,
                  },
                }}
              >
                {step.label}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}
