"use client";

/**
 * Animated Counter — counts up from 0 to target value.
 * Uses framer-motion useMotionValue + useSpring.
 */

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useInView, animate } from "framer-motion";
import Typography from "@mui/material/Typography";

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  sx?: object;
};

export default function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.2,
  sx,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: duration * 1000 });
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, { duration });
    }
  }, [isInView, value, motionValue, duration]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        const formatted = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString();
        ref.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
    return unsubscribe;
  }, [springValue, prefix, suffix, decimals]);

  return (
    <Typography component="span" ref={ref} sx={sx}>
      {prefix}0{suffix}
    </Typography>
  );
}
