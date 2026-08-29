import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { platformTypography, platformPalette, platformSurface } from "@/styles/theme/platform-admin-tokens";

/**
 * Section Card — Premium Dark Theme.
 */

type SectionCardProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
};

export default function SectionCard({
  title,
  description,
  action,
  children,
  noPadding,
}: SectionCardProps) {
  return (
    <Box
      sx={{
        border: platformSurface.border,
        borderRadius: `16px`,
        bgcolor: platformPalette.page.surface,
        overflow: "hidden",
      }}
    >
      {(title || action) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: title ? platformSurface.border : undefined,
          }}
        >
          <Box>
            {title && (
              <Typography sx={platformTypography.sectionTitle}>{title}</Typography>
            )}
            {description && (
              <Typography sx={{ ...platformTypography.secondary, mt: 0.25 }}>
                {description}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={noPadding ? undefined : { p: 2.5 }}>
        {children}
      </Box>
    </Box>
  );
}
