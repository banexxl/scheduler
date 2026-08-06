import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import {
     listBillingWebhookDiagnostics,
} from "@/features/platform/services/platform-billing-admin-queries";
import { retryBillingWebhookEventAction } from "@/features/platform/actions/billing-plan-admin-actions";

async function retryWebhookFormAction(formData: FormData) {
     "use server";
     await retryBillingWebhookEventAction({ eventId: String(formData.get("eventId") ?? "") });
}

export default async function PlatformBillingWebhooksPage() {
     await requirePlatformAdmin();
     const events = await listBillingWebhookDiagnostics(150);

     return (
          <Stack spacing={3}>
               <Typography variant="h4" component="h1">
                    Billing Webhooks
               </Typography>
               <Typography color="text.secondary">
                    Event payloads are not shown by default. Retry is available for failed events only.
               </Typography>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Event Type</TableCell>
                                        <TableCell>Polar Event ID</TableCell>
                                        <TableCell>Resource ID</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Attempts</TableCell>
                                        <TableCell>Received</TableCell>
                                        <TableCell>Processed</TableCell>
                                        <TableCell>Last Error</TableCell>
                                        <TableCell>Last Error Message</TableCell>
                                        <TableCell>Worker</TableCell>
                                        <TableCell>Retry</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {events.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={11}>No webhook events found.</TableCell>
                                        </TableRow>
                                   ) : (
                                        events.map((event) => {
                                             const status = String(event.status ?? "unknown");
                                             const isRetryable = status === "failed";

                                             return (
                                                  <TableRow key={String(event.id)}>
                                                       <TableCell>{String(event.event_type ?? "-")}</TableCell>
                                                       <TableCell>{String(event.polar_event_id ?? "-")}</TableCell>
                                                       <TableCell>{String(event.resource_id ?? "-")}</TableCell>
                                                       <TableCell>{status}</TableCell>
                                                       <TableCell>{String(event.attempt_count ?? 0)}</TableCell>
                                                       <TableCell>{String(event.created_at ?? "-")}</TableCell>
                                                       <TableCell>{String(event.processed_at ?? "-")}</TableCell>
                                                       <TableCell>{String(event.last_error_code ?? "-")}</TableCell>
                                                       <TableCell>
                                                            {String(event.last_error_message ?? "-").slice(0, 120)}
                                                       </TableCell>
                                                       <TableCell>{String(event.processing_worker_id ?? "-")}</TableCell>
                                                       <TableCell>
                                                            {isRetryable ? (
                                                                 <form action={retryWebhookFormAction}>
                                                                      <input type="hidden" name="eventId" value={String(event.id)} />
                                                                      <Button type="submit" size="small" variant="outlined">
                                                                           Retry
                                                                      </Button>
                                                                 </form>
                                                            ) : (
                                                                 "-"
                                                            )}
                                                       </TableCell>
                                                  </TableRow>
                                             );
                                        })
                                   )}
                              </TableBody>
                         </Table>
                    </TableContainer>
               </Paper>
          </Stack>
     );
}
