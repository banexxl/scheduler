"use client";

/**
 * Section Order & Visibility Editor — Milestone 16.4.
 *
 * Toggle section visibility and reorder sections via up/down buttons.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { updateHomepageContent } from "../actions/homepage-actions";
import {
  HOMEPAGE_SECTION_LABELS,
  type HomepageContent,
  type HomepageSectionId,
} from "../types";

type Props = {
  tenantSlug: string;
  content: HomepageContent;
  onChanged: () => void;
};

export default function SectionOrderEditor({ tenantSlug, content, onChanged }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<HomepageSectionId[]>(content.sectionOrder);
  const [visibility, setVisibility] = useState<Record<HomepageSectionId, boolean>>(content.sectionVisibility);

  const handleToggle = (sectionId: HomepageSectionId) => {
    const next = { ...visibility, [sectionId]: !visibility[sectionId] };
    setVisibility(next);
    setError(null);
    startTransition(async () => {
      const r = await updateHomepageContent(tenantSlug, { sectionVisibility: next });
      if (r.success) onChanged();
      else setError(r.message);
    });
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    setOrder(next);
    setError(null);
    startTransition(async () => {
      const r = await updateHomepageContent(tenantSlug, { sectionOrder: next });
      if (r.success) onChanged();
      else setError(r.message);
    });
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <List dense>
        {order.map((sectionId, idx) => (
          <ListItem
            key={sectionId}
            sx={{
              bgcolor: visibility[sectionId] ? "action.hover" : "transparent",
              borderRadius: 1,
              mb: 0.5,
              opacity: visibility[sectionId] ? 1 : 0.5,
            }}
            secondaryAction={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <IconButton
                  size="small"
                  disabled={isPending || idx === 0}
                  onClick={() => handleMove(idx, -1)}
                  aria-label={`Move ${HOMEPAGE_SECTION_LABELS[sectionId]} up`}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={isPending || idx === order.length - 1}
                  onClick={() => handleMove(idx, 1)}
                  aria-label={`Move ${HOMEPAGE_SECTION_LABELS[sectionId]} down`}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <Switch
                  checked={visibility[sectionId]}
                  onChange={() => handleToggle(sectionId)}
                  disabled={isPending}
                  size="small"
                  inputProps={{ "aria-label": `Toggle ${HOMEPAGE_SECTION_LABELS[sectionId]}` }}
                />
              </Box>
            }
          >
            <ListItemText primary={HOMEPAGE_SECTION_LABELS[sectionId]} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
