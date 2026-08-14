"use client";

/**
 * Marketing Landing Page — animated, professional SaaS landing page.
 *
 * Sections:
 * - Hero with animated headline
 * - Feature showcase with staggered cards
 * - How it works (3-step flow)
 * - Social proof / stats
 * - Pricing CTA
 * - Footer
 *
 * Uses framer-motion for scroll-triggered animations.
 */

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Link from "next/link";

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const slideLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const slideRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

// ─── Animated Section Wrapper ────────────────────────────────────────────────

function AnimatedSection({ children, variants = fadeUp, className }: { children: React.ReactNode; variants?: Record<string, unknown>; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants as never}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MarketingLandingPage() {
  return (
    <Box sx={{ overflow: "hidden" }}>
      {/* Navigation */}
      <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.02em" }}>
              get-slot
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={Link} href="/login" variant="text" size="small" sx={{ fontWeight: 600 }}>
                Sign In
              </Button>
              <Button component={Link} href="/register" variant="contained" size="small" sx={{ fontWeight: 600, borderRadius: 2, px: 2.5 }}>
                Start Free
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ pt: { xs: 14, md: 20 }, pb: { xs: 8, md: 14 }, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "#fff", position: "relative" }}>
        <Container maxWidth="md" sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <Typography component="h1" sx={{ fontSize: { xs: "2.25rem", md: "3.5rem" }, fontWeight: 800, lineHeight: 1.15, mb: 2, letterSpacing: "-0.03em" }}>
              Scheduling that works
              <br />
              <Box component="span" sx={{ background: "linear-gradient(90deg, #ffd700, #ff6b35)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                as hard as you do
              </Box>
            </Typography>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.25rem" }, opacity: 0.9, maxWidth: 560, mx: "auto", mb: 4, lineHeight: 1.6 }}>
              The all-in-one booking platform for salons, clinics, studios, and service businesses. Manage appointments, payments, gift cards, and more.
            </Typography>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.8 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
              <Button component={Link} href="/register" variant="contained" size="large" sx={{ bgcolor: "#fff", color: "#764ba2", fontWeight: 700, px: 4, py: 1.5, borderRadius: 2, fontSize: "1rem", "&:hover": { bgcolor: "#f0f0f0" } }}>
                Start Free Trial
              </Button>
              <Button component={Link} href="/pricing" variant="outlined" size="large" sx={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", fontWeight: 600, px: 4, py: 1.5, borderRadius: 2, fontSize: "1rem", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}>
                View Pricing
              </Button>
            </Stack>
          </motion.div>
        </Container>
        {/* Background decoration */}
        <Box sx={{ position: "absolute", top: "20%", left: "-10%", width: 400, height: 400, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.05)", filter: "blur(80px)" }} />
        <Box sx={{ position: "absolute", bottom: "-20%", right: "-5%", width: 500, height: 500, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.03)", filter: "blur(100px)" }} />
      </Box>

      {/* Features */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: "#fafafa" }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, fontWeight: 800, textAlign: "center", mb: 1, letterSpacing: "-0.02em" }}>
              Everything you need to grow
            </Typography>
            <Typography sx={{ textAlign: "center", color: "#6b7280", mb: 6, maxWidth: 500, mx: "auto" }}>
              From booking to payments — one platform that handles it all so you can focus on your craft.
            </Typography>
          </AnimatedSection>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
            <Grid container spacing={3}>
              {FEATURES.map((feature, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <motion.div variants={fadeUp}>
                    <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, height: "100%", border: "1px solid #e5e7eb", transition: "transform 0.3s, box-shadow 0.3s", "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 40px rgba(0,0,0,0.08)" } }}>
                      <Typography sx={{ fontSize: "2rem", mb: 1.5 }}>{feature.icon}</Typography>
                      <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, mb: 0.75 }}>{feature.title}</Typography>
                      <Typography sx={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.6 }}>{feature.description}</Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* How It Works */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <AnimatedSection>
            <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, fontWeight: 800, textAlign: "center", mb: 1, letterSpacing: "-0.02em" }}>
              Up and running in minutes
            </Typography>
            <Typography sx={{ textAlign: "center", color: "#6b7280", mb: 6 }}>
              Three simple steps to start accepting bookings online.
            </Typography>
          </AnimatedSection>

          <Stack spacing={5}>
            {STEPS.map((step, i) => (
              <AnimatedSection key={i} variants={i % 2 === 0 ? slideLeft : slideRight}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center">
                  <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#667eea", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 800, flexShrink: 0 }}>
                    {i + 1}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 0.5 }}>{step.title}</Typography>
                    <Typography sx={{ color: "#6b7280", lineHeight: 1.6 }}>{step.description}</Typography>
                  </Box>
                </Stack>
              </AnimatedSection>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Stats */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: "#1a1a2e", color: "#fff" }}>
        <Container maxWidth="md">
          <AnimatedSection variants={scaleIn}>
            <Grid container spacing={4} textAlign="center">
              {STATS.map((stat, i) => (
                <Grid key={i} size={{ xs: 6, md: 3 }}>
                  <Typography sx={{ fontSize: { xs: "2rem", md: "2.5rem" }, fontWeight: 800 }}>{stat.value}</Typography>
                  <Typography sx={{ fontSize: "0.8125rem", opacity: 0.7, mt: 0.5 }}>{stat.label}</Typography>
                </Grid>
              ))}
            </Grid>
          </AnimatedSection>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: { xs: 8, md: 12 }, textAlign: "center" }}>
        <Container maxWidth="sm">
          <AnimatedSection>
            <Typography component="h2" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" }, fontWeight: 800, mb: 2, letterSpacing: "-0.02em" }}>
              Ready to simplify your scheduling?
            </Typography>
            <Typography sx={{ color: "#6b7280", mb: 4, lineHeight: 1.6 }}>
              Join thousands of businesses that trust Get Slot for their daily operations. No credit card required.
            </Typography>
            <Button component={Link} href="/register" variant="contained" size="large" sx={{ fontWeight: 700, px: 5, py: 1.5, borderRadius: 2, fontSize: "1rem", background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              Get Started Free
            </Button>
          </AnimatedSection>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
        <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>
          &copy; {new Date().getFullYear()} Get Slot. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "📅", title: "Smart Scheduling", description: "Intelligent availability that prevents double bookings and handles timezone differences automatically." },
  { icon: "💳", title: "Integrated Payments", description: "Accept payments online or at your business. Gift cards, packages, and discounts built in." },
  { icon: "🔄", title: "Recurring Appointments", description: "Set up weekly, monthly, or custom recurring schedules for regular clients with one click." },
  { icon: "🎁", title: "Gift Cards & Packages", description: "Sell gift cards and service packages directly from your booking page. Track redemptions automatically." },
  { icon: "📱", title: "Mobile-First Booking", description: "Beautiful booking experience that works perfectly on any device. Your clients book in seconds." },
  { icon: "📊", title: "Business Analytics", description: "Understand your business with real-time dashboards. Track revenue, bookings, and client retention." },
  { icon: "👥", title: "Team Management", description: "Manage staff schedules, assign resources, and let clients choose their preferred provider." },
  { icon: "🔔", title: "Smart Notifications", description: "Automated confirmations, reminders, and follow-ups. Reduce no-shows by up to 80%." },
  { icon: "🌐", title: "Public Business Page", description: "Professional online presence with reviews, gallery, services, and integrated booking — no website needed." },
];

const STEPS = [
  { title: "Create your business", description: "Sign up in 30 seconds. Add your services, set your hours, and configure your brand. No technical skills needed." },
  { title: "Share your booking link", description: "Send your unique booking URL to clients, embed it on your website, or add it to your social profiles." },
  { title: "Start accepting bookings", description: "Clients self-schedule at their convenience. You manage everything from one clean dashboard." },
];

const STATS = [
  { value: "99.9%", label: "Uptime" },
  { value: "50k+", label: "Bookings processed" },
  { value: "< 3s", label: "Average load time" },
  { value: "4.9★", label: "Customer rating" },
];
