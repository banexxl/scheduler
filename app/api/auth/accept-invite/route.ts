import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { resolveLoginDestination } from "@/features/auth/services/resolve-login-destination";
import { PENDING_INVITE_KEY } from "@/features/team/types/team";
import type { PendingTenantInvite } from "@/features/team/types/team";
import type { NextRequest } from "next/server";

/**
 * Custom redirect target for Supabase native team invitations.
 *
 * Supabase Auth generates and emails the invite token/magic-link; the link's
 * `redirectTo` points here. This handler:
 *   1. Establishes a session from the invite link (PKCE `code` or `token_hash`).
 *   2. Reads the invited tenant + role from the user's `app_metadata`.
 *   3. Applies the membership + role atomically via `accept_pending_tenant_invite`.
 *   4. Clears the pending-invite metadata and redirects to the tenant dashboard.
 *
 * The selected role is preserved because it travels in server-controlled
 * `app_metadata` and is written straight into `tenant_members.role`.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  // Establish the session from whichever link format Supabase used.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[accept-invite] exchangeCodeForSession failed:", error.message);
      redirect("/auth-error?code=invite_failed");
    }
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      // Supabase sends `type=invite` for invites and `type=magiclink` for
      // existing-user links. Default to invite when absent.
      type: (type as "invite" | "magiclink" | "email") ?? "invite",
    });
    if (error) {
      console.error("[accept-invite] verifyOtp failed:", error.message);
      redirect("/auth-error?code=invite_failed");
    }
  } else {
    console.error("[accept-invite] No code or token_hash in invite link");
    redirect("/auth-error?code=invite_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[accept-invite] No authenticated user after link exchange");
    redirect("/auth-error?code=invite_failed");
  }

  // Read the pending invite from server-controlled app_metadata.
  const pending = (user.app_metadata?.[PENDING_INVITE_KEY] ?? null) as PendingTenantInvite | null;

  if (!pending) {
    // No pending invite (already accepted, revoked, or a stray link) — send the
    // user to wherever they belong.
    let destination: string;
    try {
      destination = await resolveLoginDestination(user);
    } catch {
      destination = "/login";
    }
    redirect(destination);
  }

  const admin = createServiceRoleClient();

  const { data: result, error: rpcError } = await (admin as never as ReturnType<typeof createServiceRoleClient>)
    .rpc("accept_pending_tenant_invite" as never, {
      p_user_id: user.id,
      p_tenant_id: pending.tenant_id,
      p_role: pending.role,
    } as never);

  if (rpcError) {
    console.error("[accept-invite] accept RPC failed:", rpcError.message);
    redirect("/auth-error?code=invite_failed");
  }

  const rpc = (result as unknown as Record<string, unknown>) ?? {};
  const status = String(rpc.status ?? "failed");

  if (status !== "accepted" && status !== "already_member") {
    console.error("[accept-invite] accept RPC returned status:", status);
    redirect("/auth-error?code=invite_failed");
  }

  // Clear the pending invite so the link can't be reused and the invitation
  // drops off the pending list.
  const nextAppMetadata = { ...(user.app_metadata ?? {}) };
  delete (nextAppMetadata as Record<string, unknown>)[PENDING_INVITE_KEY];
  await admin.auth.admin.updateUserById(user.id, { app_metadata: nextAppMetadata });

  const slug = String(rpc.tenant_slug ?? pending.tenant_slug);

  // Brand-new invitees (type=invite) have no password yet — send them to set
  // one before landing on the dashboard. Existing accounts (magiclink) already
  // have credentials and go straight through.
  // After setting a password, updatePasswordAction resolves the destination
  // via resolveLoginDestination, which now returns this tenant's dashboard
  // because membership was just created.
  const isNewInvitee = (type ?? "invite") === "invite";
  if (isNewInvitee) {
    redirect("/update-password");
  }

  redirect(`/${slug}/dashboard`);
}
