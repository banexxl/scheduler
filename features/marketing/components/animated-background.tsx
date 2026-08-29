"use client";

/**
 * Animated Background — CSS-only gradient mesh with floating orbs.
 *
 * No canvas, no images. Pure CSS animations for performance.
 * Uses @keyframes for smooth orbiting gradients and framer-motion
 * for parallax depth on scroll.
 *
 * Respects prefers-reduced-motion automatically via CSS.
 */

import Box from "@mui/material/Box";
import { motion, useScroll, useTransform } from "framer-motion";

// Keyframes injected via style tag for CSS animations
const KEYFRAMES = `
@keyframes orb-float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(80px, -120px) scale(1.1); }
  50% { transform: translate(-60px, -200px) scale(0.95); }
  75% { transform: translate(120px, -80px) scale(1.05); }
}
@keyframes orb-float-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(-100px, 80px) scale(1.08); }
  50% { transform: translate(70px, 150px) scale(0.92); }
  75% { transform: translate(-50px, -60px) scale(1.03); }
}
@keyframes orb-float-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(150px, -50px) scale(1.12); }
  66% { transform: translate(-80px, 100px) scale(0.88); }
}
@keyframes mesh-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
@media (prefers-reduced-motion: reduce) {
  .orb-animated { animation: none !important; }
}
`;

type Props = {
  /** Which variant to render */
  variant?: "hero" | "section" | "full";
  /** Override height */
  height?: string;
};

export default function AnimatedBackground({ variant = "hero", height }: Props) {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, -150]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -80]);
  const y3 = useTransform(scrollY, [0, 1000], [0, -200]);

  const resolvedHeight = height ?? (variant === "hero" ? "100vh" : variant === "full" ? "100%" : "600px");

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        height: resolvedHeight,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Base gradient mesh — slow rotation */}
      <Box
        sx={{
          position: "absolute",
          inset: "-50%",
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)
          `,
          animation: "mesh-rotate 120s linear infinite",
        }}
        className="orb-animated"
      />

      {/* Orb 1 — Large violet, top-left */}
      <motion.div style={{ y: y1, position: "absolute", top: "10%", left: "15%", width: "clamp(300px, 40vw, 600px)", height: "clamp(300px, 40vw, 600px)" }}>
        <Box
          className="orb-animated"
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.05) 40%, transparent 70%)",
            filter: "blur(60px)",
            animation: "orb-float-1 20s ease-in-out infinite",
          }}
        />
      </motion.div>

      {/* Orb 2 — Blue-purple, right side */}
      <motion.div style={{ y: y2, position: "absolute", top: "30%", right: "10%", width: "clamp(250px, 35vw, 500px)", height: "clamp(250px, 35vw, 500px)" }}>
        <Box
          className="orb-animated"
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
            filter: "blur(50px)",
            animation: "orb-float-2 25s ease-in-out infinite",
          }}
        />
      </motion.div>

      {/* Orb 3 — Small accent, bottom center */}
      <motion.div style={{ y: y3, position: "absolute", bottom: "15%", left: "40%", width: "clamp(200px, 25vw, 400px)", height: "clamp(200px, 25vw, 400px)" }}>
        <Box
          className="orb-animated"
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.03) 40%, transparent 70%)",
            filter: "blur(40px)",
            animation: "orb-float-3 18s ease-in-out infinite",
          }}
        />
      </motion.div>

      {/* Grid lines overlay — very subtle */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* Noise texture overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Top-down fade for content readability */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "30%",
          background: "linear-gradient(to bottom, transparent, #0a0a0f)",
        }}
      />
    </Box>
  );
}

/**
 * Section Glow — A simpler accent glow for individual sections.
 */
export function SectionGlow({ color = "rgba(124, 58, 237, 0.1)", position = "center" }: { color?: string; position?: "left" | "center" | "right" }) {
  const posX = position === "left" ? "20%" : position === "right" ? "80%" : "50%";

  return (
    <Box
      className="orb-animated"
      sx={{
        position: "absolute",
        top: "50%",
        left: posX,
        transform: "translate(-50%, -50%)",
        width: "clamp(300px, 50vw, 800px)",
        height: "clamp(300px, 50vw, 800px)",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(80px)",
        pointerEvents: "none",
        zIndex: 0,
        animation: "pulse-glow 8s ease-in-out infinite",
      }}
    />
  );
}
