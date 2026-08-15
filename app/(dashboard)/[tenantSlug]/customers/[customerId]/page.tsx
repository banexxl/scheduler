import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { updateCustomerProfileAction } from "@/features/customers/actions/update-customer-profile";
import { getCustomerById, getCustomerStatusLabel } from "@/features/customers/services/customer-queries";

async function submitCustomerProfile(
     tenantSlug: string,
     customerId: string,
     formData: FormData
) {
     "use server";

     const result = await updateCustomerProfileAction(tenantSlug, customerId, {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? "") || null,
          phoneNumber: String(formData.get("phoneNumber") ?? "") || null,
          preferredLocationId: String(formData.get("preferredLocationId") ?? "") || null,
          marketingOptIn: formData.get("marketingOptIn") === "on",
          internalNotes: String(formData.get("internalNotes") ?? "") || null,
          isBlocked: formData.get("isBlocked") === "on",
          blockedReason: String(formData.get("blockedReason") ?? "") || null,
          loyaltyPoints: Number(formData.get("loyaltyPoints") ?? 0),
          tags: String(formData.get("tags") ?? "")
               .split(",")
               .map((tag) => tag.trim())
               .filter(Boolean),
     });

     if (result.success) {
          redirect(`/${tenantSlug}/customers/${customerId}`);
     }
}

export default async function CustomerDetailPage({
     params,
}: {
     params: Promise<{ tenantSlug: string; customerId: string }>;
}) {
     const { tenantSlug, customerId } = await params;
     const { tenant } = await requireTenantMember(tenantSlug);
     const customer = await getCustomerById(tenant.id, customerId);

     if (!customer) {
          redirect(`/${tenantSlug}/customers`);
     }

     return (
          <Box>
               <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
                    <Box>
                         <Link href={`/${tenantSlug}/customers`} underline="hover" sx={{ display: "inline-flex", mb: 1 }}>
                              ← Back to customers
                         </Link>
                         <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                              {customer.name}
                         </Typography>
                         <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Tenant-scoped customer profile with appointment history and internal notes.
                         </Typography>
                    </Box>
                    <Chip label={getCustomerStatusLabel({ isBlocked: customer.isBlocked, hasUpcomingAppointments: customer.hasUpcomingAppointments })} color={customer.isBlocked ? "error" : customer.hasUpcomingAppointments ? "warning" : "success"} />
               </Box>

               <Stack spacing={3}>
                    <Paper sx={{ p: 3 }}>
                         <Typography variant="h6" sx={{ mb: 2 }}>Profile</Typography>
                         <form action={submitCustomerProfile.bind(null, tenantSlug, customerId)}>
                              <Stack spacing={2}>
                                   <TextField name="name" label="Name" defaultValue={customer.name} required />
                                   <TextField name="email" label="Email" defaultValue={customer.email ?? ""} />
                                   <TextField name="phoneNumber" label="Phone" defaultValue={customer.phoneNumber ?? ""} />
                                   <TextField name="preferredLocationId" label="Preferred location ID" defaultValue={customer.preferredLocationId ?? ""} />
                                   <TextField name="loyaltyPoints" label="Loyalty points" defaultValue={String(customer.loyaltyPoints)} type="number" />
                                   <TextField name="tags" label="Tags" defaultValue={customer.tags.join(", ")} helperText="Comma-separated values" />
                                   <TextField name="internalNotes" label="Internal notes" defaultValue={customer.internalNotes ?? ""} multiline minRows={3} />
                                   <TextField name="blockedReason" label="Blocked reason" defaultValue={customer.blockedReason ?? ""} />
                                   <FormControlLabel control={<Checkbox name="marketingOptIn" defaultChecked={customer.marketingOptIn} />} label="Marketing opt-in" />
                                   <FormControlLabel control={<Checkbox name="isBlocked" defaultChecked={customer.isBlocked} />} label="Block customer" />
                                   <Button type="submit" variant="contained" sx={{ alignSelf: "flex-start" }}>Save profile</Button>
                              </Stack>
                         </form>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                         <Typography variant="h6" sx={{ mb: 2 }}>Upcoming appointments</Typography>
                         {customer.upcomingAppointments.length === 0 ? (
                              <Alert severity="info">No upcoming appointments.</Alert>
                         ) : (
                              <Stack spacing={1}>
                                   {customer.upcomingAppointments.map((appointment) => (
                                        <Box key={appointment.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                                             <Typography variant="subtitle2">{appointment.appointmentNumber}</Typography>
                                             <Typography variant="body2" color="text.secondary">{new Date(appointment.startsAt).toLocaleString()}</Typography>
                                             <Typography variant="body2">{appointment.serviceNameSnapshot}</Typography>
                                        </Box>
                                   ))}
                              </Stack>
                         )}
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                         <Typography variant="h6" sx={{ mb: 2 }}>Recent appointments</Typography>
                         {customer.recentAppointments.length === 0 ? (
                              <Alert severity="info">No appointment history yet.</Alert>
                         ) : (
                              <Stack spacing={1}>
                                   {customer.recentAppointments.map((appointment) => (
                                        <Box key={appointment.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                                             <Typography variant="subtitle2">{appointment.appointmentNumber}</Typography>
                                             <Typography variant="body2" color="text.secondary">{new Date(appointment.startsAt).toLocaleString()}</Typography>
                                             <Typography variant="body2">{appointment.serviceNameSnapshot}</Typography>
                                        </Box>
                                   ))}
                              </Stack>
                         )}
                    </Paper>
               </Stack>
          </Box>
     );
}
