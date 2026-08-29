"use client";

/**
 * Pricing Page — Dark glassmorphism cards with hover glow.
 *
 * Standalone pricing page that loads real plan data from DB.
 * Matches the dark marketing theme.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { SectionGlow } from "./animated-background";

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
  currentPlanKey?: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function PricingPageClient({ plans, currentPlanKey }: Props) {
  const hasFeatured = plans.length > 1;

  return (
    <Box sx={{ minHeight: "100vh", pt: { xs: 14, md: 18 }, pb: 10, bgcolor: "#0a0a0f", position: "relative" }}>
      <SectionGlow color="rgba(124, 58, 237, 0.06)" />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.div custom={0} variants={fadeUp}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#7C3AED",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                mb: 2,
                textAlign: "center",
              }}
            >
              Pricing
            </Typography>
          </motion.div>

          <motion.div custom={1} variants={fadeUp}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "2rem", md: "3rem" },
                fontWeight: 800,
                textAlign: "center",
                mb: 1.5,
                letterSpacing: "-0.03em",
                color: "#f0f0f5",
              }}
            >
              Simple, transparent pricing
            </Typography>
          </motion.div>

          <motion.div custom={2} variants={fadeUp}>
            <Typography sx={{ textAlign: "center", color: "#8b8b9e", mb: 7, maxWidth: 500, mx: "auto" }}>
              Start free. Upgrade when you grow. No hidden fees, no surprises.
            </Typography>
          </motion.div>

          <Grid container spacing={3} justifyContent="center">
            {plans.map((plan, i) => {
              const isFeatured = hasFeatured && i === 1;
              const isCurrentPlan = Boolean(currentPlanKey && plan.code === currentPlanKey);
              return (
                <Grid key={plan.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <motion.div
                    custom={i + 3}
                    variants={fadeUp}
                    whileHover={{ y: -8, transition: { duration: 0.25 } }}
                  >
                    <Box
                      sx={{
                        p: 4,
                        borderRadius: 3,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        bgcolor: "rgba(22, 22, 30, 0.6)",
                        border: isCurrentPlan
                          ? "2px solid rgba(16,185,129,0.5)"
                          : isFeatured ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)",
                        backdropFilter: "blur(12px)",
                        position: "relative",
                        overflow: "hidden",
                        transition: "border-color 0.3s, box-shadow 0.3s",
                        "&:hover": {
                          borderColor: isCurrentPlan
                            ? "rgba(16,185,129,0.7)"
                            : isFeatured ? "rgba(124,58,237,0.6)" : "rgba(124,58,237,0.25)",
                          boxShadow: isCurrentPlan
                            ? "0 8px 60px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.06)"
                            : isFeatured
                              ? "0 8px 60px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
                              : "0 8px 40px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                        },
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: isCurrentPlan ? "2px" : "1px",
                          background: isCurrentPlan
                            ? "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)"
                            : isFeatured
                              ? "linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)"
                              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                        },
                      }}
                    >
                      {isCurrentPlan && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            px: 1.5,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: "rgba(16,185,129,0.15)",
                            border: "1px solid rgba(16,185,129,0.3)",
                          }}
                        >
                          <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: "#10B981" }}>
                            Current Plan
                          </Typography>
                        </Box>
                      )}
                      {!isCurrentPlan && isFeatured && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            px: 1.5,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: "rgba(124,58,237,0.2)",
                            border: "1px solid rgba(124,58,237,0.3)",
                          }}
                        >
                          <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: "#a78bfa" }}>
                            Most Popular
                          </Typography>
                        </Box>
                      )}

                      <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 0.5, color: "#f0f0f5" }}>
                        {plan.name}
                      </Typography>
                      {plan.description && (
                        <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e", mb: 2 }}>
                          {plan.description}
                        </Typography>
                      )}

                      <Box sx={{ mb: 3 }}>
                        {plan.isFree ? (
                          <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, color: "#f0f0f5" }}>Free</Typography>
                        ) : (
                          <Stack direction="row" alignItems="baseline" spacing={0.5}>
                            <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, color: "#f0f0f5" }}>
                              {formatPrice(plan.priceAmount, plan.currency)}
                            </Typography>
                            {plan.billingInterval && (
                              <Typography sx={{ color: "#5c5c72" }}>/ {plan.billingInterval}</Typography>
                            )}
                          </Stack>
                        )}
                      </Box>

                      <Box sx={{ flex: 1 }} />

                      <Button
                        href={isCurrentPlan ? "/api/home" : "/register"}
                        variant={isCurrentPlan ? "outlined" : isFeatured ? "contained" : "outlined"}
                        fullWidth
                        size="large"
                        disabled={isCurrentPlan}
                        sx={{
                          mt: 2,
                          fontWeight: 700,
                          borderRadius: 2,
                          py: 1.5,
                          textTransform: "none",
                          ...(isCurrentPlan
                            ? {
                              borderColor: "rgba(16,185,129,0.3)",
                              color: "#10B981",
                              "&:hover": { borderColor: "rgba(16,185,129,0.5)", bgcolor: "rgba(16,185,129,0.05)" },
                              "&.Mui-disabled": { borderColor: "rgba(16,185,129,0.2)", color: "rgba(16,185,129,0.6)" },
                            }
                            : isFeatured
                              ? {
                                background: "linear-gradient(135deg, #7C3AED, #a855f7)",
                                boxShadow: "0 0 30px rgba(124,58,237,0.3)",
                                "&:hover": { background: "linear-gradient(135deg, #6D28D9, #9333ea)", boxShadow: "0 0 40px rgba(124,58,237,0.5)" },
                              }
                              : {
                                borderColor: "rgba(255,255,255,0.1)",
                                color: "#a0a0b8",
                                "&:hover": { borderColor: "rgba(124,58,237,0.4)", color: "#f0f0f5" },
                              }),
                        }}
                      >
                        {isCurrentPlan ? "Current Plan" : plan.isFree ? "Start Free" : "Start Free Trial"}
                      </Button>
                    </Box>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>

          {/* Note */}
          <motion.div custom={plans.length + 3} variants={fadeUp}>
            <Box sx={{ textAlign: "center", mt: 6 }}>
              <Typography sx={{ color: "#5c5c72", fontSize: "0.875rem" }}>
                All paid plans include a 14-day free trial. No credit card required to start.
              </Typography>
            </Box>
          </motion.div>
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
