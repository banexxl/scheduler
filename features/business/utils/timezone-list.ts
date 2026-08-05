export type TimezoneOption = {
  value: string;
  label: string;
  group: string;
};

/**
 * Curated list of common IANA timezones, grouped by region.
 * The browser-detected timezone is always included even if not in this list.
 */
export const TIMEZONE_LIST: readonly TimezoneOption[] = [
  // Europe
  { value: "Europe/London", label: "London (GMT/BST)", group: "Europe" },
  { value: "Europe/Dublin", label: "Dublin (GMT/IST)", group: "Europe" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)", group: "Europe" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)", group: "Europe" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)", group: "Europe" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)", group: "Europe" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)", group: "Europe" },
  { value: "Europe/Brussels", label: "Brussels (CET/CEST)", group: "Europe" },
  { value: "Europe/Vienna", label: "Vienna (CET/CEST)", group: "Europe" },
  { value: "Europe/Zurich", label: "Zurich (CET/CEST)", group: "Europe" },
  { value: "Europe/Belgrade", label: "Belgrade (CET/CEST)", group: "Europe" },
  { value: "Europe/Zagreb", label: "Zagreb (CET/CEST)", group: "Europe" },
  { value: "Europe/Ljubljana", label: "Ljubljana (CET/CEST)", group: "Europe" },
  { value: "Europe/Sarajevo", label: "Sarajevo (CET/CEST)", group: "Europe" },
  { value: "Europe/Podgorica", label: "Podgorica (CET/CEST)", group: "Europe" },
  { value: "Europe/Skopje", label: "Skopje (CET/CEST)", group: "Europe" },
  { value: "Europe/Warsaw", label: "Warsaw (CET/CEST)", group: "Europe" },
  { value: "Europe/Prague", label: "Prague (CET/CEST)", group: "Europe" },
  { value: "Europe/Budapest", label: "Budapest (CET/CEST)", group: "Europe" },
  { value: "Europe/Bucharest", label: "Bucharest (EET/EEST)", group: "Europe" },
  { value: "Europe/Sofia", label: "Sofia (EET/EEST)", group: "Europe" },
  { value: "Europe/Athens", label: "Athens (EET/EEST)", group: "Europe" },
  { value: "Europe/Helsinki", label: "Helsinki (EET/EEST)", group: "Europe" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)", group: "Europe" },
  { value: "Europe/Moscow", label: "Moscow (MSK)", group: "Europe" },
  { value: "Europe/Lisbon", label: "Lisbon (WET/WEST)", group: "Europe" },
  { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)", group: "Europe" },
  { value: "Europe/Copenhagen", label: "Copenhagen (CET/CEST)", group: "Europe" },
  { value: "Europe/Oslo", label: "Oslo (CET/CEST)", group: "Europe" },

  // Americas
  { value: "America/New_York", label: "New York (ET)", group: "Americas" },
  { value: "America/Chicago", label: "Chicago (CT)", group: "Americas" },
  { value: "America/Denver", label: "Denver (MT)", group: "Americas" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)", group: "Americas" },
  { value: "America/Toronto", label: "Toronto (ET)", group: "Americas" },
  { value: "America/Vancouver", label: "Vancouver (PT)", group: "Americas" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (BRT)", group: "Americas" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)", group: "Americas" },
  { value: "America/Mexico_City", label: "Mexico City (CT)", group: "Americas" },

  // Asia & Pacific
  { value: "Asia/Dubai", label: "Dubai (GST)", group: "Asia & Pacific" },
  { value: "Asia/Kolkata", label: "Kolkata (IST)", group: "Asia & Pacific" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", group: "Asia & Pacific" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", group: "Asia & Pacific" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", group: "Asia & Pacific" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", group: "Asia & Pacific" },
  { value: "Asia/Seoul", label: "Seoul (KST)", group: "Asia & Pacific" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", group: "Asia & Pacific" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)", group: "Asia & Pacific" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", group: "Asia & Pacific" },

  // Africa & Middle East
  { value: "Africa/Cairo", label: "Cairo (EET)", group: "Africa & Middle East" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)", group: "Africa & Middle East" },
  { value: "Africa/Lagos", label: "Lagos (WAT)", group: "Africa & Middle East" },
  { value: "Asia/Jerusalem", label: "Jerusalem (IST/IDT)", group: "Africa & Middle East" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)", group: "Africa & Middle East" },
] as const;

/**
 * Returns the timezone list ensuring the detected browser timezone is included.
 * If the browser timezone is not in the curated list, it's added to the
 * matching region group or to a "Detected" group.
 */
export function getTimezoneListWithDetected(
  detectedTimezone: string
): TimezoneOption[] {
  const list = [...TIMEZONE_LIST];

  const alreadyIncluded = list.some((tz) => tz.value === detectedTimezone);

  if (!alreadyIncluded && detectedTimezone) {
    // Determine group from the timezone identifier
    let group = "Other";
    if (detectedTimezone.startsWith("Europe/")) group = "Europe";
    else if (
      detectedTimezone.startsWith("America/") ||
      detectedTimezone.startsWith("Canada/")
    )
      group = "Americas";
    else if (
      detectedTimezone.startsWith("Asia/") ||
      detectedTimezone.startsWith("Australia/") ||
      detectedTimezone.startsWith("Pacific/")
    )
      group = "Asia & Pacific";
    else if (detectedTimezone.startsWith("Africa/"))
      group = "Africa & Middle East";

    // Extract city name from IANA identifier
    const city = detectedTimezone.split("/").pop()?.replace(/_/g, " ") ?? detectedTimezone;

    list.unshift({
      value: detectedTimezone,
      label: `${city} (detected)`,
      group,
    });
  }

  return list;
}
