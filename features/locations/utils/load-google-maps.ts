/**
 * Lazily loads the Google Maps JavaScript API with the Places library.
 *
 * The script is loaded once per page and shared across all callers via a
 * module-level promise. Safe to call from multiple components.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. This key is intentionally public
 * (browser-side) and should be restricted by HTTP referrer in Google Cloud.
 */

let loaderPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
     if (typeof window === "undefined") {
          return Promise.reject(new Error("Google Maps can only be loaded in the browser"));
     }

     // Already available.
     if (window.google?.maps?.places) {
          return Promise.resolve(window.google);
     }

     if (loaderPromise) {
          return loaderPromise;
     }

     const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
     if (!apiKey) {
          return Promise.reject(
               new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured")
          );
     }

     loaderPromise = new Promise<typeof google>((resolve, reject) => {
          const callbackName = "__initGoogleMapsPlaces";

          // A previous attempt may have inserted the script already.
          const existing = document.getElementById("google-maps-places-script");
          if (existing) {
               existing.addEventListener("load", () => resolve(window.google));
               existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
               return;
          }

          (window as unknown as Record<string, () => void>)[callbackName] = () => {
               resolve(window.google);
          };

          const params = new URLSearchParams({
               key: apiKey,
               libraries: "places",
               loading: "async",
               callback: callbackName,
          });

          const script = document.createElement("script");
          script.id = "google-maps-places-script";
          script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
          script.async = true;
          script.defer = true;
          script.onerror = () => {
               loaderPromise = null;
               reject(new Error("Failed to load Google Maps"));
          };

          document.head.appendChild(script);
     });

     return loaderPromise;
}
