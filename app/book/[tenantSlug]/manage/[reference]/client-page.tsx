"use client";

/**
 * Booking Details Client Page — Milestones 18.0 + 18.1.
 *
 * Loads booking details + modification permissions.
 * Shows ActionBar for reschedule/cancel when policies allow.
 */

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import BookingDetailsCard from "@/features/booking-management/components/BookingDetailsCard";
import ActionBar from "@/features/booking-management/components/ActionBar";
import CancelBookingDialog from "@/features/booking-management/components/CancelBookingDialog";
import RescheduleDialog from "@/features/booking-management/components/RescheduleDialog";
import { getBookingDetails } from "@/features/booking-management/actions/booking-management-actions";
import { canModifyBooking } from "@/features/booking-management/actions/modify-booking-actions";
import type { BookingDetails, ModificationPermissions } from "@/features/booking-management/types";

type Props = {
  tenantSlug: string;
  reference: string;
};

export default function BookingDetailsClientPage({ tenantSlug, reference }: Props) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [permissions, setPermissions] = useState<ModificationPermissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const loadBooking = useCallback(() => {
    const email = sessionStorage.getItem(`booking-email-${tenantSlug}`);
    if (!email) {
      router.replace(`/book/${tenantSlug}/manage`);
      return;
    }

    startTransition(async () => {
      const result = await getBookingDetails(tenantSlug, reference, email);
      if (result.success) {
        setBooking(result.booking);
        // Load permissions
        const perms = await canModifyBooking(result.booking);
        setPermissions(perms);
      } else {
        setError(result.error);
      }
      setLoaded(true);
    });
  }, [tenantSlug, reference, router]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleCancelled = () => {
    setCancelOpen(false);
    // Reload to show updated status
    setLoaded(false);
    loadBooking();
  };

  const handleRescheduled = () => {
    setRescheduleOpen(false);
    setLoaded(false);
    loadBooking();
  };

  if (!loaded || isPending) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
        <Alert severity="error" sx={{ mb: 2, maxWidth: 440, mx: "auto" }}>{error}</Alert>
        <Button href={`/book/${tenantSlug}/manage`} variant="outlined">
          Try Again
        </Button>
      </Box>
    );
  }

  if (!booking) return null;

  return (
    <Box sx={{ py: { xs: 3, sm: 5 }, px: 2, maxWidth: 600, mx: "auto" }}>
      <BookingDetailsCard booking={booking} tenantSlug={tenantSlug} />

      {/* Action Bar */}
      {permissions && (
        <>
          <Divider sx={{ my: 3 }} />
          <ActionBar
            permissions={permissions}
            onReschedule={() => setRescheduleOpen(true)}
            onCancel={() => setCancelOpen(true)}
          />
        </>
      )}

      {/* Dialogs */}
      <CancelBookingDialog
        open={cancelOpen}
        booking={booking}
        onClose={() => setCancelOpen(false)}
        onCancelled={handleCancelled}
      />

      <RescheduleDialog
        open={rescheduleOpen}
        booking={booking}
        timeZone="UTC"
        onClose={() => setRescheduleOpen(false)}
        onRescheduled={handleRescheduled}
      />
    </Box>
  );
}
