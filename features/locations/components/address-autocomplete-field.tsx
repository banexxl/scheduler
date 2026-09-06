"use client";

import { useEffect, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import { loadGoogleMaps } from "../utils/load-google-maps";

export type ParsedAddress = {
     streetAddress: string;
     city: string;
     provinceState: string;
     country: string;
     postalCode: string;
};

type AddressAutocompleteFieldProps = {
     /** Current street address value (controlled by the form). */
     value: string;
     /** Fired on every keystroke so the form stays in sync. */
     onChange: (value: string) => void;
     /** Fired when the user selects a suggestion; provides parsed components. */
     onPlaceSelected: (address: ParsedAddress) => void;
     onBlur?: React.FocusEventHandler<HTMLInputElement>;
     name?: string;
     disabled?: boolean;
     error?: boolean;
     helperText?: React.ReactNode;
};

type AddressComponent = {
     long_name: string;
     short_name: string;
     types: string[];
};

function parsePlace(components: AddressComponent[]): ParsedAddress {
     const get = (type: string, useShort = false): string => {
          const match = components.find((c) => c.types.includes(type));
          if (!match) return "";
          return useShort ? match.short_name : match.long_name;
     };

     const streetNumber = get("street_number");
     const route = get("route");
     const streetAddress = [streetNumber, route].filter(Boolean).join(" ").trim();

     const city =
          get("locality") ||
          get("postal_town") ||
          get("sublocality") ||
          get("administrative_area_level_2");

     return {
          streetAddress,
          city,
          provinceState: get("administrative_area_level_1"),
          country: get("country"),
          postalCode: get("postal_code"),
     };
}

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
     const inputRef = useRef<HTMLInputElement | null>(null);
     const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
     const onPlaceSelectedRef = useRef(onPlaceSelected);
     const onChangeRef = useRef(onChange);
     const [loadFailed, setLoadFailed] = useState(false);

     // Keep the latest callbacks without re-running the effect.
     onPlaceSelectedRef.current = onPlaceSelected;
     onChangeRef.current = onChange;

     useEffect(() => {
          let cancelled = false;
          let listener: google.maps.MapsEventListener | null = null;

          if (!inputRef.current) return;

          loadGoogleMaps()
               .then((google) => {
                    if (cancelled || !inputRef.current) return;

                    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
                         types: ["address"],
                         fields: ["address_components", "formatted_address"],
                    });
                    autocompleteRef.current = autocomplete;

                    listener = autocomplete.addListener("place_changed", () => {
                         const place = autocomplete.getPlace();
                         if (!place.address_components) return;

                         const parsed = parsePlace(place.address_components as AddressComponent[]);
                         // Sync the visible input with the resolved street address.
                         onChangeRef.current(parsed.streetAddress || place.formatted_address || "");
                         onPlaceSelectedRef.current(parsed);
                    });
               })
               .catch(() => {
                    if (!cancelled) setLoadFailed(true);
               });

          return () => {
               cancelled = true;
               if (listener) listener.remove();
               // Remove the Google-injected dropdown containers to avoid leaks.
               document
                    .querySelectorAll(".pac-container")
                    .forEach((el) => el.remove());
          };
     }, []);

     return (
          <TextField
               name={name}
               value={value}
               onChange={(e) => onChange(e.target.value)}
               onBlur={onBlur}
               inputRef={inputRef}
               label="Street Address"
               placeholder="Start typing an address…"
               fullWidth
               margin="dense"
               disabled={disabled}
               error={error}
               helperText={
                    loadFailed
                         ? "Address suggestions unavailable — you can type the address manually."
                         : helperText
               }
               autoComplete="off"
               slotProps={{ htmlInput: { autoComplete: "off" } }}
          />
     );
}
