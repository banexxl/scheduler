import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import NextLink from "next/link";

type GettingStartedCardProps = {
  tenantSlug: string;
};

/**
 * Getting started section with next action links for new business owners.
 */
export default function GettingStartedCard({
  tenantSlug,
}: GettingStartedCardProps) {
  const steps = [
    {
      label: "Complete business settings",
      href: `/${tenantSlug}/settings`,
    },
    {
      label: "Review primary location",
      href: `/${tenantSlug}/locations`,
    },
    {
      label: "Add team members",
      href: `/${tenantSlug}/team`,
    },
    {
      label: "Services — coming later",
      href: null,
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Getting Started
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {steps.map((step) => (
          <Box component="li" key={step.label} sx={{ mb: 0.75 }}>
            {step.href ? (
              <Link component={NextLink} href={step.href} variant="body2">
                {step.label}
              </Link>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {step.label}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
