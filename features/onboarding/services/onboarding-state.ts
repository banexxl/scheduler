"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { OnboardingStepKey } from "../types/onboarding";

export type OnboardingStateResult = {
     success: boolean;
     message?: string;
};

const ALLOWED_STEPS: OnboardingStepKey[] = [
     "business_details",
     "location",
     "resource",
     "service",
     "working_hours",
     "booking_rules",
     "public_booking",
     "complete",
];

async function ensureOnboardingRecord(tenantId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
     const { data: existing } = await supabase
          .from("tenant_onboarding")
          .select("id")
          .eq("tenant_id", tenantId)
          .maybeSingle();

     if (existing) return existing.id;

     const { data, error } = await supabase
          .from("tenant_onboarding")
          .insert({ tenant_id: tenantId, current_step: "business_details", status: "not_started" })
          .select("id")
          .single();

     if (error) throw error;
     return data.id;
}

export async function updateOnboardingStepAction(tenantSlug: string, step: string): Promise<OnboardingStateResult> {
     const user = await getUser();
     if (!user) return { success: false, message: "Authentication required." };

     const tenant = await getTenantBySlug(tenantSlug);
     if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

     if (!ALLOWED_STEPS.includes(step as OnboardingStepKey)) {
          return { success: false, message: "Invalid onboarding step." };
     }

     const supabase = await createClient();
     const { data: membership } = await supabase
          .from("tenant_members")
          .select("id, role")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .eq("status", "active")
          .single();

     if (!membership || !["owner", "admin"].includes(membership.role)) {
          return { success: false, message: "Only owners and admins can update onboarding." };
     }

     try {
          await ensureOnboardingRecord(tenant.id, supabase);
     } catch (error) {
          console.error("[onboarding-state] ensure error", error);
          return { success: false, message: "Unable to save onboarding progress." };
     }

     const { error } = await supabase
          .from("tenant_onboarding")
          .update({ current_step: step, last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("tenant_id", tenant.id);

     if (error) {
          console.error("[onboarding-state] update error", error.message);
          return { success: false, message: "Unable to save onboarding progress." };
     }

     revalidatePath(`/${tenantSlug}/onboarding`);
     revalidatePath(`/${tenantSlug}/dashboard`);
     return { success: true };
}

export async function completeOnboardingAction(tenantSlug: string): Promise<OnboardingStateResult> {
     const user = await getUser();
     if (!user) return { success: false, message: "Authentication required." };

     const tenant = await getTenantBySlug(tenantSlug);
     if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

     const supabase = await createClient();
     const { data: membership } = await supabase
          .from("tenant_members")
          .select("id, role")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .eq("status", "active")
          .single();

     if (!membership || !["owner", "admin"].includes(membership.role)) {
          return { success: false, message: "Only owners and admins can complete onboarding." };
     }

     const { data: onboarding } = await supabase
          .from("tenant_onboarding")
          .select("id")
          .eq("tenant_id", tenant.id)
          .maybeSingle();

     if (!onboarding) {
          await supabase.from("tenant_onboarding").insert({ tenant_id: tenant.id, current_step: "complete", status: "completed" });
     } else {
          await supabase
               .from("tenant_onboarding")
               .update({ current_step: "complete", status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
               .eq("tenant_id", tenant.id);
     }

     revalidatePath(`/${tenantSlug}/onboarding`);
     revalidatePath(`/${tenantSlug}/dashboard`);
     return { success: true };
}
