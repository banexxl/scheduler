import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest.
 *
 * Next.js serves this at /manifest.webmanifest and auto-links it in <head>.
 * Enables the browser install prompt (Chrome "Install app" / beforeinstallprompt)
 * and controls the installed shortcut's name and icon.
 *
 * Icons are generated from public/logos/getslot_icon.svg.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GetSlot Scheduler",
    short_name: "GetSlot",
    description: "SaaS scheduling platform dashboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0F1A",
    theme_color: "#8B5CF6",
    icons: [
      {
        src: "/logos/getslot_192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logos/getslot_512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logos/getslot_maskable_512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
