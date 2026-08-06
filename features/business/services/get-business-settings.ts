import "server-only";
import { createClient } from "@/lib/supabase/server";

export type BusinessSettings = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  defaultTimezone: string;
  defaultCurrency: string;
  description: string | null;
  websiteUrl: string | null;
  defaultLanguage: string;
  socialLinks: Record<string, string>;
};

/**
 * Loads business settings for an already-authorized tenant.
 * Uses the normal authenticated server client — never admin.
 */
export async function getBusinessSettings(
  tenantId: string
): Promise<BusinessSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, contact_email, contact_phone, default_timezone, default_currency, description, website_url, default_language, social_links"
    )
    .eq("id", tenantId)
    .single();

  if (error || !data) {
    throw new Error("Unable to load business settings");
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    defaultTimezone: data.default_timezone,
    defaultCurrency: data.default_currency,
    description: data.description,
    websiteUrl: data.website_url,
    defaultLanguage: data.default_language,
    socialLinks: (data.social_links as Record<string, string>) ?? {},
  };
}
