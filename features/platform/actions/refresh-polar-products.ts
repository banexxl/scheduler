"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { syncAllPolarProducts } from "../services/sync-polar-product";

export type RefreshPolarProductsResult = {
     success: boolean;
     message: string;
     counters?: Record<string, number>;
};

export async function refreshPolarProductsAction(): Promise<RefreshPolarProductsResult> {
     const context = await requirePlatformAdmin();

     try {
          const counters = await syncAllPolarProducts({
               source: "manual",
               runType: "product_sync",
               requestedBy: context.user.id,
          });

          revalidatePath("/platform/billing/products");

          return {
               success: true,
               message: "Polar products refreshed.",
               counters,
          };
     } catch (error) {
          return {
               success: false,
               message:
                    error instanceof Error
                         ? error.message
                         : "Unable to refresh Polar products.",
          };
     }
}
