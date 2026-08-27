"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Link from "@mui/material/Link";
import { updateOnboardingStepAction, completeOnboardingAction } from "@/features/onboarding/services/onboarding-state";
import { updateBusinessSettingsAction } from "@/features/business/actions/update-business-settings";
import { createLocationAction } from "@/features/locations/actions/create-location";
import { createServiceWithAssignmentsAction } from "@/features/services/actions/create-service-with-assignments";
import { saveTenantBookingRulesAction } from "@/features/booking-rules/actions/save-tenant-booking-rules";
import { updatePublicBookingSettingsAction } from "@/features/public-booking/actions/update-public-booking-settings-action";
import type { OnboardingPageData, OnboardingStepKey } from "@/features/onboarding/types/onboarding";

const steps: Array<{ key: OnboardingStepKey; title: string }> = [
     { key: "business_details", title: "Business details" },
     { key: "location", title: "Location" },
     { key: "resource", title: "Resource" },
     { key: "service", title: "Service" },
     { key: "working_hours", title: "Working hours" },
     { key: "booking_rules", title: "Booking preferences" },
     { key: "public_booking", title: "Public booking" },
     { key: "complete", title: "Ready" },
];

type Props = {
     data: OnboardingPageData;
     tenantSlug: string;
};

/** Returns the next step key after the given one. */
function nextStepAfter(key: OnboardingStepKey): OnboardingStepKey {
     const idx = steps.findIndex((s) => s.key === key);
     return steps[idx + 1]?.key ?? "complete";
}

export default function OnboardingClientPage({ data, tenantSlug }: Props) {
     const router = useRouter();
     const [currentStep, setCurrentStep] = useState(data.progress.currentStep);
     const [message, setMessage] = useState<string | null>(null);
     const [loading, setLoading] = useState(false);

     const stepIndex = useMemo(() => steps.findIndex((step) => step.key === currentStep), [currentStep]);
     const activeStep = steps[Math.max(0, Math.min(stepIndex, steps.length - 1))] ?? steps[0];
     const currentStepKey = activeStep!.key;

     // Determine which steps already have their data
     const stepDone: Record<string, boolean> = {
          business_details: data.progress.completedSteps.includes("business_details"),
          location: data.summary.locationCount > 0,
          resource: data.summary.resourceCount > 0,
          service: data.summary.serviceCount > 0,
          working_hours: data.summary.hasLocationHours || data.summary.hasResourceHours,
          booking_rules: data.summary.hasBookingRules,
          public_booking: data.summary.hasPublicBookingSettings,
     };

     /** Advance to the next step, persisting progress. */
     const goNext = async () => {
          const next = nextStepAfter(currentStepKey);
          await updateOnboardingStepAction(tenantSlug, next);
          setCurrentStep(next);
          setMessage(null);
     };

     const wrap = async (fn: () => Promise<void>) => {
          setLoading(true);
          setMessage(null);
          try { await fn(); } finally { setLoading(false); }
     };

     // ── Step handlers (only called when data does NOT exist) ──────────

     const handleBusinessSubmit = () => wrap(async () => {
          const result = await updateBusinessSettingsAction(tenantSlug, {
               name: data.tenant.name,
               defaultTimezone: data.tenant.timezone,
               defaultCurrency: "USD",
               defaultLanguage: "en",
          });
          if (result.success) {
               setMessage("Business details saved.");
               await goNext();
          } else {
               setMessage(result.message ?? "Unable to save business details.");
          }
     });

     const handleLocationSubmit = () => wrap(async () => {
          const result = await createLocationAction(tenantSlug, {
               name: "Primary location",
               slug: `${tenantSlug}-location`,
               locationType: "physical",
               timezone: data.tenant.timezone,
               isActive: true,
          }, { shouldRedirect: false });
          if (result.success) {
               setMessage("Location created.");
               await goNext();
          } else {
               setMessage(result.message ?? "Unable to create location.");
          }
     });

     const handleResourceSkip = () => wrap(async () => {
          setMessage("Resource step skipped — create resources from the Resources page.");
          await goNext();
     });

     const handleServiceSubmit = () => wrap(async () => {
          const result = await createServiceWithAssignmentsAction(tenantSlug, {
               name: "First service",
               slug: `${tenantSlug}-service`,
               durationMinutes: 60,
               price: 0,
               currency: "USD",
               isActive: true,
          }, [], [], { shouldRedirect: false });
          if (result.success) {
               setMessage("Service created.");
               await goNext();
          } else {
               setMessage(result.message ?? "Unable to create service.");
          }
     });

     const handleBookingSubmit = () => wrap(async () => {
          const result = await saveTenantBookingRulesAction(tenantSlug, {
               minimumNoticeMinutes: 60,
               maximumAdvanceDays: 30,
               slotIntervalMinutes: 30,
               cancellationNoticeMinutes: 60,
               rescheduleNoticeMinutes: 60,
               allowSameDayBooking: true,
               allowCustomerCancellation: true,
               allowCustomerRescheduling: true,
               requireCustomerPhone: false,
               requireCustomerEmail: true,
          });
          if (result.success) {
               setMessage("Booking preferences saved.");
               await goNext();
          } else {
               setMessage(result.message ?? "Unable to save booking preferences.");
          }
     });

     const handlePublicBookingSubmit = () => wrap(async () => {
          const result = await updatePublicBookingSettingsAction(tenantSlug, {
               isEnabled: false,
               allowResourceSelection: false,
               allowNoPreference: false,
               showServicePrices: false,
               showServiceDuration: true,
               showResourceNames: false,
               bookingPageTitle: `${data.tenant.name} booking`,
               bookingPageDescription: "Book appointments online.",
               confirmationMessage: "Thanks for booking.",
          });
          if (result.success) {
               setMessage("Public booking settings saved.");
               await goNext();
          } else {
               setMessage(result.error ?? "Unable to save public booking settings.");
          }
     });

     const handleFinish = () => wrap(async () => {
          const result = await completeOnboardingAction(tenantSlug);
          if (result.success) {
               router.push(`/${tenantSlug}/dashboard`);
          } else {
               setMessage(result.message ?? "Unable to complete onboarding.");
          }
     });

     // ── Render helpers ───────────────────────────────────────────────

     /** "Already done" banner + Next button shown when a step's data exists. */
     const doneBlock = (label: string) => (
          <Box sx={{ display: "grid", gap: 1 }}>
               <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main">{label}</Typography>
               </Stack>
               <Button variant="contained" onClick={() => wrap(goNext)} disabled={loading}>Next</Button>
          </Box>
     );

     // ── Step descriptions ────────────────────────────────────────────

     const descriptions: Record<string, string> = {
          business_details: "Set your basic business identity so scheduling can start with the right timezone and currency.",
          location: "Create your first active location to anchor appointments and working hours.",
          resource: "Add a team member or resource so services can be assigned.",
          service: "Create a first service so clients can book something right away.",
          working_hours: "Add a simple weekly schedule so availability can be generated.",
          booking_rules: "Set a few booking defaults to keep schedules predictable.",
          public_booking: "Optionally enable public booking for online self-service.",
          complete: "You are ready to start booking.",
     };

     return (
          <Box sx={{ display: "grid", gap: 2 }}>
               <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                         <Box>
                              <Typography variant="h5" component="h1">Set up your business</Typography>
                              <Typography variant="body2" color="text.secondary">
                                   Step {stepIndex + 1} of {steps.length}: {activeStep!.title}
                              </Typography>
                         </Box>
                         <Chip
                              label={data.progress.status === "completed" ? "Completed" : "In progress"}
                              color={data.progress.status === "completed" ? "success" : "default"}
                         />
                    </Stack>
                    <LinearProgress variant="determinate" value={data.progress.percentComplete} sx={{ mb: 2 }} />

                    {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

                    <Typography variant="body1" sx={{ mb: 2 }}>
                         {descriptions[currentStepKey] ?? ""}
                    </Typography>

                    {/* ── Business details ─────────────────────────────── */}
                    {currentStepKey === "business_details" && (
                         stepDone.business_details ? doneBlock("Business details already configured.") : (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                   <Typography variant="body2" color="text.secondary">Business name: {data.tenant.name}</Typography>
                                   <Typography variant="body2" color="text.secondary">Timezone: {data.tenant.timezone}</Typography>
                                   <Button variant="contained" onClick={handleBusinessSubmit} disabled={loading}>
                                        Save and continue
                                   </Button>
                              </Box>
                         )
                    )}

                    {/* ── Location ─────────────────────────────────────── */}
                    {currentStepKey === "location" && (
                         stepDone.location ? doneBlock(`${data.summary.locationCount} location(s) already exist.`) : (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                   <Typography variant="body2" color="text.secondary">
                                        The first location will become the primary location for this business.
                                   </Typography>
                                   <Button variant="contained" onClick={handleLocationSubmit} disabled={loading}>
                                        Create location
                                   </Button>
                              </Box>
                         )
                    )}

                    {/* ── Resource ─────────────────────────────────────── */}
                    {currentStepKey === "resource" && (
                         stepDone.resource ? doneBlock(`${data.summary.resourceCount} resource(s) already exist.`) : (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                   <Typography variant="body2" color="text.secondary">
                                        Add a team member or resource from the Resources page.
                                   </Typography>
                                   <Stack direction="row" spacing={1}>
                                        <Button variant="contained" href={`/${tenantSlug}/resources`} disabled={loading}>
                                             Go to Resources
                                        </Button>
                                        <Button variant="outlined" onClick={handleResourceSkip} disabled={loading}>
                                             Skip for now
                                        </Button>
                                   </Stack>
                              </Box>
                         )
                    )}

                    {/* ── Service ──────────────────────────────────────── */}
                    {currentStepKey === "service" && (
                         stepDone.service ? doneBlock(`${data.summary.serviceCount} service(s) already exist.`) : (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                   <Typography variant="body2" color="text.secondary">
                                        Create your first service so clients can book appointments.
                                   </Typography>
                                   <Stack direction="row" spacing={1}>
                                        <Button variant="contained" href={`/${tenantSlug}/services`} disabled={loading}>
                                             Go to Services
                                        </Button>
                                        <Button variant="outlined" onClick={handleServiceSubmit} disabled={loading}>
                                             Quick-create a placeholder
                                        </Button>
                                   </Stack>
                              </Box>
                         )
                    )}

                    {/* ── Working hours ────────────────────────────────── */}
                    {currentStepKey === "working_hours" && (
                         stepDone.working_hours ? doneBlock("Working hours already configured.") : (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                   <Typography variant="body2" color="text.secondary">
                                        Set up working hours for your locations or resources.
                                   </Typography>
                                   <Stack direction="row" spacing={1}>
                                        <Button variant="contained" href={`/${tenantSlug}/locations`} disabled={loading}>
                                             Go to Locations
                                        </Button>
                                        <Button variant="outlined" onClick={() => wrap(goNext)} disabled={loading}>
                                             Skip for now
                                        </Button>
                                   </Stack>
                              </Box>
                         )
                    )}

                    {/* ── Booking rules ────────────────────────────────── */}
                    {currentStepKey === "booking_rules" && (
                         stepDone.booking_rules ? doneBlock("Booking preferences already configured.") : (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                   <Typography variant="body2" color="text.secondary">
                                        These defaults help keep new appointments within a sensible window.
                                   </Typography>
                                   <Button variant="contained" onClick={handleBookingSubmit} disabled={loading}>
                                        Save booking defaults
                                   </Button>
                              </Box>
                         )
                    )}

                    {/* ── Public booking ───────────────────────────────── */}
                    {currentStepKey === "public_booking" && (
                         stepDone.public_booking ? doneBlock("Public booking already configured.") : (
                              <Box sx={{ display: "grid", gap: 1 }}>
                                   <Typography variant="body2" color="text.secondary">
                                        Public booking can be enabled later if your plan allows it.
                                   </Typography>
                                   <Button variant="contained" onClick={handlePublicBookingSubmit} disabled={loading}>
                                        Continue
                                   </Button>
                              </Box>
                         )
                    )}

                    {/* ── Complete ─────────────────────────────────────── */}
                    {currentStepKey === "complete" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                   You can review the setup again from the dashboard or open the calendar.
                              </Typography>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                   <Button variant="contained" onClick={handleFinish} disabled={loading}>
                                        Go to dashboard
                                   </Button>
                                   <Link href={`/${tenantSlug}/dashboard`} variant="body2">Open dashboard</Link>
                              </Stack>
                         </Box>
                    )}
               </Paper>

               {/* ── Progress chips ───────────────────────────────────── */}
               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Progress</Typography>
                    <Typography variant="body2" color="text.secondary">{data.progress.percentComplete}% complete</Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                         {steps.map((step) => {
                              const done = stepDone[step.key] || data.progress.completedSteps.includes(step.key);
                              return (
                                   <Chip
                                        key={step.key}
                                        label={step.title}
                                        variant={currentStep === step.key ? "filled" : "outlined"}
                                        color={done ? "success" : "default"}
                                        size="small"
                                        onClick={() => {
                                             setCurrentStep(step.key);
                                             setMessage(null);
                                        }}
                                        sx={{ cursor: "pointer" }}
                                   />
                              );
                         })}
                    </Box>
               </Paper>
          </Box>
     );
}
