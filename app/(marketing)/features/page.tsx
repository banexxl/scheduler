import { redirect } from "next/navigation";

/**
 * Features Page — redirects to the features section on the landing page.
 *
 * All content is now part of the single-page storytelling landing page.
 */
export default function FeaturesPage() {
  redirect("/#features");
}
