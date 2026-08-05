import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("subscription_plans")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase health check failed:", error.code);
      return Response.json(
        { status: "error", supabase: "unavailable" },
        { status: 503 }
      );
    }

    return Response.json({ status: "ok", supabase: "connected" });
  } catch {
    console.error("Supabase health check: unexpected error");
    return Response.json(
      { status: "error", supabase: "unavailable" },
      { status: 503 }
    );
  }
}
