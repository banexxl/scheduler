"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";

export async function updateCustomerProfileAction(
     tenantSlug: string,
     customerId: string,
     input: {
          name?: string;
          email?: string | null;
          phoneNumber?: string | null;
          preferredLocationId?: string | null;
          marketingOptIn?: boolean;
          internalNotes?: string | null;
          isBlocked?: boolean;
          blockedReason?: string | null;
          loyaltyPoints?: number;
          tags?: string[];
     }
): Promise<{ success: boolean; message: string }> {
     const { tenant } = await requireTenantMember(tenantSlug);
     const supabase = await createClient();

     const updates: Record<string, unknown> = {};
     if (typeof input.name === "string") updates.name = input.name;
     if (typeof input.email === "string" || input.email === null) updates.email = input.email;
     if (typeof input.phoneNumber === "string" || input.phoneNumber === null) updates.phone_number = input.phoneNumber;
     if (typeof input.preferredLocationId === "string" || input.preferredLocationId === null) updates.preferred_location_id = input.preferredLocationId;
     if (typeof input.marketingOptIn === "boolean") updates.marketing_opt_in = input.marketingOptIn;

     const privateUpdates: Record<string, unknown> = {};
     if (typeof input.internalNotes === "string" || input.internalNotes === null) privateUpdates.internal_notes = input.internalNotes;
     if (typeof input.isBlocked === "boolean") privateUpdates.is_blocked = input.isBlocked;
     if (typeof input.blockedReason === "string" || input.blockedReason === null) privateUpdates.blocked_reason = input.blockedReason;
     if (typeof input.loyaltyPoints === "number") privateUpdates.loyalty_points = input.loyaltyPoints;

     if (Array.isArray(input.tags)) {
          privateUpdates.custom_data = {
               tags: input.tags,
          };
     }

     try {
          if (Object.keys(updates).length > 0) {
               const { error } = await supabase.from("tenant_customers").update(updates as never).eq("tenant_id", tenant.id).eq("id", customerId);
               if (error) throw error;
          }

          if (Object.keys(privateUpdates).length > 0) {
               const { error } = await supabase.from("tenant_customer_private").upsert({
                    tenant_id: tenant.id,
                    tenant_customer_id: customerId,
                    ...privateUpdates,
               }, { onConflict: "tenant_customer_id" });
               if (error) throw error;
          }

          revalidatePath(`/${tenantSlug}/customers`);
          revalidatePath(`/${tenantSlug}/customers/${customerId}`);
          return { success: true, message: "Customer profile updated." };
     } catch (error) {
          console.error("[customer-profile-update]", error);
          return { success: false, message: "Unable to update customer profile." };
     }
}
