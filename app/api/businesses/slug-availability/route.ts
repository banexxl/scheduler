import { getUser } from "@/lib/auth/get-user";
import { checkBusinessSlugAvailability } from "@/features/business/services/check-business-slug-availability";
import type { NextRequest } from "next/server";

/**
 * GET /api/businesses/slug-availability?slug=johns-barbershop
 *
 * Authenticated route that checks whether a business slug is available.
 * Returns only availability status — never exposes tenant details.
 *
 * Responses:
 * - 200 { status: "available", available: true }
 * - 200 { status: "unavailable", available: false }
 * - 200 { status: "invalid", available: false }
 * - 401 Unauthenticated
 * - 500 { status: "error", available: false }
 */
export async function GET(request: NextRequest) {
  // Authentication check
  const user = await getUser();
  if (!user) {
    return Response.json(
      { error: "Authentication required" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  // Read slug parameter
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug || slug.length > 100) {
    return Response.json(
      { status: "invalid", available: false },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  // Check availability
  const result = await checkBusinessSlugAvailability(slug);

  const statusCode = result.status === "error" ? 500 : 200;

  return Response.json(result, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
