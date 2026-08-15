import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Invitation",
  robots: { index: false, follow: false },
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  const supabase = createServiceRoleClient();
  const { data: invRow } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("tenant_member_invitations" as never)
    .select("id, tenant_id, email, role, status, expires_at" as never)
    .eq("token_hash" as never, tokenHash)
    .single();

  // Generic unavailable for any invalid state
  if (!invRow) {
    return <UnavailablePage />;
  }

  const inv = invRow as unknown as {
    id: string; tenant_id: string; email: string;
    role: string; status: string; expires_at: string;
  };

  if (inv.status !== "pending") return <UnavailablePage />;
  if (new Date(inv.expires_at) <= new Date()) return <UnavailablePage />;

  // Load tenant name
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("name, slug")
    .eq("id", inv.tenant_id)
    .single();

  const tenantName = tenantRow?.name ?? "a business";
  const tenantSlug = tenantRow?.slug ?? "";

  // Check if user is authenticated
  const user = await getUser();

  if (!user) {
    return (
      <InvitationCard
        tenantName={tenantName}
        role={inv.role}
        message="Please sign in or create an account to accept this invitation."
        actionLabel="Sign In"
        actionHref={`/login?next=/invite/${token}`}
      />
    );
  }

  // Verify email matches
  const userEmail = user.email?.trim().toLowerCase() ?? "";
  const invEmail = inv.email.trim().toLowerCase();

  if (userEmail !== invEmail) {
    return (
      <InvitationCard
        tenantName={tenantName}
        role={inv.role}
        message="This invitation was sent to a different email address."
        severity="warning"
      />
    );
  }

  // Accept invitation via RPC
  const { data: result } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .rpc("accept_tenant_member_invitation" as never, {
      p_token_hash: tokenHash,
      p_user_id: user.id,
      p_user_email: userEmail,
    } as never);

  const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
  const status = String(rpcResult.status ?? "failed");

  if (status === "accepted") {
    return (
      <InvitationCard
        tenantName={tenantName}
        role={inv.role}
        message={`You have joined ${tenantName} as ${inv.role}.`}
        severity="success"
        actionLabel="Go to Dashboard"
        actionHref={`/${tenantSlug}/dashboard`}
      />
    );
  }

  if (status === "already_member") {
    return (
      <InvitationCard
        tenantName={tenantName}
        role={inv.role}
        message="You are already a member of this business."
        actionLabel="Go to Dashboard"
        actionHref={`/${tenantSlug}/dashboard`}
      />
    );
  }

  return <UnavailablePage />;
}

function UnavailablePage() {
  return (
    <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>Invitation Unavailable</Typography>
        <Typography variant="body2" color="text.secondary">
          This invitation is invalid or no longer available.
        </Typography>
      </Paper>
    </Box>
  );
}

function InvitationCard({ tenantName, role, message, severity, actionLabel, actionHref }: {
  tenantName: string; role: string; message: string;
  severity?: "success" | "warning" | "info";
  actionLabel?: string; actionHref?: string;
}) {
  return (
    <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 480, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>Team Invitation</Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          You have been invited to join <strong>{tenantName}</strong> as <strong>{role}</strong>.
        </Typography>
        {severity && <Alert severity={severity} sx={{ mb: 2, justifyContent: "center" }}>{message}</Alert>}
        {!severity && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}
        {actionLabel && actionHref && (
          <Button component="a" href={actionHref} variant="contained">{actionLabel}</Button>
        )}
      </Paper>
    </Box>
  );
}
