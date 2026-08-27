"use client";

/**
 * Service Category — Milestone 17.0.
 *
 * Accordion group of services under a category header.
 */

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ServiceCard from "./ServiceCard";
import type { SelectedService } from "../types";

type Props = {
  categoryName: string;
  services: SelectedService[];
  selectedIds: Set<string>;
  onToggle: (service: SelectedService) => void;
};

export default function ServiceCategoryGroup({
  categoryName,
  services,
  selectedIds,
  onToggle,
}: Props) {
  const selectedCount = services.filter((s) => selectedIds.has(s.id)).length;

  return (
    <Accordion defaultExpanded disableGutters variant="outlined" sx={{ "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {categoryName}
        </Typography>
        {selectedCount > 0 && (
          <Chip label={`${selectedCount} selected`} size="small" color="primary" sx={{ mr: 1 }} />
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={1}>
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              selected={selectedIds.has(svc.id)}
              onToggle={onToggle}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
