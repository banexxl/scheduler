import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessMedia } from "@/features/media/services/get-business-media";
import MediaUploader from "@/features/media/components/media-uploader";
import MediaGallery from "@/features/media/components/media-gallery";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function BusinessMediaPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let media;
  try { media = await getBusinessMedia(tenant.id); }
  catch { return <Box><Alert severity="error">Unable to load media.</Alert></Box>; }

  const logo = media.filter((m) => m.mediaRole === "logo");
  const cover = media.filter((m) => m.mediaRole === "cover");
  const gallery = media.filter((m) => m.mediaRole === "gallery");

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Business Media</Typography>

      {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access to media.</Alert>}

      {/* Logo */}
      <Typography variant="h6" sx={{ mb: 1 }}>Logo</Typography>
      <MediaGallery assets={logo} tenantSlug={tenantSlug} canEdit={canEdit} />
      {canEdit && <Box sx={{ mt: 1 }}><MediaUploader tenantSlug={tenantSlug} target="business" targetId={null} mediaRole="logo" label="Upload Logo" /></Box>}

      <Divider sx={{ my: 3 }} />

      {/* Cover */}
      <Typography variant="h6" sx={{ mb: 1 }}>Cover Image</Typography>
      <MediaGallery assets={cover} tenantSlug={tenantSlug} canEdit={canEdit} />
      {canEdit && <Box sx={{ mt: 1 }}><MediaUploader tenantSlug={tenantSlug} target="business" targetId={null} mediaRole="cover" label="Upload Cover" /></Box>}

      <Divider sx={{ my: 3 }} />

      {/* Gallery */}
      <Typography variant="h6" sx={{ mb: 1 }}>Gallery</Typography>
      <MediaGallery assets={gallery} tenantSlug={tenantSlug} canEdit={canEdit} />
      {canEdit && <Box sx={{ mt: 1 }}><MediaUploader tenantSlug={tenantSlug} target="business" targetId={null} mediaRole="gallery" label="Add Gallery Image" /></Box>}
    </Box>
  );
}
