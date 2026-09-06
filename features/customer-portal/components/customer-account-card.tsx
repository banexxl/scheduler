"use client";

/**
 * Customer Account Card.
 *
 * Displays the logged-in customer's global account details
 * (from `customer_accounts`) at the top of the portal dashboard.
 * Dark-glass styled to match the rest of the portal.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import VerifiedIcon from "@mui/icons-material/Verified";

export type CustomerAccount = {
     fullName: string | null;
     email: string;
     phone: string | null;
     avatarUrl: string | null;
     preferredLanguage: string | null;
     emailVerified: boolean;
     memberSince: string | null;
};

type Props = {
     account: CustomerAccount;
};

function initialsFromName(name: string | null, email: string): string {
     const source = name?.trim() || email;
     return source
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
}

export default function CustomerAccountCard({ account }: Props) {
     const displayName = account.fullName?.trim() || account.email;

     return (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
               <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                         src={account.avatarUrl ?? undefined}
                         alt={displayName}
                         sx={{
                              width: 56,
                              height: 56,
                              bgcolor: "rgba(167,139,250,0.15)",
                              color: "#a78bfa",
                              fontWeight: 700,
                              fontSize: "1.25rem",
                              border: "1px solid rgba(167,139,250,0.3)",
                         }}
                    >
                         {initialsFromName(account.fullName, account.email)}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                         <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1" fontWeight={700} noWrap>
                                   {displayName}
                              </Typography>
                              {account.emailVerified && (
                                   <Chip
                                        icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                                        label="Verified"
                                        size="small"
                                        sx={{
                                             height: 22,
                                             fontSize: "0.6875rem",
                                             bgcolor: "rgba(16,185,129,0.12)",
                                             color: "#34d399",
                                             border: "1px solid rgba(16,185,129,0.25)",
                                             "& .MuiChip-icon": { color: "#34d399" },
                                        }}
                                   />
                              )}
                         </Stack>
                         {account.memberSince && (
                              <Typography variant="caption" sx={{ color: "#8b8b9e" }}>
                                   Member since {account.memberSince}
                              </Typography>
                         )}
                    </Box>
               </Stack>

               <Stack spacing={1} sx={{ mt: 2 }}>
                    <InfoRow icon={<EmailIcon sx={{ fontSize: 16 }} />} value={account.email} />
                    {account.phone && (
                         <InfoRow icon={<PhoneIcon sx={{ fontSize: 16 }} />} value={account.phone} />
                    )}
                    {account.preferredLanguage && (
                         <InfoRow
                              icon={<LanguageIcon sx={{ fontSize: 16 }} />}
                              value={account.preferredLanguage.toUpperCase()}
                         />
                    )}
               </Stack>
          </Paper>
     );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
     return (
          <Stack direction="row" spacing={1} alignItems="center">
               <Box sx={{ color: "#5c5c72", display: "flex" }}>{icon}</Box>
               <Typography variant="body2" sx={{ color: "#c9c6d6" }} noWrap>
                    {value}
               </Typography>
          </Stack>
     );
}
