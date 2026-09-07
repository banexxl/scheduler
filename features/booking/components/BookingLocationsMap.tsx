"use client";

/**
 * Booking Locations Map — renders the tenant's bookable locations as markers
 * on a read-only Google Map, shown below the location cards.
 *
 * Reuses the shared Google Maps loader (the Places library bundle also includes
 * the Maps core). No extra API calls — coordinates are stored on each location.
 * Renders nothing when no location has coordinates.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { loadGoogleMaps } from "@/features/locations/utils/load-google-maps";
import { getGoogleMapId } from "@/features/locations/utils/google-maps-config";

/** Minimal shape needed to plot a location marker. */
export type MapLocation = {
     id: string;
     name: string;
     latitude: number | null;
     longitude: number | null;
};

type Props = {
     locations: MapLocation[];
     /** Currently selected location id — its marker is emphasised and centred. */
     selectedId?: string | null;
     /** Called when a marker is clicked. */
     onSelect?: (locationId: string) => void;
     height?: number;
};

type MappableLocation = MapLocation & { latitude: number; longitude: number };

/**
 * Dark map styling to match the booking page's glass/dark surface.
 *
 * NOTE: Advanced Markers require a Map ID, and once a Map ID is set the Maps API
 * ignores inline JSON `styles`. To preserve this dark theme, recreate these
 * rules as cloud-based map styling and associate them with the Map ID
 * (`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`) in the Google Cloud console.
 */

function hasCoords(loc: MapLocation): loc is MappableLocation {
     return (
          typeof loc.latitude === "number" &&
          typeof loc.longitude === "number" &&
          Number.isFinite(loc.latitude) &&
          Number.isFinite(loc.longitude)
     );
}

export default function BookingLocationsMap({
     locations,
     selectedId,
     onSelect,
     height = 280,
}: Props) {
     const mapRef = useRef<HTMLDivElement | null>(null);
     const mapInstanceRef = useRef<google.maps.Map | null>(null);
     const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(
          new Map()
     );
     const [loadFailed, setLoadFailed] = useState(false);

     const mappable = useMemo(() => locations.filter(hasCoords), [locations]);

     useEffect(() => {
          if (mappable.length === 0 || !mapRef.current) return;

          let cancelled = false;

          loadGoogleMaps()
               .then((google) => {
                    if (cancelled || !mapRef.current) return;

                    if (!mapInstanceRef.current) {
                         mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                              disableDefaultUI: true,
                              zoomControl: true,
                              gestureHandling: "cooperative",
                              clickableIcons: false,
                              backgroundColor: "#1d1d27",
                              // Advanced Markers require a Map ID. Note: inline
                              // `styles` are ignored once a Map ID is set — the dark
                              // theme must be configured as cloud-based styling on
                              // the Map ID in the Google Cloud console.
                              mapId: getGoogleMapId(),
                         });
                    }

                    const map = mapInstanceRef.current;
                    const bounds = new google.maps.LatLngBounds();

                    // Remove markers for locations that no longer exist.
                    for (const [id, marker] of markersRef.current) {
                         if (!mappable.some((loc) => loc.id === id)) {
                              marker.map = null;
                              markersRef.current.delete(id);
                         }
                    }

                    for (const loc of mappable) {
                         const position = { lat: loc.latitude, lng: loc.longitude };
                         bounds.extend(position);

                         let marker = markersRef.current.get(loc.id);
                         if (!marker) {
                              marker = new google.maps.marker.AdvancedMarkerElement({
                                   position,
                                   map,
                                   title: loc.name,
                              });
                              if (onSelect) {
                                   marker.addListener("gmp-click", () => onSelect(loc.id));
                              }
                              markersRef.current.set(loc.id, marker);
                         } else {
                              marker.position = position;
                         }
                         marker.zIndex = loc.id === selectedId ? 1000 : undefined;
                    }

                    // Frame the markers.
                    if (mappable.length === 1) {
                         const only = mappable[0]!;
                         map.setCenter({ lat: only.latitude, lng: only.longitude });
                         map.setZoom(15);
                    } else {
                         map.fitBounds(bounds, 48);
                    }
               })
               .catch(() => {
                    if (!cancelled) setLoadFailed(true);
               });

          return () => {
               cancelled = true;
          };
     }, [mappable, selectedId, onSelect]);

     // Recentre on the selected marker without refitting everything.
     useEffect(() => {
          if (!selectedId || !mapInstanceRef.current) return;
          const selected = mappable.find((loc) => loc.id === selectedId);
          if (selected) {
               mapInstanceRef.current.panTo({ lat: selected.latitude, lng: selected.longitude });
          }
     }, [selectedId, mappable]);

     if (mappable.length === 0) return null;

     if (loadFailed) {
          return (
               <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 2 }}
               >
                    Map preview unavailable.
               </Typography>
          );
     }

     return (
          <Box
               ref={mapRef}
               role="img"
               aria-label="Map showing business locations"
               sx={{
                    mt: 2,
                    height,
                    width: "100%",
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.06)",
                    bgcolor: "#1d1d27",
               }}
          />
     );
}
