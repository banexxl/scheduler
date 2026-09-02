import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/get-safe-redirect-path";
import { resolveLoginDestination } from "@/features/auth/services/resolve-login-destination";
import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Auto-accepts a pending team invitation matching the authenticated user's
 * email (e.g. Google sign-in without an explicit `next=/invite/{token}`).
 * Returns the tenant dashboard path on success, or null if there is no
 * pending invitation to accept.
 */
async function tryAcceptPendingInvitation(user: User): Promise<string | null> {
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  const supabaseAdmin = createServiceRoleClient();

  const { data: invitation } = await supabaseAdmin
    .from("tenant_member_invitations")
    .select("token_hash, tenant_id")
    .eq("email", email)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) return null;

  const { data: result } = await supabaseAdmin.rpc("accept_tenant_member_invitation", {
    p_token_hash: invitation.token_hash,
    p_user_id: user.id,
    p_user_email: email,
  });

  const status = String((result as Record<string, unknown> | null)?.status ?? "failed");
  if (status !== "accepted" && status !== "already_member") return null;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("slug")
    .eq("id", invitation.tenant_id)
    .single();

  return tenant?.slug ? `/${tenant.slug}/dashboard` : null;
}

/**
 * Authentication callback route handler.
 * Supports authorization code exchange (recovery links, future OAuth).
 *
 * - Validates the "next" parameter (only internal paths allowed)
 * - Rejects external/protocol-relative URLs
 * - Redirects to /auth-error on failure
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  console.log("[auth/callback] Received callback", {
    hasCode: Boolean(code),
    next: next ?? "(none)",
    origin: request.nextUrl.origin,
  });

  if (!code) {
    console.error("[auth/callback] No code parameter in callback URL");
    redirect("/auth-error?code=callback_failed");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", { message: error.message, status: error.status, code: error.code });
    redirect("/auth-error?code=callback_failed");
  }

  console.log("[auth/callback] Code exchange succeeded");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[auth/callback] getUser returned null after successful code exchange");
    redirect("/auth-error?code=callback_failed");
  }

  // Redirect to validated next or resolve destination
  if (next) {
    const safeNext = getSafeRedirectPath(next);
    console.log("[auth/callback] Redirecting to validated next", { userId: user.id, requestedNext: next, safeNext });
    redirect(safeNext);
  }

  // Resolve the destination inside a try/catch so a failure while looking up the
  // user's identity (e.g. a PostgREST error from platform_admins) surfaces as a
  // clean /auth-error redirect instead of an unhandled server error on the OAuth
  // return URL. The password login action (loginAction) has equivalent containment;
  // without this, the OAuth path was the only flow that crashed on such errors.
  // NOTE: resolveLoginDestination must NOT call redirect() internally — the
  // NEXT_REDIRECT control-flow error would be caught here. It only returns a string.
  let destination: string;
  try {
    const invitationDestination = await tryAcceptPendingInvitation(user);
    destination = invitationDestination ?? (await resolveLoginDestination(user));
  } catch (resolveError) {
    console.error("[auth/callback] Failed to resolve login destination:", {
      userId: user.id,
      message: resolveError instanceof Error ? resolveError.message : String(resolveError),
    });
    redirect("/auth-error?code=callback_failed");
  }

  console.log("[auth/callback] Redirecting to resolved destination", { userId: user.id, destination });
  redirect(destination);
}
