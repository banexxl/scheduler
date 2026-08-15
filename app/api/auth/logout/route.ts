import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout API route — signs out the user and redirects to login.
 */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", origin));
}
