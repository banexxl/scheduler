"use client";

/**
 * Homepage Builder Client Page — Milestone 16.4.
 *
 * Accordion-based editor for all homepage sections.
 */

import { useState, useCallback, useTransition } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HeroEditor from "@/features/homepage-builder/components/HeroEditor";
import AboutEditor from "@/features/homepage-builder/components/AboutEditor";
import GalleryEditor from "@/features/homepage-builder/components/GalleryEditor";
import TestimonialEditor from "@/features/homepage-builder/components/TestimonialEditor";
import SectionOrderEditor from "@/features/homepage-builder/components/SectionOrderEditor";
import { getHomepageContent } from "@/features/homepage-builder/actions/homepage-actions";
import type { HomepageData } from "@/features/homepage-builder/types";

type Props = {
  tenantSlug: string;
  initialData: HomepageData;
};

export default function HomepageBuilderClient({ tenantSlug, initialData }: Props) {
  const [data, setData] = useState<HomepageData>(initialData);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getHomepageContent(tenantSlug);
      if (result.success) setData(result.data);
    });
  }, [tenantSlug]);

  const vis = data.content.sectionVisibility;

  return (
    <>
      {/* Hero */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Hero</Typography>
          <VisibilityChip visible={vis.hero} />
        </AccordionSummary>
        <AccordionDetails>
          <HeroEditor tenantSlug={tenantSlug} content={data.content} onSaved={refresh} />
        </AccordionDetails>
      </Accordion>

      {/* About */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>About</Typography>
          <VisibilityChip visible={vis.about} />
        </AccordionSummary>
        <AccordionDetails>
          <AboutEditor tenantSlug={tenantSlug} content={data.content} onSaved={refresh} />
        </AccordionDetails>
      </Accordion>

      {/* Gallery */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Gallery</Typography>
          <VisibilityChip visible={vis.gallery} />
        </AccordionSummary>
        <AccordionDetails>
          <GalleryEditor tenantSlug={tenantSlug} images={data.gallery} onChanged={refresh} />
        </AccordionDetails>
      </Accordion>

      {/* Testimonials */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Testimonials</Typography>
          <VisibilityChip visible={vis.testimonials} />
        </AccordionSummary>
        <AccordionDetails>
          <TestimonialEditor tenantSlug={tenantSlug} testimonials={data.testimonials} onChanged={refresh} />
        </AccordionDetails>
      </Accordion>

      {/* Section Order */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Section Order &amp; Visibility</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <SectionOrderEditor tenantSlug={tenantSlug} content={data.content} onChanged={refresh} />
        </AccordionDetails>
      </Accordion>
    </>
  );
}

function VisibilityChip({ visible }: { visible: boolean }) {
  return (
    <Chip
      label={visible ? "Visible" : "Hidden"}
      size="small"
      color={visible ? "success" : "default"}
      variant="outlined"
      sx={{ ml: 1.5, height: 22, fontSize: "0.7rem" }}
    />
  );
}
