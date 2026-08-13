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
 * Public Staff Profile Page — Milestone 15.13.
 *
 * Shows a public team member profile with services and booking CTA.
 * Route: /book/{tenantSlug}/staff/{staffId}
 *
 * Only displays profiles where is_public = true.
 * Does NOT expose: email, phone, member role, internal notes, auth user ID.
 */

type Params = { tenantSlug: string; staffId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { tenantSlug, staffId } = await params;
  const data = await loadStaffDetail(tenantSlug, staffId);
  if (!data) return { title: "Team Member" };

  return {
    title: `${data.profile.displayName} — ${data.tenantName}`,
    description: data.profile.bio || `${data.profile.displayName}${data.profile.jobTitle ? `, ${data.profile.jobTitle}` : ""} at ${data.tenantName}`,
    openGraph: {
      title: `${data.profile.displayName} — ${data.tenantName}`,
      description: data.profile.jobTitle || `Team member at ${data.tenantName}`,
      type: "profile",
    },
  };
}

export default async function StaffDetailPage({ params }: { params: Promise<Params> }) {
  const { tenantSlug, staffId } = await params;
  const data = await loadStaffDetail(tenantSlug, staffId);

  if (!data) notFound();

  const { profile, services, theme } = data;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.backgroundColor }}>
      {/* Header */}
      <Box sx={{ bgcolor: theme.primaryColor, color: "#fff", py: 5, px: 3, textAlign: "center" }}>
        {profile.avatarUrl ? (
          <Box
            component="img"
            src={profile.avatarUrl}
            alt={profile.displayName}
            sx={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", mx: "auto", mb: 2, border: "3px solid rgba(255,255,255,0.3)" }}
          />
        ) : (
          <Box sx={{ width: 100, height: 100, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.2)", mx: "auto", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontSize: "2.5rem", color: "#fff" }}>{profile.displayName.charAt(0)}</Typography>
          </Box>
        )}
        <Typography component="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700 }}>
          {profile.displayName}
        </Typography>
        {profile.jobTitle && (
          <Typography sx={{ fontSize: "1rem", opacity: 0.9, mt: 0.5 }}>{profile.jobTitle}</Typography>
        )}
      </Box>

      <Box sx={{ maxWidth: 600, mx: "auto", px: 2, py: 4 }}>
        {/* Bio */}
        {profile.bio && (
          <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: `${theme.borderRadius}px` }}>
            <Typography sx={{ fontSize: "0.9375rem", color: "text.secondary", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {profile.bio}
            </Typography>
          </Paper>
        )}

        {/* Services */}
        {services.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 1.5 }}>Services</Typography>
            <Stack spacing={1}>
              {services.map(svc => (
                <Paper
                  key={svc.id}
                  component="a"
                  href={`/book/${tenantSlug}/services/${svc.slug}`}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: `${theme.borderRadius}px`, display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
                >
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
            Book with {profile.displayName}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Data Loading ────────────────────────────────────────────────────────────

type StaffDetailData = {
  profile: { displayName: string; jobTitle: string | null; bio: string | null; avatarUrl: string | null };
  tenantName: string;
  services: Array<{ id: string; name: string; slug: string; durationMinutes: number; price: string; currency: string }>;
  theme: Awaited<ReturnType<typeof resolvePublishedTenantTheme>>;
};

async function loadStaffDetail(tenantSlug: string, staffId: string): Promise<StaffDetailData | null> {
  const supabase = createServiceRoleClient();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, status")
    .eq("slug", tenantSlug)
    .single();

  if (!tenantRow || !["active", "trialing"].includes((tenantRow as { status: string }).status)) return null;

  const tenantId = (tenantRow as { id: string }).id;
  const tenantName = (tenantRow as { name: string }).name;

  // Load staff profile (must be public + active)
  const { data: spRow } = await supabase
    .from("staff_profiles")
    .select("id, display_name, job_title, bio, avatar_url, resource_id")
    .eq("id", staffId)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .eq("is_public", true)
    .single();

  if (!spRow) return null;

  const sp = spRow as unknown as { id: string; display_name: string; job_title: string | null; bio: string | null; avatar_url: string | null; resource_id: string };

  // Services for this resource
  const { data: srRows } = await supabase
    .from("service_resources")
    .select("service_id")
    .eq("resource_id", sp.resource_id)
    .eq("tenant_id", tenantId);

  const serviceIds = ((srRows ?? []) as unknown as Array<{ service_id: string }>).map(r => r.service_id);
  let services: StaffDetailData["services"] = [];
  if (serviceIds.length > 0) {
    const { data: svcRows } = await supabase
      .from("services")
      .select("id, name, slug, duration_minutes, price, currency")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("id", serviceIds)
      .order("sort_order", { ascending: true })
      .limit(50);

    services = ((svcRows ?? []) as unknown as Array<{ id: string; name: string; slug: string; duration_minutes: number; price: number; currency: string }>)
      .map(s => ({ id: s.id, name: s.name, slug: s.slug, durationMinutes: s.duration_minutes, price: String(s.price), currency: s.currency }));
  }

  const theme = await resolvePublishedTenantTheme(tenantId);

  return {
    profile: { displayName: sp.display_name, jobTitle: sp.job_title, bio: sp.bio, avatarUrl: sp.avatar_url },
    tenantName,
    services,
    theme,
  };
}
