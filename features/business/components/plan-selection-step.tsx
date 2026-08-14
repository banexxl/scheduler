"use client";

/**
 * Plan Selection Step — shown before business creation.
 *
 * Displays available subscription plans for the tenant to choose from.
 * - Free plans → proceed to business creation immediately
 * - Plans with trial → proceed to business creation (trial starts on creation)
 * - Paid plans without trial → redirect to Polar checkout first
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { useState } from "react";

export type PlanOption = {
  id: string;
  name: string;
  description: string | null;
  code: string;
  priceAmount: number; // minor units
  currency: string;
  billingInterval: string | null;
  isFree: boolean;
  trialDays: number;
  polarProductId: string | null;
};

type Props = {
  plans: PlanOption[];
  onSelectFree: (planId: string) => void;
  onSelectPaid: (planId: string, polarProductId: string) => void;
};

export default function PlanSelectionStep({ plans, onSelectFree, onSelectPaid }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = (plan: PlanOption) => {
    setLoading(plan.id);

    if (plan.isFree || plan.trialDays > 0) {
      // Free or trial — go straight to business creation
      onSelectFree(plan.id);
    } else {
      // Paid with no trial — needs payment first
      if (!plan.polarProductId) {
        // No Polar product linked — can't checkout, treat as trial
        onSelectFree(plan.id);
        return;
      }
      onSelectPaid(plan.id, plan.polarProductId);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, textAlign: "center", mb: 1 }}>
        Choose your plan
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
        Select a plan to get started. You can upgrade or change anytime.
      </Typography>

      <Stack spacing={2}>
        {plans.map((plan) => {
          const canTrial = plan.isFree || plan.trialDays > 0;
          const needsPayment = !plan.isFree && plan.trialDays === 0;

          return (
            <Paper
              key={plan.id}
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2,
                cursor: "pointer",
                transition: "border-color 0.2s, box-shadow 0.2s",
                "&:hover": { borderColor: "primary.main", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
                opacity: loading && loading !== plan.id ? 0.5 : 1,
              }}
              onClick={() => !loading && handleSelect(plan)}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {plan.name}
                    </Typography>
                    {plan.isFree && <Chip label="Free" size="small" color="success" />}
                    {!plan.isFree && plan.trialDays > 0 && (
                      <Chip label={`${plan.trialDays}-day free trial`} size="small" color="info" variant="outlined" />
                    )}
                    {needsPayment && (
                      <Chip label="Payment required" size="small" color="warning" variant="outlined" />
                    )}
                  </Stack>
                  {plan.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {plan.description}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  {plan.isFree ? (
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Free</Typography>
                  ) : (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatPrice(plan.priceAmount, plan.currency)}
                      </Typography>
                      {plan.billingInterval && (
                        <Typography variant="caption" color="text.secondary">
                          / {plan.billingInterval}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Button
                variant={plan.isFree ? "contained" : "outlined"}
                fullWidth
                disabled={Boolean(loading)}
                onClick={(e) => { e.stopPropagation(); handleSelect(plan); }}
              >
                {loading === plan.id ? (
                  <CircularProgress size={20} />
                ) : plan.isFree ? (
                  "Start Free"
                ) : plan.trialDays > 0 ? (
                  `Start ${plan.trialDays}-day free trial`
                ) : (
                  "Subscribe now"
                )}
              </Button>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

function formatPrice(minorUnits: number, currency: string): string {
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major} ${currency.toUpperCase()}`;
  }
}
