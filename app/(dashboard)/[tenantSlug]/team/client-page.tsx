"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  inviteTenantMemberAction,
  revokeTenantInvitationAction,
  removeTenantMemberAction,
} from "@/features/team/actions/team-actions";
import type { TeamPageData, TenantRole } from "@/features/team/types/team";

type Props = { tenantSlug: string; data: TeamPageData };

export default function TeamClientPage({ tenantSlug, data }: Props) {
  const { members, invitations, currentMemberRole, currentMemberId } = data;
  const canManage = ["owner", "admin"].includes(currentMemberRole);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("staff");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleInvite() {
    setSaving(true);
    setMessage(null);
    const result = await inviteTenantMemberAction(tenantSlug, { email, role });
    setSaving(false);
    if (result.success) {
      setMessage("Invitation sent.");
      setInviteOpen(false);
      setEmail("");
    } else {
      setMessage(result.error);
    }
  }

  async function handleRevoke(id: string) {
    await revokeTenantInvitationAction(tenantSlug, id);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this team member?")) return;
    const result = await removeTenantMemberAction(tenantSlug, id);
    if (!result.success) alert(result.error);
  }

  return (
    <Box>
      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

      {/* Members */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Members ({members.length})</Typography>
          {canManage && <Button variant="contained" size="small" onClick={() => setInviteOpen(true)}>Invite</Button>}
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Joined</TableCell>
                {canManage && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.displayName ?? "—"}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell><Chip label={m.role} size="small" /></TableCell>
                  <TableCell>{new Date(m.joinedAt).toLocaleDateString()}</TableCell>
                  {canManage && (
                    <TableCell>
                      {m.id !== currentMemberId && (
                        <Button size="small" color="error" onClick={() => handleRemove(m.id)}>Remove</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pending Invitations */}
      {canManage && invitations.length > 0 && (
        <Paper variant="outlined">
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Pending Invitations ({invitations.length})</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell><Chip label={inv.role} size="small" variant="outlined" /></TableCell>
                    <TableCell>{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => handleRevoke(inv.id)}>Revoke</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth autoFocus />
            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value as TenantRole)} fullWidth SelectProps={{ native: true }}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              {currentMemberRole === "owner" && <option value="admin">Admin</option>}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} variant="contained" disabled={saving || !email}>
            {saving ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
