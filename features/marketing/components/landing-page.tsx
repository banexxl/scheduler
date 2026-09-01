"use client";

/**
 * Marketing Landing Page — Premium dark single-page story.
 *
 * Sections:
 * 1. Hero — animated headline, gradient mesh background, floating CTA
 * 2. Problem — why businesses struggle with scheduling
 * 3. Solution — what Get Slot does differently
 * 4. Features — interactive card grid with hover glow
 * 5. How It Works — 3-step animated flow
 * 6. Stats — animated counters
 * 7. Pricing — inline plan cards
 * 8. CTA — final conversion push
 *
 * Uses framer-motion for scroll-triggered animations.
 * Respects prefers-reduced-motion.
 */

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import AnimatedBackground, { SectionGlow } from "./animated-background";

// ─── Animation Helpers ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleReveal = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

function ScrollSection({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const duration = 2000;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Glass Card ──────────────────────────────────────────────────────────────

function GlassCard({ children, delay = 0, glowColor = "rgba(124,58,237,0.15)" }: { children: React.ReactNode; delay?: number; glowColor?: string }) {
  return (
    <motion.div
      custom={delay}
      variants={fadeUp}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
    >
      <Box
        sx={{
          p: 3.5,
          borderRadius: 3,
          bgcolor: "rgba(22, 22, 30, 0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.3s, box-shadow 0.3s",
          "&:hover": {
            borderColor: "rgba(124,58,237,0.3)",
            boxShadow: `0 8px 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
          },
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)",
            opacity: 0,
            transition: "opacity 0.3s",
          },
          "&:hover::before": { opacity: 1 },
          height: "100%",
        }}
      >
        {children}
      </Box>
    </motion.div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type PlanData = {
  id: string;
  name: string;
  description: string | null;
  code: string;
  priceAmount: number;
  currency: string;
  billingInterval: string | null;
  billingIntervalCount: number;
  isFree: boolean;
  features: string[];
};

type Props = {
  plans: PlanData[];
};

/** Number of months a plan's billing term covers (year=12, month×6=6). */
function planTermMonths(billingInterval: string | null, count: number): number {
  const c = count > 0 ? count : 1;
  if (billingInterval === "year") return 12 * c;
  return c;
}

function planPerMonthMinor(plan: PlanData): number {
  return plan.priceAmount / planTermMonths(plan.billingInterval, plan.billingIntervalCount);
}

function planBillingTermLabel(billingInterval: string | null, count: number): string | null {
  const c = count > 0 ? count : 1;
  if (billingInterval === "year") return c === 1 ? "billed annually" : `billed every ${c} years`;
  if (billingInterval === "month") {
    if (c === 1) return "billed monthly";
    if (c === 12) return "billed annually";
    return `billed every ${c} months`;
  }
  return null;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MarketingLandingPage({ plans }: Props) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  // Baseline = highest per-month rate among paid plans; longer terms save vs this.
  const paidPerMonth = plans.filter((p) => !p.isFree).map(planPerMonthMinor);
  const baselinePerMonth = paidPerMonth.length > 0 ? Math.max(...paidPerMonth) : 0;

  return (
    <Box sx={{ overflow: "hidden", bgcolor: "#0a0a0f" }}>

      {/* ═══════ 1. HERO ═══════ */}
      <Box ref={heroRef} sx={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <AnimatedBackground variant="hero" />

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1, textAlign: "center", pt: 10 }}>
          <motion.div style={{ opacity: heroOpacity, scale: heroScale }}>
            {/* Logo icon */}
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/getslot_icon.svg"
                  alt="GetSlot"
                  width={120}
                  height={120}
                  style={{ filter: "drop-shadow(0 0 40px rgba(124,58,237,0.6))" }}
                />
              </Box>
            </motion.div>

            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 0.75,
                  borderRadius: 5,
                  bgcolor: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  mb: 3,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#10B981", boxShadow: "0 0 8px #10B981" }} />
                <Typography sx={{ fontSize: "0.8125rem", color: "#a78bfa", fontWeight: 500 }}>
                  Now serving 50,000+ appointments
                </Typography>
              </Box>
            </motion.div>

            {/* Headline */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.25rem" },
                  fontWeight: 800,
                  lineHeight: 1.1,
                  mb: 2.5,
                  letterSpacing: "-0.04em",
                  color: "#f0f0f5",
                }}
              >
                Scheduling that
                <br />
                <Box
                  component="span"
                  sx={{
                    background: "linear-gradient(135deg, #7C3AED, #a855f7, #6366f1)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "200% auto",
                  }}
                >
                  works as hard
                </Box>
                {" "}as you do
              </Typography>
            </motion.div>

            {/* Subtitle */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}>
              <Typography
                sx={{
                  fontSize: { xs: "1rem", md: "1.25rem" },
                  color: "#8b8b9e",
                  maxWidth: 560,
                  mx: "auto",
                  mb: 4,
                  lineHeight: 1.7,
                }}
              >
                The all-in-one booking platform for salons, clinics, studios, and service businesses.
                Manage appointments, payments, gift cards, and more.
              </Typography>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, duration: 0.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                <Button
                  href="/register"
                  variant="contained"
                  size="large"
                  sx={{
                    fontWeight: 700,
                    px: 5,
                    py: 1.75,
                    borderRadius: 2,
                    fontSize: "1rem",
                    textTransform: "none",
                    background: "linear-gradient(135deg, #7C3AED, #a855f7)",
                    boxShadow: "0 0 40px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #6D28D9, #9333ea)",
                      boxShadow: "0 0 60px rgba(124,58,237,0.6), 0 8px 30px rgba(0,0,0,0.4)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Start Free Trial
                </Button>
                <Button
                  href="/#how-it-works"
                  variant="outlined"
                  size="large"
                  sx={{
                    fontWeight: 600,
                    px: 4,
                    py: 1.75,
                    borderRadius: 2,
                    fontSize: "1rem",
                    textTransform: "none",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "#a0a0b8",
                    "&:hover": { borderColor: "rgba(124,58,237,0.5)", color: "#f0f0f5", bgcolor: "rgba(124,58,237,0.05)" },
                  }}
                >
                  See How It Works
                </Button>
              </Stack>
            </motion.div>
          </motion.div>
        </Container>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 1 }}
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <Box sx={{ width: 24, height: 40, borderRadius: 12, border: "2px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "center", pt: 1 }}>
              <Box sx={{ width: 3, height: 8, borderRadius: 2, bgcolor: "rgba(124,58,237,0.6)" }} />
            </Box>
          </motion.div>
        </motion.div>
      </Box>

      {/* ═══════ 2. PROBLEM ═══════ */}
      <Box sx={{ py: { xs: 10, md: 16 }, position: "relative" }}>
        <SectionGlow color="rgba(239, 68, 68, 0.06)" position="left" />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <ScrollSection>
            <motion.div custom={0} variants={fadeUp}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.1em", mb: 2 }}>
                The Problem
              </Typography>
            </motion.div>
            <motion.div custom={1} variants={fadeUp}>
              <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.75rem" }, fontWeight: 800, lineHeight: 1.15, mb: 3, letterSpacing: "-0.03em", color: "#f0f0f5" }}>
                You&apos;re losing clients to
                <Box component="span" sx={{ color: "#EF4444" }}> missed calls</Box>,
                <Box component="span" sx={{ color: "#F59E0B" }}> double bookings</Box>, and
                <Box component="span" sx={{ color: "#EF4444" }}> no-shows</Box>
              </Typography>
            </motion.div>
            <motion.div custom={2} variants={fadeUp}>
              <Typography sx={{ fontSize: "1.125rem", color: "#8b8b9e", lineHeight: 1.8, maxWidth: 600 }}>
                Sticky notes. Spreadsheets. Phone tag. Most service businesses still rely on manual
                scheduling that costs them hours every week and thousands in lost revenue.
                Your clients expect instant, online booking — and if you don&apos;t offer it,
                your competitor will.
              </Typography>
            </motion.div>
          </ScrollSection>
        </Container>
      </Box>

      {/* ═══════ 3. SOLUTION ═══════ */}
      <Box sx={{ py: { xs: 10, md: 16 }, position: "relative" }}>
        <SectionGlow color="rgba(16, 185, 129, 0.06)" position="right" />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <ScrollSection>
            <motion.div custom={0} variants={fadeUp}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.1em", mb: 2 }}>
                The Solution
              </Typography>
            </motion.div>
            <motion.div custom={1} variants={fadeUp}>
              <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.75rem" }, fontWeight: 800, lineHeight: 1.15, mb: 3, letterSpacing: "-0.03em", color: "#f0f0f5" }}>
                One platform.{" "}
                <Box component="span" sx={{ background: "linear-gradient(135deg, #10B981, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Everything handled.
                </Box>
              </Typography>
            </motion.div>
            <motion.div custom={2} variants={fadeUp}>
              <Typography sx={{ fontSize: "1.125rem", color: "#8b8b9e", lineHeight: 1.8, maxWidth: 600 }}>
                Get Slot gives your business a professional booking page, automated reminders,
                integrated payments, gift cards, loyalty rewards, and a full operational dashboard —
                all without writing a single line of code. Your clients book in seconds.
                You manage everything from one screen.
              </Typography>
            </motion.div>
          </ScrollSection>
        </Container>
      </Box>

      {/* ═══════ 4. FEATURES ═══════ */}
      <Box id="features" sx={{ py: { xs: 10, md: 16 }, position: "relative" }}>
        <SectionGlow color="rgba(124, 58, 237, 0.06)" />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <ScrollSection>
            <motion.div custom={0} variants={fadeUp}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.1em", mb: 2, textAlign: "center" }}>
                Features
              </Typography>
            </motion.div>
            <motion.div custom={1} variants={fadeUp}>
              <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, fontWeight: 800, textAlign: "center", mb: 1.5, letterSpacing: "-0.02em", color: "#f0f0f5" }}>
                Everything you need to grow
              </Typography>
            </motion.div>
            <motion.div custom={2} variants={fadeUp}>
              <Typography sx={{ textAlign: "center", color: "#8b8b9e", mb: 6, maxWidth: 500, mx: "auto" }}>
                From booking to payments — one platform so you can focus on your craft.
              </Typography>
            </motion.div>

            <Grid container spacing={2.5}>
              {FEATURES.map((feature, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <GlassCard delay={i}>
                    <Typography sx={{ fontSize: "2rem", mb: 1.5 }}>{feature.icon}</Typography>
                    <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, mb: 0.75, color: "#f0f0f5" }}>{feature.title}</Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e", lineHeight: 1.65 }}>{feature.description}</Typography>
                  </GlassCard>
                </Grid>
              ))}
            </Grid>
          </ScrollSection>
        </Container>
      </Box>

      {/* ═══════ 5. HOW IT WORKS ═══════ */}
      <Box id="how-it-works" sx={{ py: { xs: 10, md: 16 }, position: "relative" }}>
        <SectionGlow color="rgba(99, 102, 241, 0.06)" position="left" />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <ScrollSection>
            <motion.div custom={0} variants={fadeUp}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", mb: 2, textAlign: "center" }}>
                How It Works
              </Typography>
            </motion.div>
            <motion.div custom={1} variants={fadeUp}>
              <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, fontWeight: 800, textAlign: "center", mb: 6, letterSpacing: "-0.02em", color: "#f0f0f5" }}>
                Up and running in minutes
              </Typography>
            </motion.div>

            <Stack spacing={5}>
              {STEPS.map((step, i) => (
                <motion.div key={i} custom={i + 2} variants={fadeUp}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center">
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))",
                        border: "1px solid rgba(124,58,237,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#a78bfa",
                        flexShrink: 0,
                        boxShadow: "0 0 30px rgba(124,58,237,0.15)",
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 0.5, color: "#f0f0f5" }}>{step.title}</Typography>
                      <Typography sx={{ color: "#8b8b9e", lineHeight: 1.65 }}>{step.description}</Typography>
                    </Box>
                  </Stack>
                </motion.div>
              ))}
            </Stack>
          </ScrollSection>
        </Container>
      </Box>

      {/* ═══════ 6. STATS ═══════ */}
      <Box sx={{ py: { xs: 8, md: 12 }, position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(99,102,241,0.03) 100%)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }} />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <ScrollSection>
            <Grid container spacing={4} textAlign="center">
              {STATS.map((stat, i) => (
                <Grid key={i} size={{ xs: 6, md: 3 }}>
                  <motion.div variants={scaleReveal}>
                    <Typography sx={{ fontSize: { xs: "2.25rem", md: "3rem" }, fontWeight: 800, background: "linear-gradient(135deg, #a78bfa, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {stat.prefix}<AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </Typography>
                    <Typography sx={{ fontSize: "0.8125rem", color: "#5c5c72", mt: 0.5 }}>{stat.label}</Typography>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </ScrollSection>
        </Container>
      </Box>

      {/* ═══════ 7. PRICING ═══════ */}
      <Box id="pricing" sx={{ py: { xs: 10, md: 16 }, position: "relative" }}>
        <SectionGlow color="rgba(124, 58, 237, 0.05)" />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <ScrollSection>
            <motion.div custom={0} variants={fadeUp}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.1em", mb: 2, textAlign: "center" }}>
                Pricing
              </Typography>
            </motion.div>
            <motion.div custom={1} variants={fadeUp}>
              <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, fontWeight: 800, textAlign: "center", mb: 1.5, letterSpacing: "-0.02em", color: "#f0f0f5" }}>
                Simple, transparent pricing
              </Typography>
            </motion.div>
            <motion.div custom={2} variants={fadeUp}>
              <Typography sx={{ textAlign: "center", color: "#8b8b9e", mb: 6, maxWidth: 500, mx: "auto" }}>
                Start free. Upgrade when you grow. No hidden fees.
              </Typography>
            </motion.div>

            <Grid container spacing={3} justifyContent="center">
              {plans.map((plan, i) => {
                const isFeatured = plans.length > 1 && i === 1;
                return (
                  <Grid key={plan.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <GlassCard delay={i + 3} glowColor={isFeatured ? "rgba(124,58,237,0.25)" : "rgba(124,58,237,0.1)"}>
                      <Box sx={{ position: "relative" }}>
                        {isFeatured && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: -4,
                              right: -4,
                              px: 1.5,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: "rgba(124,58,237,0.2)",
                              border: "1px solid rgba(124,58,237,0.3)",
                            }}
                          >
                            <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: "#a78bfa" }}>Popular</Typography>
                          </Box>
                        )}
                        <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#f0f0f5", mb: 0.5 }}>{plan.name}</Typography>
                        {plan.description && (
                          <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e", mb: 2 }}>{plan.description}</Typography>
                        )}
                        <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, color: "#f0f0f5" }}>
                          {plan.isFree ? "Free" : formatPrice(plan.priceAmount, plan.currency)}
                          {!plan.isFree && plan.billingInterval && (
                            <Typography component="span" sx={{ fontSize: "1rem", color: "#5c5c72", fontWeight: 400 }}>
                              {" "}/{plan.billingIntervalCount > 1 ? `${plan.billingIntervalCount} ` : ""}{plan.billingInterval}{plan.billingIntervalCount > 1 ? "s" : ""}
                            </Typography>
                          )}
                        </Typography>
                        {!plan.isFree && (() => {
                          const months = planTermMonths(plan.billingInterval, plan.billingIntervalCount);
                          const savePct = baselinePerMonth > 0
                            ? Math.round((1 - planPerMonthMinor(plan) / baselinePerMonth) * 100)
                            : 0;
                          const termLabel = planBillingTermLabel(plan.billingInterval, plan.billingIntervalCount);
                          return (
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                              <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e" }}>
                                {months > 1 ? `${formatPrice(Math.round(planPerMonthMinor(plan)), plan.currency)}/mo` : ""}
                                {months > 1 && termLabel ? " · " : ""}
                                {termLabel ?? ""}
                              </Typography>
                              {savePct > 0 && (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                  <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#10B981" }}>Save {savePct}%</Typography>
                                </Box>
                              )}
                            </Stack>
                          );
                        })()}
                        {plan.features.length > 0 && (
                          <Stack component="ul" spacing={0.75} sx={{ listStyle: "none", p: 0, m: 0, mt: 2 }}>
                            {plan.features.map((feature, fi) => (
                              <Stack key={fi} component="li" direction="row" spacing={1} alignItems="flex-start">
                                <Box aria-hidden sx={{ mt: "3px", flexShrink: 0, width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(124,58,237,0.15)", color: "#a78bfa", fontSize: "0.625rem", fontWeight: 700 }}>✓</Box>
                                <Typography sx={{ fontSize: "0.8125rem", color: "#c4c4d4" }}>{feature}</Typography>
                              </Stack>
                            ))}
                          </Stack>
                        )}
                        <Button
                          href="/register"
                          variant={isFeatured ? "contained" : "outlined"}
                          fullWidth
                          size="large"
                          sx={{
                            mt: 3,
                            fontWeight: 700,
                            borderRadius: 2,
                            py: 1.5,
                            textTransform: "none",
                            ...(isFeatured
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
                          {plan.isFree ? "Start Free" : "Start Free Trial"}
                        </Button>
                      </Box>
                    </GlassCard>
                  </Grid>
                );
              })}
            </Grid>

            <motion.div custom={7} variants={fadeUp}>
              <Typography sx={{ textAlign: "center", color: "#5c5c72", fontSize: "0.8125rem", mt: 4 }}>
                All paid plans include a 14-day free trial. No credit card required.
              </Typography>
            </motion.div>
          </ScrollSection>
        </Container>
      </Box>

      {/* ═══════ 8. CTA ═══════ */}
      <Box sx={{ py: { xs: 12, md: 20 }, position: "relative", textAlign: "center" }}>
        <SectionGlow color="rgba(124, 58, 237, 0.08)" />
        <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
          <ScrollSection>
            <motion.div custom={0} variants={fadeUp}>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "1.75rem", md: "2.75rem" },
                  fontWeight: 800,
                  mb: 2,
                  letterSpacing: "-0.03em",
                  color: "#f0f0f5",
                  lineHeight: 1.15,
                }}
              >
                Ready to transform
                <br />
                <Box component="span" sx={{ background: "linear-gradient(135deg, #7C3AED, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  your scheduling?
                </Box>
              </Typography>
            </motion.div>
            <motion.div custom={1} variants={fadeUp}>
              <Typography sx={{ color: "#8b8b9e", mb: 4, lineHeight: 1.7, fontSize: "1.0625rem" }}>
                Join thousands of businesses that trust Get Slot.
                Set up in minutes. No credit card required.
              </Typography>
            </motion.div>
            <motion.div custom={2} variants={fadeUp}>
              <Button
                href="/register"
                variant="contained"
                size="large"
                sx={{
                  fontWeight: 700,
                  px: 6,
                  py: 2,
                  borderRadius: 2,
                  fontSize: "1.125rem",
                  textTransform: "none",
                  background: "linear-gradient(135deg, #7C3AED, #a855f7)",
                  boxShadow: "0 0 60px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #6D28D9, #9333ea)",
                    boxShadow: "0 0 80px rgba(124,58,237,0.6), 0 8px 30px rgba(0,0,0,0.4)",
                  },
                }}
              >
                Get Started Free
              </Button>
            </motion.div>
          </ScrollSection>
        </Container>
      </Box>

    </Box>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "📅", title: "Smart Scheduling", description: "Intelligent availability that prevents double bookings and handles timezones automatically." },
  { icon: "💳", title: "Integrated Payments", description: "Accept payments online. Gift cards, packages, and discounts built right in." },
  { icon: "🔄", title: "Recurring Appointments", description: "Set up weekly or custom recurring schedules for regular clients in one click." },
  { icon: "🎁", title: "Gift Cards & Packages", description: "Sell gift cards and service packages from your booking page. Track redemptions automatically." },
  { icon: "📱", title: "Mobile-First Booking", description: "Beautiful booking that works perfectly on any device. Clients book in seconds." },
  { icon: "📊", title: "Business Analytics", description: "Real-time dashboards for revenue, bookings, and client retention insights." },
  { icon: "👥", title: "Team Management", description: "Staff schedules, resource assignment, and client preferences — all managed." },
  { icon: "🔔", title: "Smart Notifications", description: "Automated confirmations, reminders, and follow-ups. Reduce no-shows by 80%." },
  { icon: "🌐", title: "Public Business Page", description: "Professional presence with reviews, gallery, and integrated booking — no website needed." },
];

const STEPS = [
  { title: "Create your business", description: "Sign up in 30 seconds. Add your services, set your hours, and configure your brand. No technical skills needed." },
  { title: "Share your booking link", description: "Send your unique URL to clients, embed it on your website, or add it to social profiles." },
  { title: "Start accepting bookings", description: "Clients self-schedule at their convenience. You manage everything from one clean dashboard." },
];

const STATS = [
  { value: 99, suffix: ".9%", prefix: "", label: "Uptime" },
  { value: 50, suffix: "k+", prefix: "", label: "Bookings processed" },
  { value: 3, suffix: "s", prefix: "< ", label: "Average load time" },
  { value: 4, suffix: ".9★", prefix: "", label: "Customer rating" },
];

// ─── Price Formatter ─────────────────────────────────────────────────────────

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
