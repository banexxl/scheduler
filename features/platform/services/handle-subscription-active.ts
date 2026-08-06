import "server-only";

import type { UnknownRecord } from "./polar-normalize";
import { handleSubscriptionCreated } from "./handle-subscription-created";

export const handleSubscriptionActive = handleSubscriptionCreated as (
     payload: UnknownRecord,
     eventTimestamp: string,
     eventId: string
) => ReturnType<typeof handleSubscriptionCreated>;
