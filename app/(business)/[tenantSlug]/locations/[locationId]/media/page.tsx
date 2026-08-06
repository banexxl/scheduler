import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getLocation } from "@/features/locations/services/get-location";
import { getLocationMedia } from "@/features/media/services/get-business-media";
import MediaUploader from "@/features/media/components/media-uploader";
import MediaGallery from "@/features/media/components/media-gallery";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function LocationMediaPage({ params }: { params: Promise<{ tenantSlug: string; locationId: string }> }) {
  const { tenantSlug, locationId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const location = await getLocation(tenant.id, locationId);
  if (!location) notFound();

  let media;
  try { media = await getLocationMedia(tenant.id, locationId); }
  catch { return <Box><Alert severity="error">Unable to load media.</Alert></Box>; }

  const cover = media.filter((m) => m.mediaRole === "cover");
  const gallery = media.filter((m) => m.mediaRole === "gallery");

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component={NextLink} href={`/${tenantSlug}/locations`} variant="body2">&larr; Back to Locations</Link></Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>Location Media</Typography>
        <Chip label={location.name} variant="outlined" size="small" />
      </Box>

      {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}

      <Typography variant="h6" sx={{ mb: 1 }}>Cover Image</Typography>
      <MediaGallery assets={cover} tenantSlug={tenantSlug} canEdit={canEdit} />
      {canEdit && <Box sx={{ mt: 1 }}><MediaUploader tenantSlug={tenantSlug} target="location" targetId={locationId} mediaRole="cover" label="Upload Cover" /></Box>}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" sx={{ mb: 1 }}>Gallery</Typography>
      <MediaGallery assets={gallery} tenantSlug={tenantSlug} canEdit={canEdit} />
      {canEdit && <Box sx={{ mt: 1 }}><MediaUploader tenantSlug={tenantSlug} target="location" targetId={locationId} mediaRole="gallery" label="Add Gallery Image" /></Box>}
    </Box>
  );
}
