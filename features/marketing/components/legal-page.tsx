"use client";

/**
 * Legal Page — Shared layout for Privacy Policy & Terms of Service.
 *
 * Matches the premium dark SaaS design used across the marketing site:
 * - Dark background (#0a0a0f) with a SectionGlow accent
 * - Purple gradient accents (#7C3AED / #a78bfa)
 * - framer-motion staggered fade-up entrance
 * - A sticky in-page table of contents on large screens
 *
 * Content is fully data-driven via the `LegalDocument` model so both the
 * Privacy Policy and Terms of Service pages can reuse this single component.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import { SectionGlow } from "./animated-background";

// ─── Content model ───────────────────────────────────────────────────────────

/** A paragraph, a bullet list, or a small sub-heading inside a section. */
export type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; text: string };

export type LegalSection = {
  /** Stable slug used for the anchor id + table-of-contents link. */
  id: string;
  /** Section heading text (e.g. "1. Information We Collect"). */
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  /** Small eyebrow label above the title (e.g. "Legal"). */
  eyebrow: string;
  title: string;
  /** Human-readable effective date, e.g. "September 1, 2026". */
  effectiveDate: string;
  /** Short intro paragraph shown under the title. */
  intro: string;
  sections: LegalSection[];
  /** Optional closing contact block. */
  contact?: {
    heading: string;
    text: string;
    email: string;
  };
};

type Props = {
  doc: LegalDocument;
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ─── Block renderer ──────────────────────────────────────────────────────────

function Block({ block }: { block: LegalBlock }) {
  if (block.type === "subheading") {
    return (
      <Typography
        sx={{
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "#e6e6ee",
          mt: 2.5,
          mb: 1,
        }}
      >
        {block.text}
      </Typography>
    );
  }

  if (block.type === "list") {
    return (
      <Stack component="ul" spacing={1.25} sx={{ listStyle: "none", p: 0, m: 0, mb: 1.5 }}>
        {block.items.map((item, i) => (
          <Stack key={i} component="li" direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              aria-hidden
              sx={{
                mt: "8px",
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7C3AED, #a78bfa)",
              }}
            />
            <Typography sx={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "#c4c4d4" }}>
              {item}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  }

  return (
    <Typography sx={{ fontSize: "0.9375rem", lineHeight: 1.8, color: "#c4c4d4", mb: 1.75 }}>
      {block.text}
    </Typography>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LegalPage({ doc }: Props) {
  const toc = useMemo(
    () => doc.sections.map((s) => ({ id: s.id, heading: s.heading })),
    [doc.sections]
  );

  return (
    <Box sx={{ minHeight: "100vh", pt: { xs: 14, md: 18 }, pb: 12, bgcolor: "#0a0a0f", position: "relative" }}>
      <SectionGlow color="rgba(124, 58, 237, 0.06)" position="right" />
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
          {/* Header */}
          <motion.div custom={0} variants={fadeUp}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#7C3AED",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                mb: 2,
              }}
            >
              {doc.eyebrow}
            </Typography>
          </motion.div>

          <motion.div custom={1} variants={fadeUp}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "2rem", md: "3rem" },
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#f0f0f5",
                mb: 1.5,
              }}
            >
              {doc.title}
            </Typography>
          </motion.div>

          <motion.div custom={2} variants={fadeUp}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.5,
                py: 0.5,
                mb: 3,
                borderRadius: 1.5,
                bgcolor: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#a78bfa" }}>
                Effective {doc.effectiveDate}
              </Typography>
            </Box>
          </motion.div>

          <motion.div custom={3} variants={fadeUp}>
            <Typography sx={{ fontSize: "1rem", lineHeight: 1.8, color: "#8b8b9e", maxWidth: 760, mb: 6 }}>
              {doc.intro}
            </Typography>
          </motion.div>

          <Grid container spacing={6}>
            {/* Table of contents — sticky on desktop */}
            <Grid size={{ xs: 12, md: 3 }} sx={{ display: { xs: "none", md: "block" } }}>
              <motion.div custom={4} variants={fadeUp}>
                <Box sx={{ position: "sticky", top: 110 }}>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#5c5c72",
                      mb: 1.5,
                    }}
                  >
                    On this page
                  </Typography>
                  <Stack spacing={0.5}>
                    {toc.map((item) => (
                      <Box
                        key={item.id}
                        component="a"
                        href={`#${item.id}`}
                        sx={{
                          fontSize: "0.8125rem",
                          lineHeight: 1.5,
                          color: "#8b8b9e",
                          textDecoration: "none",
                          py: 0.5,
                          borderLeft: "2px solid transparent",
                          pl: 1.5,
                          transition: "color 0.2s, border-color 0.2s",
                          "&:hover": { color: "#a78bfa", borderColor: "rgba(124,58,237,0.5)" },
                        }}
                      >
                        {item.heading}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </motion.div>
            </Grid>

            {/* Body */}
            <Grid size={{ xs: 12, md: 9 }}>
              <Stack spacing={4}>
                {doc.sections.map((section, i) => (
                  <motion.div key={section.id} custom={5 + i} variants={fadeUp}>
                    <Box
                      id={section.id}
                      sx={{
                        scrollMarginTop: 110,
                        p: { xs: 3, md: 4 },
                        borderRadius: 3,
                        bgcolor: "rgba(22, 22, 30, 0.5)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        backdropFilter: "blur(12px)",
                        position: "relative",
                        overflow: "hidden",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "1px",
                          background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)",
                        },
                      }}
                    >
                      <Typography
                        component="h2"
                        sx={{
                          fontSize: { xs: "1.25rem", md: "1.4rem" },
                          fontWeight: 700,
                          color: "#f0f0f5",
                          mb: 2,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {section.heading}
                      </Typography>
                      {section.blocks.map((block, bi) => (
                        <Block key={bi} block={block} />
                      ))}
                    </Box>
                  </motion.div>
                ))}

                {/* Contact block */}
                {doc.contact && (
                  <motion.div custom={5 + doc.sections.length} variants={fadeUp}>
                    <Box
                      sx={{
                        p: { xs: 3, md: 4 },
                        borderRadius: 3,
                        bgcolor: "rgba(124,58,237,0.08)",
                        border: "1px solid rgba(124,58,237,0.25)",
                        textAlign: "center",
                      }}
                    >
                      <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#f0f0f5", mb: 1 }}>
                        {doc.contact.heading}
                      </Typography>
                      <Typography sx={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "#c4c4d4", mb: 2, maxWidth: 560, mx: "auto" }}>
                        {doc.contact.text}
                      </Typography>
                      <Box
                        component="a"
                        href={`mailto:${doc.contact.email}`}
                        sx={{
                          display: "inline-block",
                          fontSize: "0.9375rem",
                          fontWeight: 600,
                          color: "#a78bfa",
                          textDecoration: "none",
                          "&:hover": { color: "#c4b5fd", textDecoration: "underline" },
                        }}
                      >
                        {doc.contact.email}
                      </Box>
                    </Box>
                  </motion.div>
                )}

                {/* Cross-link between legal docs */}
                <motion.div custom={6 + doc.sections.length} variants={fadeUp}>
                  <Stack
                    direction="row"
                    spacing={3}
                    justifyContent="center"
                    sx={{ pt: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Link href="/privacy-policy" style={{ fontSize: "0.8125rem", color: "#5c5c72", textDecoration: "none" }}>
                      Privacy Policy
                    </Link>
                    <Link href="/terms-of-service" style={{ fontSize: "0.8125rem", color: "#5c5c72", textDecoration: "none" }}>
                      Terms of Service
                    </Link>
                    <Link href="/" style={{ fontSize: "0.8125rem", color: "#5c5c72", textDecoration: "none" }}>
                      Home
                    </Link>
                  </Stack>
                </motion.div>
              </Stack>
            </Grid>
          </Grid>
        </motion.div>
      </Container>
    </Box>
  );
}
