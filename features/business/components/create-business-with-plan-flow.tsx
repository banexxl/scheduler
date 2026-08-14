"use client";

/**
 * Create Business with Plan Flow — Two-step onboarding.
 *
 * Step 1: Select plan
 * Step 2: Create business (plan ID passed to form)
 *
 * For paid plans without trial:
 * - Redirects to Polar checkout
 * - On return, plan is confirmed and business creation proceeds
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import toast from "react-hot-toast";
import PlanSelectionStep from "./plan-selection-step";
import CreateBusinessForm from "./create-business-form";
import type { PlanOption } from "./plan-selection-step";

type Props = {
  plans: PlanOption[];
};

export default function CreateBusinessWithPlanFlow({ plans }: Props) {
  const [step, setStep] = useState<"plan" | "business">(plans.length > 0 ? "plan" : "business");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleSelectFree = (planId: string) => {
    setSelectedPlanId(planId);
    setStep("business");
  };

  const handleSelectPaid = (planId: string, polarProductId: string) => {
    // For paid plans without trial, initiate checkout
    // Store plan selection and redirect to checkout
    setError(null);
    startTransition(async () => {
      try {
        const { initiatePlanCheckoutAction } = await import("../actions/initiate-plan-checkout");
        const result = await initiatePlanCheckoutAction(polarProductId);
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          const msg = !result.success ? result.message : "Unable to start checkout. Please try again.";
          setError(msg);
          toast.error(msg);
        }
      } catch {
        setError("Unable to start checkout. Please try again.");
        toast.error("Checkout failed");
      }
    });
  };

  // If returning from checkout with plan param, auto-select it
  if (typeof window !== "undefined" && step === "plan") {
    const params = new URLSearchParams(window.location.search);
    const returnedPlanId = params.get("plan");
    if (returnedPlanId && plans.find(p => p.id === returnedPlanId)) {
      setSelectedPlanId(returnedPlanId);
      setStep("business");
    }
  }

  const totalSteps = plans.length > 0 ? 2 : 1;
  const currentStep = step === "plan" ? 1 : totalSteps;

  return (
    <Box>
      {/* Progress */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <Chip label={`Step ${currentStep} of ${totalSteps}`} size="small" variant="outlined" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === "plan" && (
        <PlanSelectionStep
          plans={plans}
          onSelectFree={handleSelectFree}
          onSelectPaid={handleSelectPaid}
        />
      )}

      {step === "business" && (
        <>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ textAlign: "center", fontWeight: 600 }}
          >
            Create your business
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: "center", mb: 4 }}
          >
            Set up the basics now. You can add services, team members, locations
            and branding later.
          </Typography>

          <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
            <CreateBusinessForm selectedPlanId={selectedPlanId} />
          </Paper>

          {plans.length > 0 && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button variant="text" size="small" onClick={() => setStep("plan")}>
                Change plan
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
