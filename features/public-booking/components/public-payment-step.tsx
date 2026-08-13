"use client";

/**
 * Public Booking Payment Step — Milestone 15.12.
 *
 * Presents available payment options based on server-resolved eligibility:
 * - Pay at business (default for free / no online payment)
 * - Online payment (when configured + required)
 * - Package credit (when authenticated customer has eligible credits)
 * - Gift card redemption (when enabled + valid code entered)
 *
 * Gift card flow:
 * 1. Customer enters code
 * 2. Server validates + reserves value
 * 3. UI shows reserved amount + remaining to pay
 * 4. Full or partial coverage displayed
 *
 * Security:
 * - Raw gift card code only used for server validation call
 * - Never persisted to localStorage/sessionStorage
 * - Server returns opaque reservationId after validation
 */

import { useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import { validateGiftCardAction, releaseGiftCardReservationAction } from "../actions/validate-gift-card-action";
import type { ValidateGiftCardResult } from "../actions/validate-gift-card-action";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaymentMethod = "pay_at_business" | "online" | "package_credit" | "gift_card";

export type GiftCardReservation = {
  reservationId: string;
  reservedAmount: number;
  currency: string;
  codePrefix: string;
};

export type PackageOption = {
  customerPackageId: string;
  packageName: string;
  creditsRemaining: number;
  creditsRequired: number;
};

type Props = {
  tenantSlug: string;
  servicePrice: number; // minor units
  serviceCurrency: string;
  giftCardsEnabled: boolean;
  onlinePaymentEnabled: boolean;
  paymentRequired: boolean;
  packageOptions: PackageOption[];
  onSelect: (method: PaymentMethod, giftCard?: GiftCardReservation, packageOption?: PackageOption) => void;
  onBack: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PublicPaymentStep({
  tenantSlug,
  servicePrice,
  serviceCurrency,
  giftCardsEnabled,
  onlinePaymentEnabled,
  paymentRequired,
  packageOptions,
  onSelect,
  onBack,
}: Props) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    servicePrice <= 0 ? "pay_at_business" :
      packageOptions.length > 0 ? "package_credit" :
        paymentRequired && onlinePaymentEnabled ? "online" : "pay_at_business"
  );

  // Gift card state
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardValidating, setGiftCardValidating] = useState(false);
  const [giftCardError, setGiftCardError] = useState("");
  const [giftCardReservation, setGiftCardReservation] = useState<GiftCardReservation | null>(null);

  // Package state
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(
    packageOptions.length > 0 ? (packageOptions[0] ?? null) : null
  );

  const isFreeService = servicePrice <= 0;

  // ─── Gift Card Validation ──────────────────────────────────────────────

  const handleValidateGiftCard = useCallback(async () => {
    if (!giftCardCode.trim()) return;

    setGiftCardValidating(true);
    setGiftCardError("");

    const result: ValidateGiftCardResult = await validateGiftCardAction(
      tenantSlug,
      giftCardCode.trim(),
      servicePrice,
      serviceCurrency
    );

    setGiftCardValidating(false);

    if (!result.success) {
      setGiftCardError(result.error);
      return;
    }

    setGiftCardReservation({
      reservationId: result.reservationId,
      reservedAmount: result.reservedAmount,
      currency: result.currency,
      codePrefix: result.codePrefix,
    });

    // Clear the raw code from state immediately after successful validation
    setGiftCardCode("");
  }, [giftCardCode, tenantSlug, servicePrice, serviceCurrency]);

  const handleRemoveGiftCard = useCallback(async () => {
    if (giftCardReservation) {
      // Release the reservation (non-blocking)
      releaseGiftCardReservationAction(tenantSlug, giftCardReservation.reservationId);
      setGiftCardReservation(null);
    }
    setGiftCardError("");
    setGiftCardCode("");
  }, [giftCardReservation, tenantSlug]);

  // ─── Continue ──────────────────────────────────────────────────────────

  const handleContinue = useCallback(() => {
    if (selectedMethod === "gift_card" && giftCardReservation) {
      onSelect("gift_card", giftCardReservation, undefined);
    } else if (selectedMethod === "package_credit" && selectedPackage) {
      onSelect("package_credit", undefined, selectedPackage);
    } else {
      onSelect(selectedMethod, undefined, undefined);
    }
  }, [selectedMethod, giftCardReservation, selectedPackage, onSelect]);

  const canContinue =
    selectedMethod === "pay_at_business" ||
    selectedMethod === "online" ||
    (selectedMethod === "gift_card" && giftCardReservation !== null) ||
    (selectedMethod === "package_credit" && selectedPackage !== null);

  // ─── Render ────────────────────────────────────────────────────────────

  // Free services skip payment entirely
  if (isFreeService) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Payment</Typography>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          No payment required for this service.
        </Alert>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          <Button onClick={onBack} variant="text">Back</Button>
          <Button onClick={() => onSelect("pay_at_business")} variant="contained">
            Continue
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Payment</Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Service price: {formatMinorAmount(servicePrice, serviceCurrency)}
      </Typography>

      <RadioGroup
        value={selectedMethod}
        onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
      >
        {/* Pay at business — always available unless payment is required and online is the only option */}
        {(!paymentRequired || !onlinePaymentEnabled) && (
          <FormControlLabel
            value="pay_at_business"
            control={<Radio />}
            label="Pay at business"
          />
        )}

        {/* Online payment */}
        {onlinePaymentEnabled && (
          <FormControlLabel
            value="online"
            control={<Radio />}
            label={paymentRequired ? "Pay online (required)" : "Pay online"}
          />
        )}

        {/* Package credit */}
        {packageOptions.length > 0 && (
          <FormControlLabel
            value="package_credit"
            control={<Radio />}
            label="Use package credit"
          />
        )}

        {/* Gift card */}
        {giftCardsEnabled && (
          <FormControlLabel
            value="gift_card"
            control={<Radio />}
            label="Redeem gift card"
          />
        )}
      </RadioGroup>

      {/* Package selection details */}
      {selectedMethod === "package_credit" && packageOptions.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Select package</Typography>
          <Stack spacing={1}>
            {packageOptions.map((pkg) => (
              <Box
                key={pkg.customerPackageId}
                onClick={() => setSelectedPackage(pkg)}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: selectedPackage?.customerPackageId === pkg.customerPackageId ? "primary.main" : "divider",
                  cursor: "pointer",
                  "&:hover": { borderColor: "primary.light" },
                }}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPackage?.customerPackageId === pkg.customerPackageId}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPackage(pkg); } }}
              >
                <Typography variant="body2" fontWeight={600}>{pkg.packageName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {pkg.creditsRemaining} credits remaining ({pkg.creditsRequired} required)
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Gift card entry */}
      {selectedMethod === "gift_card" && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          {giftCardReservation ? (
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={`${giftCardReservation.codePrefix}••••`}
                  color="success"
                  size="small"
                  onDelete={handleRemoveGiftCard}
                />
                <Typography variant="body2" color="success.main" fontWeight={600}>
                  Applied: {formatMinorAmount(giftCardReservation.reservedAmount, giftCardReservation.currency)}
                </Typography>
              </Stack>
              {giftCardReservation.reservedAmount < servicePrice && (
                <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                  Remaining {formatMinorAmount(servicePrice - giftCardReservation.reservedAmount, serviceCurrency)} to be paid at business.
                </Alert>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Enter gift card code</Typography>
              {giftCardError && (
                <Alert severity="error" sx={{ mb: 1.5 }}>{giftCardError}</Alert>
              )}
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="GS-XXXX-XXXX-XXXX-XXXX"
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value)}
                  disabled={giftCardValidating}
                  inputProps={{
                    "aria-label": "Gift card code",
                    autoComplete: "off",
                    spellCheck: false,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleValidateGiftCard();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleValidateGiftCard}
                  disabled={giftCardValidating || !giftCardCode.trim()}
                  sx={{ minWidth: 80 }}
                >
                  {giftCardValidating ? <CircularProgress size={20} /> : "Apply"}
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      )}

      {/* Continue */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={onBack} variant="text">Back</Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          variant="contained"
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMinorAmount(minorUnits: number, currency: string): string {
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}
