"use client";

/**
 * Pricing Page — animated plan cards with feature comparison.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";

type PlanData = {
  id: string;
  name: string;
  description: string | null;
  code: string;
  priceAmount: number;
  currency: string;
  billingInterval: string | null;
  isFree: boolean;
};

type Props = {
  plans: PlanData[];
};

export default function PricingPageClient({ plans }: Props) {
  return (
    <Box sx={{ minHeight: "100vh", pt: { xs: 10, md: 14 }, pb: 8 }}>
      <Container maxWidth="lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Typography component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, textAlign: "center", mb: 1, letterSpacing: "-0.03em" }}>
            Simple, transparent pricing
          </Typography>
          <Typography sx={{ textAlign: "center", color: "#6b7280", mb: 6, maxWidth: 500, mx: "auto" }}>
            Start free. Upgrade when you grow. No hidden fees, no surprises.
          </Typography>
        </motion.div>

        <Grid container spacing={3} justifyContent="center">
          {plans.map((plan, i) => (
            <Grid key={plan.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <Paper
                  elevation={plan.isFree ? 0 : 4}
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    border: plan.isFree ? "1px solid #e5e7eb" : "2px solid #667eea",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {!plan.isFree && (
                    <Chip
                      label="Most Popular"
                      size="small"
                      sx={{ position: "absolute", top: 16, right: 16, bgcolor: "#667eea", color: "#fff", fontWeight: 600 }}
                    />
                  )}

                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 0.5 }}>
                    {plan.name}
                  </Typography>
                  {plan.description && (
                    <Typography sx={{ fontSize: "0.875rem", color: "#6b7280", mb: 2 }}>
                      {plan.description}
                    </Typography>
                  )}

                  <Box sx={{ mb: 3 }}>
                    {plan.isFree ? (
                      <Typography sx={{ fontSize: "2.5rem", fontWeight: 800 }}>Free</Typography>
                    ) : (
                      <Stack direction="row" alignItems="baseline" spacing={0.5}>
                        <Typography sx={{ fontSize: "2.5rem", fontWeight: 800 }}>
                          {formatPrice(plan.priceAmount, plan.currency)}
                        </Typography>
                        {plan.billingInterval && (
                          <Typography sx={{ color: "#6b7280" }}>/ {plan.billingInterval}</Typography>
                        )}
                      </Stack>
                    )}
                  </Box>

                  <Box sx={{ flex: 1 }} />

                  <Button
                    href="/register"
                    variant={plan.isFree ? "outlined" : "contained"}
                    fullWidth
                    size="large"
                    sx={{
                      mt: 2,
                      fontWeight: 700,
                      borderRadius: 2,
                      py: 1.5,
                      ...(plan.isFree ? {} : { background: "linear-gradient(135deg, #667eea, #764ba2)" }),
                    }}
                  >
                    {plan.isFree ? "Start Free" : "Start Free Trial"}
                  </Button>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* FAQ-style note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>
              All paid plans include a 14-day free trial. No credit card required to start.
            </Typography>
          </Box>
        </motion.div>
      </Container>
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
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major} ${currency.toUpperCase()}`;
  }
}
