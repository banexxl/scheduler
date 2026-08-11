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
import Link from "@mui/material/Link";
import { updateOnboardingStepAction, completeOnboardingAction } from "@/features/onboarding/services/onboarding-state";
import { updateBusinessSettingsAction } from "@/features/business/actions/update-business-settings";
import { createLocationAction } from "@/features/locations/actions/create-location";
import { createResourceAction } from "@/features/resources/actions/create-resource";
import { createServiceWithAssignmentsAction } from "@/features/services/actions/create-service-with-assignments";
import { saveTenantBookingRulesAction } from "@/features/booking-rules/actions/save-tenant-booking-rules";
import { updatePublicBookingSettingsAction } from "@/features/public-booking/actions/update-public-booking-settings-action";
import type { OnboardingPageData } from "@/features/onboarding/types/onboarding";

const steps: Array<{ key: "business_details" | "location" | "resource" | "service" | "working_hours" | "booking_rules" | "public_booking" | "complete"; title: string }> = [
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

export default function OnboardingClientPage({ data, tenantSlug }: Props) {
     const router = useRouter();
     const [currentStep, setCurrentStep] = useState(data.progress.currentStep);
     const [message, setMessage] = useState<string | null>(null);

     const stepIndex = useMemo(() => steps.findIndex((step) => step.key === currentStep), [currentStep]);
     const activeStep = steps[Math.max(0, Math.min(stepIndex, steps.length - 1))] ?? steps[0];
     const currentStepKey = activeStep!.key;

     const handleFinish = async () => {
          const result = await completeOnboardingAction(tenantSlug);
          if (result.success) {
               router.push(`/${tenantSlug}/dashboard`);
          } else {
               setMessage(result.message ?? "Unable to complete onboarding.");
          }
     };

     const handleBusinessSubmit = async () => {
          const result = await updateBusinessSettingsAction(tenantSlug, {
               name: data.tenant.name,
               defaultTimezone: data.tenant.timezone,
               defaultCurrency: "USD",
               defaultLanguage: "en",
          });
          if (result.success) {
               setMessage("Business details saved.");
               await updateOnboardingStepAction(tenantSlug, "location");
               setCurrentStep("location");
          } else {
               setMessage(result.message ?? "Unable to save business details.");
          }
     };

     const handleLocationSubmit = async () => {
          // Location may already exist from create_tenant RPC
          if (data.summary.locationCount > 0) {
               setMessage("Location already exists.");
               await updateOnboardingStepAction(tenantSlug, "resource");
               setCurrentStep("resource");
               return;
          }
          const result = await createLocationAction(tenantSlug, {
               name: "Primary location",
               slug: `${tenantSlug}-location`,
               locationType: "physical",
               timezone: data.tenant.timezone,
               isActive: true,
          }, { shouldRedirect: false });
          if (result.success) {
               setMessage("Location saved.");
               await updateOnboardingStepAction(tenantSlug, "resource");
               setCurrentStep("resource");
          } else {
               setMessage(result.message ?? "Unable to save location.");
          }
     };

     const handleResourceSubmit = async () => {
          // Skip resource creation during lightweight onboarding
          // Resources require a valid resource type + location which aren't
          // available in this simplified wizard. User creates them from /resources.
          setMessage("Resource step skipped — create resources from the Resources page.");
          await updateOnboardingStepAction(tenantSlug, "service");
          setCurrentStep("service");
     };

     const handleServiceSubmit = async () => {
          const result = await createServiceWithAssignmentsAction(tenantSlug, {
               name: "First service",
               slug: `${tenantSlug}-service`,
               durationMinutes: 60,
               price: 0,
               currency: "USD",
               isActive: true,
          }, [], [], { shouldRedirect: false });
          if (result.success) {
               setMessage("Service saved.");
               await updateOnboardingStepAction(tenantSlug, "working_hours");
               setCurrentStep("working_hours");
          } else {
               setMessage(result.message ?? "Unable to save service.");
          }
     };

     const handleBookingSubmit = async () => {
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
               await updateOnboardingStepAction(tenantSlug, "public_booking");
               setCurrentStep("public_booking");
          } else {
               setMessage(result.message ?? "Unable to save booking preferences.");
          }
     };

     const handlePublicBookingSubmit = async () => {
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
               await updateOnboardingStepAction(tenantSlug, "complete");
               setCurrentStep("complete");
          } else {
               setMessage(result.error ?? "Unable to save public booking settings.");
          }
     };

     return (
          <Box sx={{ display: "grid", gap: 2 }}>
               <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                         <Box>
                              <Typography variant="h5" component="h1">Set up your business</Typography>
                              <Typography variant="body2" color="text.secondary">Step {stepIndex + 1} of {steps.length}: {activeStep!.title}</Typography>
                         </Box>
                         <Chip label={data.progress.status === "completed" ? "Completed" : "In progress"} color={data.progress.status === "completed" ? "success" : "default"} />
                    </Stack>
                    <LinearProgress variant="determinate" value={data.progress.percentComplete} sx={{ mb: 2 }} />
                    {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
                    <Typography variant="body1" sx={{ mb: 2 }}>
                         {currentStepKey === "business_details" && "Set your basic business identity so scheduling can start with the right timezone and currency."}
                         {currentStepKey === "location" && "Create your first active location to anchor appointments and working hours."}
                         {currentStepKey === "resource" && "Create a first resource so services can be assigned to a team member or staff pool."}
                         {currentStepKey === "service" && "Create a first service so clients can book something right away."}
                         {currentStepKey === "working_hours" && "Add a simple weekly schedule so availability can be generated."}
                         {currentStepKey === "booking_rules" && "Set a few booking defaults to keep schedules predictable."}
                         {currentStepKey === "public_booking" && "Optionally enable public booking for online self-service."}
                         {currentStepKey === "complete" && "You are ready to start booking."}
                    </Typography>

                    {currentStepKey === "business_details" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">Business name: {data.tenant.name}</Typography>
                              <Typography variant="body2" color="text.secondary">Timezone: {data.tenant.timezone}</Typography>
                              <Button variant="contained" onClick={handleBusinessSubmit}>Save and continue</Button>
                         </Box>
                    )}

                    {currentStepKey === "location" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">The first location will become the primary location for this business.</Typography>
                              <Button variant="contained" onClick={handleLocationSubmit}>Create location</Button>
                         </Box>
                    )}

                    {currentStepKey === "resource" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">A first resource can be a staff member or a shared resource type.</Typography>
                              <Button variant="contained" onClick={handleResourceSubmit}>Create resource</Button>
                         </Box>
                    )}

                    {currentStepKey === "service" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">A simple service is enough to get started.</Typography>
                              <Button variant="contained" onClick={handleServiceSubmit}>Create service</Button>
                         </Box>
                    )}

                    {currentStepKey === "working_hours" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">Working hours can be refined later from the scheduling settings.</Typography>
                              <Button variant="contained" onClick={() => { void updateOnboardingStepAction(tenantSlug, "booking_rules"); setCurrentStep("booking_rules"); }}>Skip for now</Button>
                         </Box>
                    )}

                    {currentStepKey === "booking_rules" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">These defaults help keep new appointments within a sensible window.</Typography>
                              <Button variant="contained" onClick={handleBookingSubmit}>Save booking defaults</Button>
                         </Box>
                    )}

                    {currentStepKey === "public_booking" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">Public booking can be enabled later if your plan allows it.</Typography>
                              <Button variant="contained" onClick={handlePublicBookingSubmit}>Continue</Button>
                         </Box>
                    )}

                    {currentStepKey === "complete" && (
                         <Box sx={{ display: "grid", gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">You can review the setup again from the dashboard or open the calendar.</Typography>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                   <Button variant="contained" onClick={handleFinish}>Go to dashboard</Button>
                                   <Link href={`/${tenantSlug}/dashboard`} variant="body2">Open dashboard</Link>
                              </Stack>
                         </Box>
                    )}
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Progress</Typography>
                    <Typography variant="body2" color="text.secondary">{data.progress.percentComplete}% complete</Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                         {steps.map((step) => (
                              <Chip key={step.key} label={step.title} variant={currentStep === step.key ? "filled" : "outlined"} />
                         ))}
                    </Box>
               </Paper>
          </Box>
     );
}
