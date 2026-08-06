"use client";

import { useState, useTransition } from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import {
     getAppointmentSelfServiceSummaryAction,
     revokeAppointmentAccessTokenAction,
     rotateAppointmentAccessTokenAction,
} from "../actions/manage-appointment-actions";

type TokenMetadata = {
     id: string;
     tokenPrefix: string;
     expiresAt: string;
     lastUsedAt: string | null;
     useCount: number;
     revokedAt: string | null;
     revocationReason: string | null;
     createdAt: string;
};

type CustomerAction = {
     id: string;
     actionType: string;
     status: "success" | "failed";
     reason: string | null;
     failureCode: string | null;
     createdAt: string;
};

export default function InternalAppointmentSelfServiceSection({
     tenantSlug,
     appointmentId,
     initialActiveToken,
     initialTokenHistory,
     initialCustomerActions,
}: {
     tenantSlug: string;
     appointmentId: string;
     initialActiveToken: TokenMetadata | null;
     initialTokenHistory: TokenMetadata[];
     initialCustomerActions: CustomerAction[];
}) {
     const [activeToken, setActiveToken] = useState<TokenMetadata | null>(initialActiveToken);
     const [tokenHistory, setTokenHistory] = useState<TokenMetadata[]>(initialTokenHistory);
     const [customerActions, setCustomerActions] = useState<CustomerAction[]>(initialCustomerActions);
     const [latestLink, setLatestLink] = useState<string | null>(null);
     const [error, setError] = useState<string | null>(null);
     const [isPending, startTransition] = useTransition();

     const refresh = async () => {
          const summary = await getAppointmentSelfServiceSummaryAction(tenantSlug, appointmentId);
          if (!summary.success) {
               setError(summary.error);
               return;
          }

          setActiveToken((summary.data.activeToken as TokenMetadata | null) ?? null);
          setTokenHistory((summary.data.tokenHistory as TokenMetadata[]) ?? []);
          setCustomerActions((summary.data.customerActions as CustomerAction[]) ?? []);
     };

     const handleRotate = () => {
          setError(null);
          setLatestLink(null);

          startTransition(async () => {
               const result = await rotateAppointmentAccessTokenAction(tenantSlug, appointmentId, {
                    revocationReason: "rotated_by_owner_admin",
               });

               if (!result.success) {
                    setError(result.error);
                    return;
               }

               setLatestLink(result.data.manageUrl);
               await refresh();
          });
     };

     const handleRevoke = () => {
          if (!activeToken) return;

          setError(null);
          startTransition(async () => {
               const result = await revokeAppointmentAccessTokenAction(
                    tenantSlug,
                    appointmentId,
                    activeToken.id,
                    { reason: "revoked_by_owner_admin" }
               );

               if (!result.success) {
                    setError(result.error);
                    return;
               }

               await refresh();
          });
     };

     return (
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
               <Typography variant="h6" gutterBottom>
                    Customer Self-Service Link
               </Typography>

               {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

               {latestLink && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                         <Typography variant="body2" sx={{ mb: 1 }}>
                              Copy this link now. For security, it will not be shown again.
                         </Typography>
                         <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{latestLink}</Typography>
                         <Button
                              size="small"
                              sx={{ mt: 1 }}
                              onClick={() => navigator.clipboard.writeText(latestLink)}
                         >
                              Copy link
                         </Button>
                    </Alert>
               )}

               <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Status</Typography>
                         <Typography>{activeToken ? "Active" : "No active link"}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Token Prefix</Typography>
                         <Typography>{activeToken?.tokenPrefix ?? "-"}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Created</Typography>
                         <Typography>{activeToken ? new Date(activeToken.createdAt).toLocaleString() : "-"}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Expires</Typography>
                         <Typography>{activeToken ? new Date(activeToken.expiresAt).toLocaleString() : "-"}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Last Used</Typography>
                         <Typography>{activeToken?.lastUsedAt ? new Date(activeToken.lastUsedAt).toLocaleString() : "-"}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Use Count</Typography>
                         <Typography>{activeToken?.useCount ?? 0}</Typography>
                    </Box>
               </Box>

               <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                    <Button variant="contained" disabled={isPending} onClick={handleRotate}>
                         {activeToken ? "Rotate link" : "Generate link"}
                    </Button>
                    <Button
                         variant="outlined"
                         color="error"
                         disabled={isPending || !activeToken}
                         onClick={handleRevoke}
                    >
                         Revoke link
                    </Button>
               </Box>

               <Divider sx={{ my: 2 }} />

               <Typography variant="subtitle2" sx={{ mb: 1 }}>Token history</Typography>
               <Box sx={{ display: "grid", gap: 1.25, mb: 2 }}>
                    {tokenHistory.length === 0 && <Typography variant="body2" color="text.secondary">No history yet.</Typography>}
                    {tokenHistory.map((item) => (
                         <Box key={item.id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                              <Typography variant="body2">Prefix: {item.tokenPrefix}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                   Created {new Date(item.createdAt).toLocaleString()} | Expires {new Date(item.expiresAt).toLocaleString()} | Uses {item.useCount}
                              </Typography>
                         </Box>
                    ))}
               </Box>

               <Typography variant="subtitle2" sx={{ mb: 1 }}>Customer actions</Typography>
               <Box sx={{ display: "grid", gap: 1.25 }}>
                    {customerActions.length === 0 && <Typography variant="body2" color="text.secondary">No customer actions yet.</Typography>}
                    {customerActions.slice(0, 20).map((item) => (
                         <Box key={item.id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                                   {item.actionType.replaceAll("_", " ")} ({item.status})
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                   {new Date(item.createdAt).toLocaleString()}
                                   {item.failureCode ? ` | ${item.failureCode}` : ""}
                                   {item.reason ? ` | ${item.reason}` : ""}
                              </Typography>
                         </Box>
                    ))}
               </Box>
          </Paper>
     );
}
