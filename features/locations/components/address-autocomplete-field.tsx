"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { loadGoogleMaps } from "../utils/load-google-maps";

export type ParsedAddress = {
     streetAddress: string;
     city: string;
     provinceState: string;
     country: string;
     postalCode: string;
     latitude: number | null;
     longitude: number | null;
};

type AddressAutocompleteFieldProps = {
     /** Current street address value (controlled by the form). */
     value: string;
     /** Fired on every keystroke (manual fallback) so the form stays in sync. */
     onChange: (value: string) => void;
     /** Fired when the user selects a suggestion; provides parsed components. */
     onPlaceSelected: (address: ParsedAddress) => void;
     onBlur?: React.FocusEventHandler<HTMLInputElement>;
     name?: string;
     disabled?: boolean;
     error?: boolean;
     helperText?: React.ReactNode;
};

/** Reads a single address component's text by type from the new Places API. */
function componentText(
     components: google.maps.places.AddressComponent[] | undefined,
     type: string
): string {
     if (!components) return "";
     const match = components.find((c) => c.types.includes(type));
     return match?.longText ?? "";
}

function parsePlace(place: google.maps.places.Place): ParsedAddress {
     const components = place.addressComponents;

     const streetNumber = componentText(components, "street_number");
     const route = componentText(components, "route");
     const streetAddress = [streetNumber, route].filter(Boolean).join(" ").trim();

     const city =
          componentText(components, "locality") ||
          componentText(components, "postal_town") ||
          componentText(components, "sublocality") ||
          componentText(components, "administrative_area_level_2");

     const location = place.location;

     return {
          streetAddress,
          city,
          provinceState: componentText(components, "administrative_area_level_1"),
          country: componentText(components, "country"),
          postalCode: componentText(components, "postal_code"),
          latitude: location ? location.lat() : null,
          longitude: location ? location.lng() : null,
     };
}

/**
 * Address search backed by the modern Google Places `PlaceAutocompleteElement`.
 *
 * The legacy `google.maps.places.Autocomplete` widget is deprecated and is not
 * available to Google Maps customers created after March 1, 2025, so we use the
 * recommended web-component replacement. When the element cannot load, we fall
 * back to a plain MUI text field for manual entry.
 */
export default function AddressAutocompleteField({
     value,
     onChange,
     onPlaceSelected,
     onBlur,
     name,
     disabled,
     error,
     helperText,
}: AddressAutocompleteFieldProps) {
     const theme = useTheme();
     const containerRef = useRef<HTMLDivElement | null>(null);
     const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
     const onPlaceSelectedRef = useRef(onPlaceSelected);
     const onChangeRef = useRef(onChange);
     const [loadFailed, setLoadFailed] = useState(false);

     // Keep the latest callbacks without re-running the mount effect.
     useEffect(() => {
          onPlaceSelectedRef.current = onPlaceSelected;
          onChangeRef.current = onChange;
     });

     useEffect(() => {
          let cancelled = false;
          const container = containerRef.current;
          let element: google.maps.places.PlaceAutocompleteElement | null = null;
          const handleSelect = async (event: Event) => {
               const prediction = (event as google.maps.places.PlacePredictionSelectEvent)
                    .placePrediction;
               if (!prediction) return;

               const place = prediction.toPlace();
               await place.fetchFields({
                    fields: ["addressComponents", "formattedAddress", "location"],
               });

               const parsed = parsePlace(place);
               onChangeRef.current(parsed.streetAddress || place.formattedAddress || "");
               onPlaceSelectedRef.current(parsed);
          };

          if (!container) return;

          loadGoogleMaps()
               .then((google) => {
                    if (cancelled || !container) return;

                    element = new google.maps.places.PlaceAutocompleteElement({
                         includedPrimaryTypes: ["street_address", "premise", "subpremise"],
                    });
                    element.style.width = "100%";
                    elementRef.current = element;

                    element.addEventListener("gmp-select", handleSelect);
                    container.appendChild(element);
               })
               .catch(() => {
                    if (!cancelled) setLoadFailed(true);
               });

          return () => {
               cancelled = true;
               if (element) {
                    element.removeEventListener("gmp-select", handleSelect);
                    element.remove();
               }
               elementRef.current = null;
          };
     }, []);

     // Fallback: manual entry when the Places element is unavailable.
     if (loadFailed) {
          return (
               <TextField
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    label="Street Address"
                    placeholder="Enter the street address"
                    fullWidth
                    margin="dense"
                    disabled={disabled}
                    error={error}
                    helperText="Address suggestions unavailable — you can type the address manually."
                    autoComplete="off"
                    slotProps={{ htmlInput: { autoComplete: "off" } }}
               />
          );
     }

     return (
          <Box sx={{ mt: 1, mb: 0.5 }}>
               <Typography
                    variant="caption"
                    component="label"
                    sx={{ display: "block", color: error ? "error.main" : "text.secondary", mb: 0.5 }}
               >
                    Street Address
               </Typography>
               <Box
                    ref={containerRef}
                    aria-disabled={disabled}
                    sx={{
                         // Style the injected web component to match MUI inputs.
                         "& gmp-place-autocomplete": {
                              width: "100%",
                              "--gmp-mat-color-surface": theme.palette.background.paper,
                              "--gmp-mat-color-on-surface": theme.palette.text.primary,
                              "--gmp-mat-color-outline": error
                                   ? theme.palette.error.main
                                   : theme.palette.divider,
                              "--gmp-mat-color-primary": theme.palette.primary.main,
                         },
                         pointerEvents: disabled ? "none" : "auto",
                         opacity: disabled ? 0.5 : 1,
                    }}
               />
               {helperText && (
                    <Typography
                         variant="caption"
                         sx={{ display: "block", color: error ? "error.main" : "text.secondary", mt: 0.5, mx: "14px" }}
                    >
                         {helperText}
                    </Typography>
               )}
          </Box>
     );
}
