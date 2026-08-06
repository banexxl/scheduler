"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

type Props = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export default function PublicCustomerStep({
  customerName, customerEmail, customerPhone, customerNotes,
  onChangeName, onChangeEmail, onChangePhone, onChangeNotes,
  onSubmit, onBack,
}: Props) {
  const canContinue = customerName.trim().length >= 1;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Your details</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Full Name"
          value={customerName}
          onChange={(e) => onChangeName(e.target.value)}
          required
          fullWidth
          size="small"
          inputProps={{ maxLength: 160 }}
        />
        <TextField
          label="Email"
          type="email"
          value={customerEmail}
          onChange={(e) => onChangeEmail(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Phone"
          value={customerPhone}
          onChange={(e) => onChangePhone(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Notes (optional)"
          value={customerNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          fullWidth
          multiline
          rows={2}
          size="small"
          inputProps={{ maxLength: 2000 }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={onBack} variant="text">Back</Button>
        <Button onClick={onSubmit} disabled={!canContinue} variant="contained">Continue</Button>
      </Box>
    </Box>
  );
}
