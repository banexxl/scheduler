"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { manualSubscriptionReconcileSchema } from "../schemas/billing-subscription-schema";
import {
     reconcileOneSubscription,
     reconcileSubscriptionsForPolarCustomer,
     reconcileActiveLocalSubscriptions,
} from "../services/reconcile-polar-subscriptions";

export async function reconcileSubscriptionAdminAction(input: {
     subscriptionId?: string;
     polarCustomerId?: string;
     limit?: number;
}) {
     await requirePlatformAdmin();

     const validated = await manualSubscriptionReconcileSchema.validate(input, {
          abortEarly: false,
          stripUnknown: true,
     });

     if (validated.subscriptionId) {
          const result = await reconcileOneSubscription(validated.subscriptionId, "manual_refresh");
          revalidatePath("/platform");
          revalidatePath("/platform/billing/subscriptions");
          revalidatePath(`/platform/billing/subscriptions/${validated.subscriptionId}`);
          return {
               success: true,
               message: "Subscription reconciliation completed.",
               data: result,
          };
     }

     if (validated.polarCustomerId) {
          const counters = await reconcileSubscriptionsForPolarCustomer({
               polarCustomerId: validated.polarCustomerId,
               source: "manual_refresh",
               limit: validated.limit,
          });

          revalidatePath("/platform");
          revalidatePath("/platform/billing/subscriptions");

          return {
               success: true,
               message: "Customer subscriptions reconciled.",
               data: counters,
          };
     }

     const counters = await reconcileActiveLocalSubscriptions({
          source: "manual_refresh",
          limit: validated.limit,
     });

     revalidatePath("/platform");
     revalidatePath("/platform/billing/subscriptions");

     return {
          success: true,
          message: "Active subscriptions reconciled.",
          data: counters,
     };
}
