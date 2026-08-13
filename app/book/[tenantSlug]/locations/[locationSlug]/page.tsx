import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";

/**
 * Public Location Detail Page — Milestone 15.13.
 *
 * Shows location info, working hours, services, and booking CTA.
 * Route: /book/{tenantSlug}/locations/{locationSlug}
 *
 * Does NOT expose: internal scheduling metadata, resource schedules.
 */

type Params = { tenantSlug: string; locationSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { tenantSlug, locationSlug } = await params;
  const data = await loadLocationDetail(tenantSlug, locationSlug);
  if (!data) return { title: "Location Not Found" };

  const address = [data.location.streetAddress, data.location.city].filter(Boolean).join(", ");
  return {
    title: `${data.location.name} — ${data.tenantName}`,
    description: data.location.description || `Visit ${data.location.name}${address ? ` at ${address}` : ""}`,
    openGraph: {
      title: `${data.location.name} — ${data.tenantName}`,
      description: data.location.description || address || `Location of ${data.tenantName}`,
      type: "website",
    },
  };
}

export default async function LocationDetailPage({ params }: { params: Promise<Params> }) {
  const { tenantSlug, locationSlug } = await params;
  const data = await loadLocationDetail(tenantSlug, locationSlug);

  if (!data) notFound();

  const { location, hours, services, theme } = data;
  const address = [location.streetAddress, location.city, location.provinceState, location.postalCode, location.country].filter(Boolean).join(", ");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.backgroundColor }}>
      {/* Header */}
      <Box sx={{ bgcolor: theme.primaryColor, color: "#fff", py: 4, px: 3, textAlign: "center" }}>
        <Typography component="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700 }}>
          {location.name}
        </Typography>
        {address && (
          <Typography sx={{ fontSize: "0.9rem", opacity: 0.9, mt: 0.5 }}>{address}</Typography>
        )}
      </Box>

      <Box sx={{ maxWidth: 700, mx: "auto", px: 2, py: 4 }}>
        {/* Description */}
        {location.description && (
          <Typography sx={{ fontSize: "0.9375rem", color: "text.secondary", mb: 3, whiteSpace: "pre-wrap" }}>
            {location.description}
          </Typography>
        )}

        {/* Contact */}
        {(location.phoneNumber || location.email) && (
          <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: `${theme.borderRadius}px` }}>
            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, mb: 1 }}>Contact</Typography>
            <Stack spacing={0.5}>
              {location.phoneNumber && (
                <Typography sx={{ fontSize: "0.875rem" }}>
                  <a href={`tel:${location.phoneNumber}`} style={{ color: "inherit", textDecoration: "none" }}>{location.phoneNumber}</a>
                </Typography>
              )}
              {location.email && (
                <Typography sx={{ fontSize: "0.875rem" }}>
                  <a href={`mailto:${location.email}`} style={{ color: "inherit", textDecoration: "none" }}>{location.email}</a>
                </Typography>
              )}
            </Stack>
          </Paper>
        )}

        {/* Working Hours */}
        {hours.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: `${theme.borderRadius}px` }}>
            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, mb: 1.5 }}>Hours</Typography>
            <Stack spacing={0.75}>
              {hours.map(h => (
                <Box key={h.dayOfWeek} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "0.8125rem" }}>{DAY_NAMES[h.dayOfWeek]}</Typography>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: h.isClosed ? "text.disabled" : "text.primary" }}>
                    {h.isClosed ? "Closed" : `${h.opensAt} – ${h.closesAt}`}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Services at this location */}
        {services.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 1.5 }}>Services</Typography>
            <Stack spacing={1}>
              {services.map(svc => (
                <Paper key={svc.id} variant="outlined" sx={{ p: 2, borderRadius: `${theme.borderRadius}px`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{svc.name}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{svc.durationMinutes} min</Typography>
                  </Box>
                  {Number(svc.price) > 0 && (
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{svc.price} {svc.currency}</Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {/* CTA */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ textAlign: "center" }}>
          <Button
            href={`/book/${tenantSlug}#booking`}
            variant="contained"
            size="large"
            sx={{ borderRadius: `${theme.borderRadius}px`, fontWeight: 700 }}
          >
            Book at {location.name}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Data Loading ────────────────────────────────────────────────────────────

type LocationDetailData = {
  location: {
    name: string; description: string | null;
    streetAddress: string | null; city: string | null; provinceState: string | null;
    postalCode: string | null; country: string | null;
    phoneNumber: string | null; email: string | null;
    latitude: number | null; longitude: number | null;
  };
  tenantName: string;
  hours: Array<{ dayOfWeek: number; isClosed: boolean; opensAt: string; closesAt: string }>;
  services: Array<{ id: string; name: string; durationMinutes: number; price: string; currency: string }>;
  theme: Awaited<ReturnType<typeof resolvePublishedTenantTheme>>;
};

async function loadLocationDetail(tenantSlug: string, locationSlug: string): Promise<LocationDetailData | null> {
  const supabase = createServiceRoleClient();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, status")
    .eq("slug", tenantSlug)
    .single();

  if (!tenantRow || !["active", "trialing"].includes((tenantRow as { status: string }).status)) return null;

  const tenantId = (tenantRow as { id: string }).id;
  const tenantName = (tenantRow as { name: string }).name;

  // Try slug first, then UUID fallback
  let locQuery = supabase
    .from("locations")
    .select("id, name, slug, description, street_address, city, province_state, postal_code, country, phone_number, email, latitude, longitude")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationSlug);
  if (isUuid) {
    locQuery = locQuery.eq("id", locationSlug);
  } else {
    locQuery = locQuery.eq("slug", locationSlug);
  }

  const { data: locRow } = await locQuery.single();
  if (!locRow) return null;

  const loc = locRow as unknown as {
    id: string; name: string; description: string | null;
    street_address: string | null; city: string | null; province_state: string | null;
    postal_code: string | null; country: string | null;
    phone_number: string | null; email: string | null;
    latitude: number | null; longitude: number | null;
  };

  // Working hours
  const { data: hoursRows } = await supabase
    .from("location_working_hours")
    .select("day_of_week, is_closed, opens_at, closes_at")
    .eq("location_id", loc.id)
    .order("day_of_week", { ascending: true });

  const hours = ((hoursRows ?? []) as unknown as Array<{ day_of_week: number; is_closed: boolean; opens_at: string; closes_at: string }>)
    .map(h => ({ dayOfWeek: h.day_of_week, isClosed: h.is_closed, opensAt: h.opens_at, closesAt: h.closes_at }));

  // Services at this location
  const { data: slRows } = await supabase
    .from("service_locations")
    .select("service_id")
    .eq("location_id", loc.id)
    .eq("tenant_id", tenantId);

  const serviceIds = ((slRows ?? []) as unknown as Array<{ service_id: string }>).map(r => r.service_id);
  let services: LocationDetailData["services"] = [];
  if (serviceIds.length > 0) {
    const { data: svcRows } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price, currency")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("id", serviceIds)
      .order("sort_order", { ascending: true })
      .limit(50);

    services = ((svcRows ?? []) as unknown as Array<{ id: string; name: string; duration_minutes: number; price: number; currency: string }>)
      .map(s => ({ id: s.id, name: s.name, durationMinutes: s.duration_minutes, price: String(s.price), currency: s.currency }));
  }

  const theme = await resolvePublishedTenantTheme(tenantId);

  return {
    location: {
      name: loc.name, description: loc.description,
      streetAddress: loc.street_address, city: loc.city, provinceState: loc.province_state,
      postalCode: loc.postal_code, country: loc.country,
      phoneNumber: loc.phone_number, email: loc.email,
      latitude: loc.latitude, longitude: loc.longitude,
    },
    tenantName,
    hours,
    services,
    theme,
  };
}
