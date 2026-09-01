"use client";

/**
 * UserMenu — header account dropdown.
 *
 * Renders an avatar button that opens a menu showing the signed-in email and a
 * Logout action. Logout submits the provided server action via a hidden form so
 * the existing auth flow (cookie clearing + redirect) is reused unchanged.
 *
 * Optional `role` renders a small chip in the menu header.
 */

import { useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import LogoutIcon from "@mui/icons-material/Logout";

type Props = {
  email: string;
  role?: string;
  logoutAction: () => Promise<void>;
};

function initialFor(email: string): string {
  const trimmed = email.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

export default function UserMenu({ email, role, logoutAction }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const open = Boolean(anchorEl);

  const handleLogout = () => {
    setAnchorEl(null);
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          size="small"
          aria-label="Account menu"
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ p: 0.5 }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: "0.875rem",
              bgcolor: "#8B5CF6",
              color: "#fff",
            }}
          >
            {initialFor(email)}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", lineHeight: 1.2 }}
          >
            Signed in as
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, wordBreak: "break-all", lineHeight: 1.3 }}
          >
            {email || "Unknown user"}
          </Typography>
          {role && (
            <Chip
              label={role}
              size="small"
              variant="outlined"
              sx={{ mt: 0.75, fontSize: "0.7rem", height: 22 }}
            />
          )}
        </Box>

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Hidden form drives the existing logout server action. */}
      <form ref={formRef} action={logoutAction} style={{ display: "none" }} />
    </>
  );
}
