"use client";

/**
 * Cookie Consent Banner — shown once per tab on the home page.
 *
 * Uses sessionStorage (not localStorage): sessionStorage is scoped to a
 * single tab and is cleared when that tab closes, but survives normal
 * navigation within the tab. That gives the exact behavior requested —
 * shown once per visit, silent on further navigation in the same tab,
 * shown again if the user opens a new tab.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "next/link";

const SESSION_KEY = "cookie-consent-seen";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reading sessionStorage requires the browser environment, so this can only
    // be resolved after mount — not derivable during render.
    try {
      if (!window.sessionStorage.getItem(SESSION_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
      }
    } catch {
      // sessionStorage unavailable (private mode, etc.) — show the banner anyway
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore — worst case the banner reappears on next navigation
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1400,
            padding: "16px",
          }}
        >
          <Box
            role="dialog"
            aria-live="polite"
            aria-label="Cookie consent"
            sx={{
              maxWidth: 920,
              mx: "auto",
              borderRadius: 3,
              px: { xs: 2.5, sm: 3.5 },
              py: { xs: 2.5, sm: 2.5 },
              bgcolor: "rgba(16, 16, 24, 0.92)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.06)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 3 }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: "#f0f0f5", mb: 0.5 }}>
                  We use cookies
                </Typography>
                <Typography sx={{ fontSize: "0.8125rem", lineHeight: 1.6, color: "#a0a0b8" }}>
                  We use essential cookies to make Get Slot work, and optional cookies to
                  understand how it&apos;s used. See our{" "}
                  <Link href="/privacy-policy" style={{ color: "#a78bfa", textDecoration: "underline" }}>
                    Privacy Policy
                  </Link>{" "}
                  for details.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} flexShrink={0} justifyContent={{ xs: "flex-end", sm: "flex-start" }}>
                <Button
                  onClick={dismiss}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    color: "#a0a0b8",
                    textTransform: "none",
                    "&:hover": { color: "#f0f0f5", bgcolor: "rgba(255,255,255,0.05)" },
                  }}
                >
                  Decline
                </Button>
                <Button
                  onClick={dismiss}
                  variant="contained"
                  size="small"
                  sx={{
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 2.5,
                    textTransform: "none",
                    background: "linear-gradient(135deg, #7C3AED, #a855f7)",
                    boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #6D28D9, #9333ea)",
                      boxShadow: "0 0 30px rgba(124,58,237,0.5)",
                    },
                  }}
                >
                  Accept
                </Button>
              </Stack>
            </Stack>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
