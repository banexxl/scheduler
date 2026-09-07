/**
 * Shared Google Maps configuration helpers.
 *
 * `AdvancedMarkerElement` (the replacement for the deprecated
 * `google.maps.Marker`) only renders on a map created with a Map ID. A Map ID
 * is created in the Google Cloud console and is safe to expose to the browser.
 *
 * When `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` is not configured we fall back to
 * Google's `DEMO_MAP_ID`, which is intended for development and enables
 * Advanced Markers without cloud-based map styling.
 */

/** The Map ID used for all maps that render Advanced Markers. */
export function getGoogleMapId(): string {
     return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "DEMO_MAP_ID";
}
