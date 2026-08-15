"use client";

/**
 * Public Site Editor Client — Milestone 15.13.
 *
 * Interactive editor for tenant public website configuration.
 * Supports:
 * - Hero section editing
 * - Section reordering (up/down buttons)
 * - Section enable/disable toggles
 * - About content editing
 * - Featured service selection
 * - FAQ management (add/edit/remove)
 * - Social links management
 * - SEO metadata editing
 * - Save draft / publish workflow
 * - Unpublished changes indicator
 */

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import FormControlLabel from "@mui/material/FormControlLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import {
  saveSiteDraftAction,
  publishSiteConfigAction,
} from "@/features/public-site/actions/site-config-actions";
import type {
  TenantPublicSiteConfig,
  SocialLink,
  SiteSectionType,
} from "@/features/public-site/types/site-config";
import { ALLOWED_SOCIAL_PLATFORMS, SITE_CONFIG_LIMITS } from "@/features/public-site/types/site-config";

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  tenantSlug: string;
  draftConfig: TenantPublicSiteConfig;
  draftVersion: number;
  publishedVersion: number;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  availableServices: Array<{ id: string; name: string }>;
};

// ─── Section Labels ──────────────────────────────────────────────────────────

const SECTION_LABELS: Record<SiteSectionType, string> = {
  hero: "Hero",
  services: "Services",
  about: "About",
  staff: "Team",
  gallery: "Gallery",
  reviews: "Reviews",
  locations: "Locations",
  gift_cards: "Gift Cards",
  faq: "FAQ",
  contact: "Contact",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PublicSiteEditorClient({
  tenantSlug,
  draftConfig: initialConfig,
  draftVersion: initialDraftVersion,
  publishedVersion,
  publishedAt,
  hasUnpublishedChanges: initialHasChanges,
  availableServices,
}: Props) {
  const [config, setConfig] = useState<TenantPublicSiteConfig>(initialConfig);
  const [, setDraftVersion] = useState(initialDraftVersion);
  const [hasChanges, setHasChanges] = useState(initialHasChanges);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── Update Helpers ──────────────────────────────────────────────────

  const updateConfig = useCallback((updater: (prev: TenantPublicSiteConfig) => TenantPublicSiteConfig) => {
    setConfig(prev => {
      const next = updater(prev);
      setHasChanges(true);
      return next;
    });
  }, []);

  // ─── Save Draft ────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await saveSiteDraftAction(tenantSlug, config);
    setSaving(false);

    if (result.success) {
      setDraftVersion(result.draftVersion);
      setHasChanges(true); // Still unpublished
      setMessage({ type: "success", text: "Draft saved." });
      toast.success("Draft saved!");
    } else {
      setMessage({ type: "error", text: result.error });
      toast.error(result.error);
    }
  }, [tenantSlug, config]);

  // ─── Publish ───────────────────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setMessage(null);

    // Save first to ensure draft is current
    const saveResult = await saveSiteDraftAction(tenantSlug, config);
    if (!saveResult.success) {
      setPublishing(false);
      setMessage({ type: "error", text: saveResult.error });
      return;
    }

    const version = saveResult.draftVersion;
    setDraftVersion(version);

    const publishResult = await publishSiteConfigAction(tenantSlug, version);
    setPublishing(false);

    if (publishResult.success) {
      setHasChanges(false);
      setMessage({ type: "success", text: "Published! Your public website has been updated." });
      toast.success("Published!");
    } else {
      setMessage({ type: "error", text: publishResult.error });
      toast.error(publishResult.error);
    }
  }, [tenantSlug, config]);

  // ─── Section Reorder ───────────────────────────────────────────────────

  const moveSection = useCallback((index: number, direction: "up" | "down") => {
    updateConfig(prev => {
      const sections = [...prev.sections];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= sections.length) return prev;
      [sections[index], sections[target]] = [sections[target]!, sections[index]!];
      return { ...prev, sections };
    });
  }, [updateConfig]);

  const toggleSection = useCallback((index: number) => {
    updateConfig(prev => {
      const sections = prev.sections.map((s, i) =>
        i === index ? { ...s, enabled: !s.enabled } : s
      );
      return { ...prev, sections };
    });
  }, [updateConfig]);

  // ─── FAQ Management ────────────────────────────────────────────────────

  const addFaq = useCallback(() => {
    if (config.faq.length >= SITE_CONFIG_LIMITS.faqMaxEntries) return;
    updateConfig(prev => ({ ...prev, faq: [...prev.faq, { question: "", answer: "" }] }));
  }, [config.faq.length, updateConfig]);

  const updateFaq = useCallback((index: number, field: "question" | "answer", value: string) => {
    updateConfig(prev => {
      const faq = prev.faq.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      );
      return { ...prev, faq };
    });
  }, [updateConfig]);

  const removeFaq = useCallback((index: number) => {
    updateConfig(prev => ({ ...prev, faq: prev.faq.filter((_, i) => i !== index) }));
  }, [updateConfig]);

  // ─── Social Links ─────────────────────────────────────────────────────

  const updateSocialLink = useCallback((platform: string, url: string) => {
    updateConfig(prev => {
      const existing = prev.socialLinks.filter(l => l.platform !== platform);
      if (url.trim()) {
        existing.push({ platform: platform as SocialLink["platform"], url: url.trim() });
      }
      return { ...prev, socialLinks: existing };
    });
  }, [updateConfig]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Status bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box>
          {hasChanges ? (
            <Chip label="Unpublished changes" color="warning" size="small" />
          ) : publishedVersion > 0 ? (
            <Chip label="Published" color="success" size="small" />
          ) : (
            <Chip label="Not published" size="small" />
          )}
          {publishedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              Last published: {new Date(publishedAt).toLocaleDateString()}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={handleSave} disabled={saving || publishing} variant="outlined" size="small">
            {saving ? <CircularProgress size={16} /> : "Save Draft"}
          </Button>
          <Button onClick={handlePublish} disabled={saving || publishing} variant="contained" size="small">
            {publishing ? <CircularProgress size={16} /> : "Publish"}
          </Button>
        </Stack>
      </Paper>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Hero Section */}
      <Accordion defaultExpanded>
        <AccordionSummary aria-controls="hero-content" id="hero-header">
          <Typography fontWeight={600}>Hero Section</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={config.hero.enabled} onChange={(e) => updateConfig(prev => ({ ...prev, hero: { ...prev.hero, enabled: e.target.checked } }))} />}
              label="Show hero section"
            />
            <TextField
              label="Headline"
              value={config.hero.headline ?? ""}
              onChange={(e) => updateConfig(prev => ({ ...prev, hero: { ...prev.hero, headline: e.target.value || null } }))}
              inputProps={{ maxLength: SITE_CONFIG_LIMITS.heroHeadline }}
              helperText={`${(config.hero.headline ?? "").length}/${SITE_CONFIG_LIMITS.heroHeadline}`}
              fullWidth size="small"
            />
            <TextField
              label="Subheadline"
              value={config.hero.subheadline ?? ""}
              onChange={(e) => updateConfig(prev => ({ ...prev, hero: { ...prev.hero, subheadline: e.target.value || null } }))}
              inputProps={{ maxLength: SITE_CONFIG_LIMITS.heroSubheadline }}
              multiline rows={2} fullWidth size="small"
            />
            <TextField
              label="Primary CTA Label"
              value={config.hero.primaryCtaLabel ?? "Book Now"}
              onChange={(e) => updateConfig(prev => ({ ...prev, hero: { ...prev.hero, primaryCtaLabel: e.target.value || null } }))}
              inputProps={{ maxLength: SITE_CONFIG_LIMITS.heroCtaLabel }}
              fullWidth size="small"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Section Ordering */}
      <Accordion defaultExpanded>
        <AccordionSummary aria-controls="sections-content" id="sections-header">
          <Typography fontWeight={600}>Homepage Sections</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enable, disable, and reorder sections on your public homepage.
          </Typography>
          <Stack spacing={1}>
            {config.sections.map((section, index) => (
              <Paper key={section.type} variant="outlined" sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <Switch
                  checked={section.enabled}
                  onChange={() => toggleSection(index)}
                  size="small"
                  inputProps={{ "aria-label": `Toggle ${SECTION_LABELS[section.type]}` }}
                />
                <Typography variant="body2" sx={{ flex: 1, fontWeight: section.enabled ? 600 : 400, color: section.enabled ? "text.primary" : "text.disabled" }}>
                  {SECTION_LABELS[section.type]}
                </Typography>
                <IconButton size="small" onClick={() => moveSection(index, "up")} disabled={index === 0} aria-label="Move up">
                  <span>↑</span>
                </IconButton>
                <IconButton size="small" onClick={() => moveSection(index, "down")} disabled={index === config.sections.length - 1} aria-label="Move down">
                  <span>↓</span>
                </IconButton>
              </Paper>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* About Section */}
      <Accordion>
        <AccordionSummary aria-controls="about-content" id="about-header">
          <Typography fontWeight={600}>About</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={config.about.title ?? ""}
              onChange={(e) => updateConfig(prev => ({ ...prev, about: { ...prev.about, title: e.target.value || null } }))}
              inputProps={{ maxLength: SITE_CONFIG_LIMITS.aboutTitle }}
              fullWidth size="small"
            />
            <TextField
              label="About your business"
              value={config.about.body ?? ""}
              onChange={(e) => updateConfig(prev => ({ ...prev, about: { ...prev.about, body: e.target.value || null } }))}
              inputProps={{ maxLength: SITE_CONFIG_LIMITS.aboutBody }}
              helperText={`${(config.about.body ?? "").length}/${SITE_CONFIG_LIMITS.aboutBody}`}
              multiline rows={5} fullWidth size="small"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Services Config */}
      <Accordion>
        <AccordionSummary aria-controls="services-content" id="services-header">
          <Typography fontWeight={600}>Services</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              label="Section Heading"
              value={config.services.heading ?? ""}
              onChange={(e) => updateConfig(prev => ({ ...prev, services: { ...prev.services, heading: e.target.value || null } }))}
              fullWidth size="small"
              placeholder="Our Services"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Display Mode</InputLabel>
              <Select
                value={config.services.displayMode}
                label="Display Mode"
                onChange={(e) => updateConfig(prev => ({ ...prev, services: { ...prev.services, displayMode: e.target.value as "grid" | "list" } }))}
              >
                <MenuItem value="grid">Grid</MenuItem>
                <MenuItem value="list">List</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={config.services.showCategories} onChange={(e) => updateConfig(prev => ({ ...prev, services: { ...prev.services, showCategories: e.target.checked } }))} />}
              label="Group by category"
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Featured Services</Typography>
              <Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap>
                {availableServices.map(svc => {
                  const isFeatured = config.services.featuredServiceIds.includes(svc.id);
                  return (
                    <Chip
                      key={svc.id}
                      label={svc.name}
                      size="small"
                      variant={isFeatured ? "filled" : "outlined"}
                      color={isFeatured ? "primary" : "default"}
                      onClick={() => {
                        updateConfig(prev => {
                          const ids = prev.services.featuredServiceIds;
                          const next = isFeatured
                            ? ids.filter(id => id !== svc.id)
                            : [...ids, svc.id].slice(0, SITE_CONFIG_LIMITS.featuredServicesMax);
                          return { ...prev, services: { ...prev.services, featuredServiceIds: next } };
                        });
                      }}
                    />
                  );
                })}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Featured services appear first. Click to toggle.
              </Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* FAQ */}
      <Accordion>
        <AccordionSummary aria-controls="faq-content" id="faq-header">
          <Typography fontWeight={600}>FAQ ({config.faq.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {config.faq.map((entry, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <TextField
                    label={`Question ${index + 1}`}
                    value={entry.question}
                    onChange={(e) => updateFaq(index, "question", e.target.value)}
                    inputProps={{ maxLength: SITE_CONFIG_LIMITS.faqQuestion }}
                    fullWidth size="small"
                  />
                  <TextField
                    label="Answer"
                    value={entry.answer}
                    onChange={(e) => updateFaq(index, "answer", e.target.value)}
                    inputProps={{ maxLength: SITE_CONFIG_LIMITS.faqAnswer }}
                    multiline rows={3} fullWidth size="small"
                  />
                  <Button size="small" color="error" onClick={() => removeFaq(index)} sx={{ alignSelf: "flex-start" }}>
                    Remove
                  </Button>
                </Stack>
              </Paper>
            ))}
            <Button
              size="small"
              variant="outlined"
              onClick={addFaq}
              disabled={config.faq.length >= SITE_CONFIG_LIMITS.faqMaxEntries}
            >
              Add FAQ Entry
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Social Links */}
      <Accordion>
        <AccordionSummary aria-controls="social-content" id="social-header">
          <Typography fontWeight={600}>Social & Contact Links</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {ALLOWED_SOCIAL_PLATFORMS.map(platform => {
              const existing = config.socialLinks.find(l => l.platform === platform);
              return (
                <TextField
                  key={platform}
                  label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                  value={existing?.url ?? ""}
                  onChange={(e) => updateSocialLink(platform, e.target.value)}
                  placeholder={`https://${platform === "website" ? "www.example.com" : platform + ".com/..."}`}
                  fullWidth size="small"
                  inputProps={{ maxLength: SITE_CONFIG_LIMITS.socialUrlMax }}
                />
              );
            })}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* SEO */}
      <Accordion>
        <AccordionSummary aria-controls="seo-content" id="seo-header">
          <Typography fontWeight={600}>SEO</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              label="Page Title"
              value={config.seo.metaTitle ?? ""}
              onChange={(e) => updateConfig(prev => ({ ...prev, seo: { ...prev.seo, metaTitle: e.target.value || null } }))}
              inputProps={{ maxLength: SITE_CONFIG_LIMITS.seoMetaTitle }}
              helperText={`${(config.seo.metaTitle ?? "").length}/${SITE_CONFIG_LIMITS.seoMetaTitle} — Leave blank for auto-generated title`}
              fullWidth size="small"
            />
            <TextField
              label="Meta Description"
              value={config.seo.metaDescription ?? ""}
              onChange={(e) => updateConfig(prev => ({ ...prev, seo: { ...prev.seo, metaDescription: e.target.value || null } }))}
              inputProps={{ maxLength: SITE_CONFIG_LIMITS.seoMetaDescription }}
              helperText={`${(config.seo.metaDescription ?? "").length}/${SITE_CONFIG_LIMITS.seoMetaDescription}`}
              multiline rows={2} fullWidth size="small"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Bottom actions */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={handleSave} disabled={saving || publishing} variant="outlined">
          {saving ? <CircularProgress size={18} /> : "Save Draft"}
        </Button>
        <Button onClick={handlePublish} disabled={saving || publishing} variant="contained">
          {publishing ? <CircularProgress size={18} /> : "Publish"}
        </Button>
      </Paper>
    </Box>
  );
}
