import "server-only";

type SideEffectResult = {
     ok: boolean;
     skipped: boolean;
};

/**
 * Reminder/notification infrastructure is not yet implemented in this codebase.
 * These hooks keep self-service flows explicit and safe until that foundation exists.
 */
export async function cancelPendingRemindersForAppointment(_input: {
     tenantId: string;
     appointmentId: string;
}): Promise<SideEffectResult> {
     void _input;
     return { ok: true, skipped: true };
}

export async function synchronizeRemindersAfterReschedule(_input: {
     tenantId: string;
     appointmentId: string;
     startsAt: string;
     endsAt: string;
}): Promise<SideEffectResult> {
     void _input;
     return { ok: true, skipped: true };
}

export async function enqueueAppointmentCancellationNotification(_input: {
     tenantId: string;
     appointmentId: string;
     manageAppointmentUrl?: string;
}): Promise<SideEffectResult> {
     void _input;
     return { ok: true, skipped: true };
}

export async function enqueueAppointmentRescheduledNotification(_input: {
     tenantId: string;
     appointmentId: string;
     manageAppointmentUrl?: string;
}): Promise<SideEffectResult> {
     void _input;
     return { ok: true, skipped: true };
}

export async function enqueueAppointmentCreatedNotification(_input: {
     tenantId: string;
     appointmentId: string;
     manageAppointmentUrl?: string;
}): Promise<SideEffectResult> {
     void _input;
     return { ok: true, skipped: true };
}
