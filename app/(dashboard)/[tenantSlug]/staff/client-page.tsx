"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import {
     createStaffProfileAction,
     updateStaffProfileAction,
     linkStaffAccountAction,
} from "@/features/staff/actions/staff-actions";
import type { StaffPageData, StaffPageRow } from "@/features/staff/types/staff";

type Props = { tenantSlug: string; data: StaffPageData };

const EMPTY_CREATE_FORM = { resourceId: "", displayName: "", jobTitle: "", tenantMemberId: "" };

export default function StaffClientPage({ tenantSlug, data }: Props) {
     const { rows, canManage, canViewSchedule, unlinkedResources, linkableMembers } = data;
     const router = useRouter();
     const [isPending, startTransition] = useTransition();
     const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
     const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);

     const [createOpen, setCreateOpen] = useState(false);
     const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

     const [editTarget, setEditTarget] = useState<StaffPageRow | null>(null);
     const [editForm, setEditForm] = useState({ displayName: "", jobTitle: "", isActive: true, isPublic: true });

     const [linkTarget, setLinkTarget] = useState<StaffPageRow | null>(null);
     const [linkMemberId, setLinkMemberId] = useState("");

     function openEdit(row: StaffPageRow) {
          setMenuAnchor(null);
          setEditTarget(row);
          setEditForm({
               displayName: row.displayName,
               jobTitle: row.jobTitle ?? "",
               isActive: row.isActive,
               isPublic: row.isPublic,
          });
     }

     function openLink(row: StaffPageRow) {
          setMenuAnchor(null);
          setLinkMemberId("");
          setLinkTarget(row);
     }

     function handleCreate() {
          setMsg(null);
          startTransition(async () => {
               const result = await createStaffProfileAction(tenantSlug, {
                    resourceId: createForm.resourceId,
                    displayName: createForm.displayName,
                    jobTitle: createForm.jobTitle || null,
                    tenantMemberId: createForm.tenantMemberId || null,
               });
               if (result.success) {
                    setCreateOpen(false);
                    setCreateForm(EMPTY_CREATE_FORM);
                    setMsg({ type: "success", text: "Staff profile created." });
                    router.refresh();
               } else {
                    setMsg({ type: "error", text: result.error });
               }
          });
     }

     function handleEditSave() {
          if (!editTarget) return;
          setMsg(null);
          startTransition(async () => {
               const result = await updateStaffProfileAction(tenantSlug, editTarget.id, {
                    displayName: editForm.displayName,
                    jobTitle: editForm.jobTitle || null,
                    isActive: editForm.isActive,
                    isPublic: editForm.isPublic,
               });
               if (result.success) {
                    setEditTarget(null);
                    setMsg({ type: "success", text: "Staff profile updated." });
                    router.refresh();
               } else {
                    setMsg({ type: "error", text: result.error });
               }
          });
     }

     function handleLinkSave() {
          if (!linkTarget || !linkMemberId) return;
          setMsg(null);
          startTransition(async () => {
               const result = await linkStaffAccountAction(tenantSlug, linkTarget.id, linkMemberId);
               if (result.success) {
                    setLinkTarget(null);
                    setMsg({ type: "success", text: "Account linked." });
                    router.refresh();
               } else {
                    setMsg({ type: "error", text: result.error });
               }
          });
     }

     function handleUnlink(row: StaffPageRow) {
          setMenuAnchor(null);
          setMsg(null);
          startTransition(async () => {
               const result = await linkStaffAccountAction(tenantSlug, row.id, null);
               setMsg(
                    result.success
                         ? { type: "success", text: "Account unlinked." }
                         : { type: "error", text: result.error }
               );
               if (result.success) router.refresh();
          });
     }

     return (
          <Box>
               {msg && (
                    <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
                         {msg.text}
                    </Alert>
               )}

               {canManage && (
                    <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                         <Button
                              variant="contained"
                              size="small"
                              disabled={unlinkedResources.length === 0}
                              onClick={() => setCreateOpen(true)}
                         >
                              New Staff Profile
                         </Button>
                    </Box>
               )}
               {canManage && unlinkedResources.length === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                         All active resources already have a staff profile. Add a new resource first to create another one.
                    </Alert>
               )}

               {rows.length === 0 ? (
                    <PlatformEmptyState
                         title="No staff profiles"
                         description="Link team members to resources to create bookable staff profiles."
                    />
               ) : (
                    rows.map((row) => (
                         <Paper
                              key={row.id}
                              variant="outlined"
                              sx={{ p: 2, mb: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
                         >
                              <Box sx={{ flex: 1, minWidth: 220 }}>
                                   <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                             {row.displayName}
                                        </Typography>
                                        <Chip label={row.isActive ? "Active" : "Inactive"} color={row.isActive ? "success" : "default"} size="small" variant="outlined" />
                                        <Chip label={row.isPublic ? "Public" : "Hidden"} size="small" variant="outlined" />
                                        <Chip
                                             label={row.account?.linked ? (row.memberEmail ?? "Linked") : "Not linked"}
                                             color={row.account?.linked ? "success" : "default"}
                                             size="small"
                                             variant="outlined"
                                        />
                                   </Box>
                                   <Typography variant="body2" color="text.secondary">
                                        {row.jobTitle ?? "—"} · {row.services.length} service{row.services.length !== 1 ? "s" : ""} · {row.locations.length} location{row.locations.length !== 1 ? "s" : ""}
                                        {canViewSchedule && row.todayAppointmentCount !== null
                                             ? ` · ${row.todayAppointmentCount} today`
                                             : ""}
                                        {row.upcomingTimeOff.length > 0 ? ` · time off scheduled` : ""}
                                   </Typography>
                              </Box>
                              {canManage && (
                                   <Box>
                                        <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: row.id })} disabled={isPending}>
                                             &#8942;
                                        </IconButton>
                                        <Menu anchorEl={menuAnchor?.id === row.id ? menuAnchor.el : null} open={menuAnchor?.id === row.id} onClose={() => setMenuAnchor(null)}>
                                             <MenuItem onClick={() => openEdit(row)}>Edit</MenuItem>
                                             {row.account?.linked ? (
                                                  <MenuItem onClick={() => handleUnlink(row)} sx={{ color: "error.main" }}>Unlink Account</MenuItem>
                                             ) : (
                                                  <MenuItem onClick={() => openLink(row)} disabled={linkableMembers.length === 0}>Link Account</MenuItem>
                                             )}
                                        </Menu>
                                   </Box>
                              )}
                         </Paper>
                    ))
               )}

               {/* Create Dialog */}
               <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>New Staff Profile</DialogTitle>
                    <DialogContent>
                         <Stack spacing={2} sx={{ mt: 1 }}>
                              <TextField
                                   select
                                   label="Resource"
                                   value={createForm.resourceId}
                                   onChange={(e) => {
                                        const resourceId = e.target.value;
                                        const resource = unlinkedResources.find((r) => r.id === resourceId);
                                        setCreateForm((f) => ({
                                             ...f,
                                             resourceId,
                                             displayName: f.displayName || resource?.name || "",
                                        }));
                                   }}
                                   fullWidth
                                   SelectProps={{ native: true }}
                              >
                                   <option value="" disabled>Select a resource</option>
                                   {unlinkedResources.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                   ))}
                              </TextField>
                              <TextField
                                   label="Display Name"
                                   value={createForm.displayName}
                                   onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                                   fullWidth
                              />
                              <TextField
                                   label="Job Title"
                                   value={createForm.jobTitle}
                                   onChange={(e) => setCreateForm((f) => ({ ...f, jobTitle: e.target.value }))}
                                   fullWidth
                              />
                              <TextField
                                   select
                                   label="Link Team Member (optional)"
                                   value={createForm.tenantMemberId}
                                   onChange={(e) => setCreateForm((f) => ({ ...f, tenantMemberId: e.target.value }))}
                                   fullWidth
                                   SelectProps={{ native: true }}
                              >
                                   <option value="">Not linked</option>
                                   {linkableMembers.map((m) => (
                                        <option key={m.id} value={m.id}>{m.email} ({m.role})</option>
                                   ))}
                              </TextField>
                         </Stack>
                    </DialogContent>
                    <DialogActions>
                         <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                         <Button
                              onClick={handleCreate}
                              variant="contained"
                              disabled={isPending || !createForm.resourceId || !createForm.displayName.trim()}
                         >
                              {isPending ? "Creating..." : "Create"}
                         </Button>
                    </DialogActions>
               </Dialog>

               {/* Edit Dialog */}
               <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
                    <DialogTitle>Edit Staff Profile</DialogTitle>
                    <DialogContent>
                         <Stack spacing={2} sx={{ mt: 1 }}>
                              <TextField
                                   label="Display Name"
                                   value={editForm.displayName}
                                   onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                                   fullWidth
                              />
                              <TextField
                                   label="Job Title"
                                   value={editForm.jobTitle}
                                   onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))}
                                   fullWidth
                              />
                              <FormControlLabel
                                   control={<Switch checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />}
                                   label="Active"
                              />
                              <FormControlLabel
                                   control={<Switch checked={editForm.isPublic} onChange={(e) => setEditForm((f) => ({ ...f, isPublic: e.target.checked }))} />}
                                   label="Visible on public booking site"
                              />
                         </Stack>
                    </DialogContent>
                    <DialogActions>
                         <Button onClick={() => setEditTarget(null)}>Cancel</Button>
                         <Button onClick={handleEditSave} variant="contained" disabled={isPending || !editForm.displayName.trim()}>
                              {isPending ? "Saving..." : "Save"}
                         </Button>
                    </DialogActions>
               </Dialog>

               {/* Link Account Dialog */}
               <Dialog open={!!linkTarget} onClose={() => setLinkTarget(null)} maxWidth="xs" fullWidth>
                    <DialogTitle>Link Team Member</DialogTitle>
                    <DialogContent>
                         <TextField
                              select
                              label="Team Member"
                              value={linkMemberId}
                              onChange={(e) => setLinkMemberId(e.target.value)}
                              fullWidth
                              SelectProps={{ native: true }}
                              sx={{ mt: 1 }}
                         >
                              <option value="" disabled>Select a team member</option>
                              {linkableMembers.map((m) => (
                                   <option key={m.id} value={m.id}>{m.email} ({m.role})</option>
                              ))}
                         </TextField>
                    </DialogContent>
                    <DialogActions>
                         <Button onClick={() => setLinkTarget(null)}>Cancel</Button>
                         <Button onClick={handleLinkSave} variant="contained" disabled={isPending || !linkMemberId}>
                              {isPending ? "Linking..." : "Link"}
                         </Button>
                    </DialogActions>
               </Dialog>
          </Box>
     );
}
