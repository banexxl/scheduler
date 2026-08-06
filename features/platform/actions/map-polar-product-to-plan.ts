"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";

export type MapPolarProductToPlanResult = {
     success: boolean;
     message: string;
};

export async function mapPolarProductToPlanAction(
     planId: string,
     polarProductId: string | null
): Promise<MapPolarProductToPlanResult> {
     await requirePlatformAdmin();

     if (!planId || planId.trim().length === 0) {
          return { success: false, message: "Plan id is required." };
     }

     const normalizedProductId = polarProductId?.trim() || null;

     const adminClient = createAdminClient();
     const { data: plan, error: planError } = await adminClient
          .from("billing_plans" as never)
          .select("id, is_free")
          .eq("id" as never, planId)
          .maybeSingle();

     if (planError || !plan) {
          return { success: false, message: "Billing plan was not found." };
     }

     if ((plan as { is_free: boolean }).is_free && normalizedProductId) {
          return {
               success: false,
               message: "Free plans cannot be mapped to Polar products.",
          };
     }

     const { error } = await adminClient
          .from("billing_plans" as never)
          .update(
               {
                    polar_product_id: normalizedProductId,
                    last_synced_at: new Date().toISOString(),
               } as never
          )
          .eq("id" as never, planId);

     if (error) {
          if ((error as { code?: string }).code === "23505") {
               return {
                    success: false,
                    message: "This Polar product is already mapped to another plan.",
               };
          }

          return {
               success: false,
               message: `Unable to save mapping: ${error.message}`,
          };
     }

     revalidatePath("/platform/billing/products");

     return {
          success: true,
          message: normalizedProductId
               ? "Plan mapping updated."
               : "Plan mapping cleared.",
     };
}
