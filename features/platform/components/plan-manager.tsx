"use client";

/**
 * Plan Manager — client container for the platform billing plans screen.
 *
 * Owns the "selected plan" state that links the plan list to the form:
 * - Clicking a plan row selects it and switches the form into edit/update mode.
 * - Submitting or cancelling clears the selection, returning the form to create mode.
 *
 * All mutations run through server actions passed in as props from the page.
 */

import { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import CreatePlanForm, { type EditablePlan } from "./create-plan-form";
import PlanActionButtons from "./plan-action-buttons";
import type { PlatformBillingPlanSummary } from "../types/platform-billing-admin";

type Props = {
  plans: PlatformBillingPlanSummary[];
  createAction: (formData: FormData) => Promise<string | null>;
  updateAction: (formData: FormData) => Promise<string | null>;
  onToggleActive: (planId: string, nextState: boolean) => Promise<void>;
  onTogglePublic: (planId: string, nextState: boolean) => Promise<void>;
  onDelete: (planId: string) => Promise<void>;
  onRefresh: (polarProductId: string) => Promise<void>;
};

function toEditablePlan(plan: PlatformBillingPlanSummary): EditablePlan {
  // Prefill pricing from the first active price, if any.
  const price = plan.prices[0] ?? null;
  const interval = price?.billingInterval;
  return {
    id: plan.id,
    planKey: plan.planKey,
    name: plan.name,
    description: plan.description,
    isFree: plan.isFree,
    isActive: plan.isActive,
    isPublic: plan.isPublic,
    sortOrder: plan.sortOrder,
    priceAmount: price?.amount ?? null,
    priceCurrency: price?.currency ?? null,
    isRecurring: price?.isRecurring ?? true,
    recurringInterval: interval === "year" ? "year" : interval === "month" ? "month" : null,
    recurringIntervalCount: price?.billingIntervalCount ?? 1,
    trialDays: plan.trialDays,
  };
}

export default function PlanManager({
  plans,
  createAction,
  updateAction,
  onToggleActive,
  onTogglePublic,
  onDelete,
  onRefresh,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPlan = plans.find((p) => p.id === selectedId) ?? null;

  function handleSelect(planId: string) {
    setSelectedId((prev) => (prev === planId ? null : planId));
    // Bring the form into view when selecting from a long list.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {selectedPlan ? "Edit Plan" : "Create Plan"}
        </Typography>
        {/* `key` remounts the form when the selection changes, so its internal
            state and uncontrolled inputs re-initialize from the selected plan. */}
        <CreatePlanForm
          key={selectedId ?? "create"}
          action={createAction}
          updateAction={updateAction}
          selectedPlan={selectedPlan ? toEditablePlan(selectedPlan) : null}
          onDone={() => setSelectedId(null)}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Plan List
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          Click a plan to load it into the form above for editing.
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Plan</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Interval</TableCell>
                <TableCell>Trial</TableCell>
                <TableCell>Mapping</TableCell>
                <TableCell>Sort</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((plan) => {
                const isSelected = plan.id === selectedId;
                return (
                  <TableRow
                    key={plan.id}
                    hover
                    selected={isSelected}
                    onClick={() => handleSelect(plan.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>{plan.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plan.planKey}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {plan.isFree ? <Chip size="small" label="free" /> : null}
                        {plan.isActive ? <Chip size="small" label="active" color="success" /> : <Chip size="small" label="inactive" />}
                        {plan.isPublic ? <Chip size="small" label="public" color="info" /> : <Chip size="small" label="hidden" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {plan.isFree ? (
                        <Typography variant="body2" color="text.secondary">Free</Typography>
                      ) : plan.prices.length > 0 ? (
                        <Stack spacing={0.25}>
                          {plan.prices.map((p, idx) => (
                            <Typography key={idx} variant="body2">
                              {p.amount != null
                                ? `${(p.amount / 100).toFixed(2)} ${(p.currency ?? "").toUpperCase()}`
                                : "—"}
                            </Typography>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No price</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.isFree ? (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      ) : plan.prices.length > 0 ? (
                        <Stack spacing={0.25}>
                          {plan.prices.map((p, idx) => (
                            <Typography key={idx} variant="body2">
                              {p.isRecurring
                                ? `${p.billingInterval ?? "month"}${(p.billingIntervalCount ?? 1) > 1 ? ` ×${p.billingIntervalCount}` : ""}`
                                : "one-time"}
                            </Typography>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.trialDays != null && plan.trialDays > 0 ? (
                        <Chip size="small" label={`${plan.trialDays}d trial`} variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>{plan.polarProductId ?? "Not mapped"}</TableCell>
                    <TableCell>{plan.sortOrder}</TableCell>
                    {/* Stop row-click propagation so action buttons don't also select the row. */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box>
                        <PlanActionButtons
                          plan={{
                            id: plan.id,
                            name: plan.name,
                            planKey: plan.planKey,
                            isActive: plan.isActive,
                            isPublic: plan.isPublic,
                            polarProductId: plan.polarProductId ?? null,
                          }}
                          onToggleActive={onToggleActive}
                          onTogglePublic={onTogglePublic}
                          onDelete={onDelete}
                          onRefresh={onRefresh}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
