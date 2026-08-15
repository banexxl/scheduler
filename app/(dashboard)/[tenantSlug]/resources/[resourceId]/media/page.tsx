import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getResource } from "@/features/resources/services/get-business-resources";
import { getResourceMedia } from "@/features/media/services/get-business-media";
import MediaUploader from "@/features/media/components/media-uploader";
import MediaGallery from "@/features/media/components/media-gallery";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ResourceMediaPage({ params }: { params: Promise<{ tenantSlug: string; resourceId: string }> }) {
  const { tenantSlug, resourceId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const resource = await getResource(tenant.id, resourceId);
  if (!resource) notFound();

  let media;
  try { media = await getResourceMedia(tenant.id, resourceId); }
  catch { return <Box><Alert severity="error">Unable to load media.</Alert></Box>; }

  const profile = media.filter((m) => m.mediaRole === "profile");
  const gallery = media.filter((m) => m.mediaRole === "gallery");

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component="a" href={`/${tenantSlug}/resources`} variant="body2">&larr; Back to Resources</Link></Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>Resource Media</Typography>
        <Chip label={resource.name} variant="outlined" size="small" />
      </Box>

      {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}

      <Typography variant="h6" sx={{ mb: 1 }}>Profile Image</Typography>
      <MediaGallery assets={profile} tenantSlug={tenantSlug} canEdit={canEdit} />
      {canEdit && <Box sx={{ mt: 1 }}><MediaUploader tenantSlug={tenantSlug} target="resource" targetId={resourceId} mediaRole="profile" label="Upload Profile" /></Box>}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" sx={{ mb: 1 }}>Gallery</Typography>
      <MediaGallery assets={gallery} tenantSlug={tenantSlug} canEdit={canEdit} />
      {canEdit && <Box sx={{ mt: 1 }}><MediaUploader tenantSlug={tenantSlug} target="resource" targetId={resourceId} mediaRole="gallery" label="Add Gallery Image" /></Box>}
    </Box>
  );
}
