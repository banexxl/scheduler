"use client";

/**
 * Reminder Rules Section — Milestone 6.13.
 *
 * Displays and manages reminder rules on the notification settings page.
 * Supports add, edit, toggle active, and delete with presets.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import {
  createReminderRuleAction,
  updateReminderRuleAction,
  toggleReminderRuleAction,
  deleteReminderRuleAction,
} from "../actions/reminder-rule-actions";
import {
  formatReminderOffset,
  fromOffsetMinutes,
  REMINDER_OFFSET_PRESETS,
  type ReminderRuleListItem,
} from "../types/notification";

type Props = {
  tenantSlug: string;
  rules: ReminderRuleListItem[];
};

export default function ReminderRulesSection({ tenantSlug, rules: initialRules }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRuleListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReminderRuleListItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState<number>(24);
  const [formUnit, setFormUnit] = useState("hours");

  const resetForm = () => {
    setFormName("");
    setFormAmount(24);
    setFormUnit("hours");
  };

  const openAdd = () => {
    resetForm();
    setEditingRule(null);
    setShowAddDialog(true);
  };

  const openEdit = (rule: ReminderRuleListItem) => {
    const { amount, unit } = fromOffsetMinutes(rule.offsetMinutes);
    setFormName(rule.name);
    setFormAmount(amount);
    setFormUnit(unit);
    setEditingRule(rule);
    setShowAddDialog(true);
  };

  const applyPreset = (preset: typeof REMINDER_OFFSET_PRESETS[number]) => {
    const { amount, unit } = fromOffsetMinutes(preset.offsetMinutes);
    setFormName(preset.label);
    setFormAmount(amount);
    setFormUnit(unit);
  };

  const handleSave = () => {
    setFeedback(null);
    startTransition(async () => {
      const input = { name: formName, offsetAmount: formAmount, offsetUnit: formUnit };

      const result = editingRule
        ? await updateReminderRuleAction(tenantSlug, editingRule.id, input)
        : await createReminderRuleAction(tenantSlug, input);

      if (result.success) {
        setFeedback({ type: "success", message: editingRule ? "Rule updated." : "Rule created." });
        setShowAddDialog(false);
        resetForm();
        setEditingRule(null);
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  };

  const handleToggle = (rule: ReminderRuleListItem, active: boolean) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleReminderRuleAction(tenantSlug, rule.id, active);
      if (result.success) {
        setFeedback({
          type: "success",
          message: active ? "Rule enabled." : "Rule disabled. Pending reminders cancelled.",
        });
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteReminderRuleAction(tenantSlug, deleteTarget.id);
      if (result.success) {
        setFeedback({ type: "success", message: "Rule deleted." });
      } else {
        setFeedback({ type: "error", message: result.error });
      }
      setDeleteTarget(null);
    });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Appointment Reminders</Typography>
        <Button variant="outlined" size="small" onClick={openAdd} disabled={isPending}>
          Add Reminder
        </Button>
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {initialRules.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No reminder rules configured. Add a rule to automatically send email reminders before appointments.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Timing</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {initialRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${formatReminderOffset(rule.offsetMinutes)} before`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                      {rule.channel}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.isActive}
                      onChange={(e) => handleToggle(rule, e.target.checked)}
                      disabled={isPending}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(rule)} disabled={isPending}>
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteTarget(rule)}
                      disabled={isPending}
                      aria-label="Delete rule"
                    >
                      &times;
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? "Edit Reminder Rule" : "Add Reminder Rule"}</DialogTitle>
        <DialogContent>
          {!editingRule && (
            <Box sx={{ mb: 2, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Presets (click to apply):
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                {REMINDER_OFFSET_PRESETS.map((preset) => (
                  <Chip
                    key={preset.offsetMinutes}
                    label={preset.label}
                    size="small"
                    variant="outlined"
                    onClick={() => applyPreset(preset)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <TextField
            fullWidth
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            margin="normal"
            placeholder="e.g. 24 hours before"
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />

          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(parseInt(e.target.value, 10) || 0)}
              slotProps={{ htmlInput: { min: 1, max: 365 } }}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Unit"
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value)}
              sx={{ flex: 1 }}
            >
              <MenuItem value="minutes">Minutes</MenuItem>
              <MenuItem value="hours">Hours</MenuItem>
              <MenuItem value="days">Days</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowAddDialog(false); setEditingRule(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isPending || !formName.trim() || formAmount < 1}
          >
            {isPending ? "Saving..." : editingRule ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Reminder Rule</DialogTitle>
        <DialogContent>
          <Typography>
            Delete &quot;{deleteTarget?.name}&quot;? If this rule has reminder history,
            you may need to deactivate it instead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isPending}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
