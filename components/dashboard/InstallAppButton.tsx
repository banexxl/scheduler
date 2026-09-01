"use client";

/**
 * InstallAppButton — Chrome-style "Install app" shortcut.
 *
 * Uses the PWA `beforeinstallprompt` event. The button only renders when the
 * browser reports the app is installable and the app is not already installed
 * (standalone display mode). Clicking triggers the native install prompt, which
 * creates a desktop/home-screen shortcut using the manifest icon.
 *
 * Browser support note: `beforeinstallprompt` is Chromium-only (Chrome, Edge,
 * Brave, Opera). Safari/Firefox don't fire it, so the button stays hidden there.
 */

import { useCallback, useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop";

/** Minimal shape of the non-standard beforeinstallprompt event. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Props = {
  /** Icon color; defaults to inherit so it adapts to each top bar. */
  color?: string;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari exposes navigator.standalone
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(displayStandalone || iosStandalone);
}

export default function InstallAppButton({ color }: Props) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  // Lazy initializer avoids a synchronous setState inside the effect.
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar so we control when to prompt.
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    // The event can only be used once.
    setPromptEvent(null);
  }, [promptEvent]);

  // Hide entirely when already installed or not installable.
  if (installed || !promptEvent) return null;

  return (
    <Tooltip title="Install app shortcut">
      <IconButton
        size="small"
        aria-label="Install app shortcut"
        onClick={handleInstall}
        sx={{ color: color ?? "inherit" }}
      >
        <InstallDesktopIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
