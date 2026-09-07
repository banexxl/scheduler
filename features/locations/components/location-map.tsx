"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { loadGoogleMaps } from "../utils/load-google-maps";
import { getGoogleMapId } from "../utils/google-maps-config";

type LocationMapProps = {
     /** Latitude of the marker. Shows a warning instead of the map when null/undefined. */
     latitude: number | null | undefined;
     /** Longitude of the marker. Shows a warning instead of the map when null/undefined. */
     longitude: number | null | undefined;
     /** Zoom level (default 15 — street level). */
     zoom?: number;
     /** Height of the map container. */
     height?: number;
};

/**
 * Read-only Google Map that renders a single marker at the given coordinates.
 *
 * Shows a warning instead when coordinates are missing — without them this
 * location won't get a marker on the public booking map either. Reuses the
 * shared Google Maps loader (Places library already includes the Maps
 * core). No extra API calls — coordinates are captured at address-selection
 * time and stored on the location.
 */
export default function LocationMap({
     latitude,
     longitude,
     zoom = 15,
     height = 220,
}: LocationMapProps) {
     const mapRef = useRef<HTMLDivElement | null>(null);
     const mapInstanceRef = useRef<google.maps.Map | null>(null);
     const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
     const [loadFailed, setLoadFailed] = useState(false);

     const hasCoords =
          typeof latitude === "number" &&
          typeof longitude === "number" &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude);

     useEffect(() => {
          if (!hasCoords || !mapRef.current) return;

          let cancelled = false;
          const position = { lat: latitude as number, lng: longitude as number };

          loadGoogleMaps()
               .then((google) => {
                    if (cancelled || !mapRef.current) return;

                    if (!mapInstanceRef.current) {
                         mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                              center: position,
                              zoom,
                              disableDefaultUI: true,
                              zoomControl: true,
                              gestureHandling: "cooperative",
                              clickableIcons: false,
                              mapId: getGoogleMapId(),
                         });
                         markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                              position,
                              map: mapInstanceRef.current,
                         });
                    } else {
                         mapInstanceRef.current.setCenter(position);
                         mapInstanceRef.current.setZoom(zoom);
                         if (markerRef.current) {
                              markerRef.current.position = position;
                         }
                    }
               })
               .catch(() => {
                    if (!cancelled) setLoadFailed(true);
               });

          return () => {
               cancelled = true;
          };
     }, [hasCoords, latitude, longitude, zoom]);

     if (!hasCoords) {
          return (
               <Alert severity="warning" sx={{ mt: 1.5 }}>
                    No coordinates set for this address — it won&apos;t appear on the
                    public booking map. Re-select the address from the autocomplete
                    suggestions to geocode it.
               </Alert>
          );
     }

     if (loadFailed) {
          return (
               <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Map preview unavailable.
               </Typography>
          );
     }

     return (
          <Box
               ref={mapRef}
               sx={{
                    mt: 1.5,
                    height,
                    width: "100%",
                    borderRadius: 1,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
               }}
          />
     );
}
