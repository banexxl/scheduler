import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientEnvironment } from "@/lib/environment/client";
import type { Database } from "./database.types";

/**
 * Refreshes the Supabase authentication session during requests.
 *
 * This function:
 * 1. Creates a NextResponse.next() response
 * 2. Reads request cookies for the Supabase session
 * 3. Passes cookies to the Supabase SSR client
 * 4. When Supabase updates cookies (session refresh):
 *    - Updates the request cookie collection
 *    - Recreates the response with the updated request
 *    - Sets all updated cookies on the response
 * 5. Calls getUser() to refresh/validate the session
 * 6. Returns the response with any updated cookies
 *
 * Does NOT implement redirects, authorization, or tenant lookups.
 */
export async function updateSession(
    request: NextRequest
): Promise<NextResponse> {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient<Database>(
        clientEnvironment.supabaseUrl,
        clientEnvironment.supabasePublishableKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Update cookies on the request so downstream code sees them
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });

                    // Recreate the response with the updated request
                    supabaseResponse = NextResponse.next({ request });

                    // Set all cookies on the outgoing response
                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Refresh the session. Do not use getSession() as it reads from
    // potentially stale storage. getUser() contacts the Auth server
    // and ensures the session is valid. If the stored refresh token is
    // invalid or missing, treat the request as unauthenticated instead of
    // failing the whole render path.
    try {
        await supabase.auth.getUser();
    } catch {
        // Ignore invalid or stale auth cookies during SSR/build.
    }

    return supabaseResponse;
}
