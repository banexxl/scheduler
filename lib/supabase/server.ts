import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnvironment } from "@/lib/environment/client";
import type { Database } from "./database.types";

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers.
 *
 * This client operates as the currently authenticated user and respects RLS.
 * Cookie writes may fail in Server Components (read-only context); the root
 * proxy handles session refresh writes.
 */
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        clientEnvironment.supabaseUrl,
        clientEnvironment.supabasePublishableKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // Cookie writes will fail in Server Components because they
                        // cannot modify the response. This is expected — the root
                        // proxy handles session refresh and cookie updates.
                    }
                },
            },
        }
    );
}
