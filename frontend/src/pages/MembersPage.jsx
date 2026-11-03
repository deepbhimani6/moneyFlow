import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, Checkbox, Chip, IconButton, Menu, MenuItem, CircularProgress, TablePagination, Tooltip, Snackbar, Alert, TextField, InputAdornment } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { memberService } from "../services/api";
import InviteMemberModal from "../modals/InviteMemberModal";
import EditMemberModal from "../modals/EditMemberModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import { formatDate } from "../utils/formatters";

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk actions menu
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await memberService.getMembers(search);
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setSnackbar({ open: true, message: "Failed to load members from MongoDB", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(members.map((m) => m._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Delete single member
  const handleConfirmSingleDelete = async () => {
    if (!deletingId) return;
    try {
      setActionLoading(true);
      await memberService.deleteMember(deletingId);
      setSnackbar({ open: true, message: "Member deleted", severity: "success" });
      setDeletingId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId));
      fetchMembers();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to delete member", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk delete members
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      await memberService.bulkDelete(selectedIds);
      setSnackbar({ open: true, message: `${selectedIds.length} members deleted`, severity: "success" });
      setIsBulkDeleteConfirmOpen(false);
      setSelectedIds([]);
      fetchMembers();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk deletion", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Send single invite link
  const handleSendInvite = async (id, memberEmail) => {
    try {
      const res = await memberService.sendInvite(id);
      if (res.success) {
        setSnackbar({ open: true, message: `Invite link sent to ${memberEmail}`, severity: "success" });
        fetchMembers();
      } else {
        setSnackbar({ open: true, message: res.message || "Failed to send invite", severity: "error" });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || err.message, severity: "error" });
    }
  };

  // Bulk send invite links
  const handleBulkSendInvites = async () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;
    try {
      const res = await memberService.bulkInvite(selectedIds);
      setSnackbar({
        open: true,
        message: res.message || `Sent invites to selected members`,
        severity: res.sentCount > 0 ? "success" : "info",
      });
      setSelectedIds([]);
      fetchMembers();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to send invites", severity: "error" });
    }
  };

  const isAllSelected = members.length > 0 && selectedIds.length === members.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < members.length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Top Header & Actions */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Members
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          <TextField
            size="small"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* Invite Members Button */}
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setIsInviteOpen(true)} size="small">
            Invite Members
          </Button>

          {/* Bulk Actions Button */}
          <Button variant="outlined" color="secondary" disabled={selectedIds.length === 0} onClick={(e) => setBulkAnchorEl(e.currentTarget)} size="small">
            Bulk Actions ({selectedIds.length})
          </Button>

          {/* Bulk Actions Menu */}
          <Menu anchorEl={bulkAnchorEl} open={Boolean(bulkAnchorEl)} onClose={() => setBulkAnchorEl(null)}>
            <MenuItem onClick={handleBulkSendInvites}>Send Invite Link</MenuItem>
            <MenuItem
              onClick={() => {
                setBulkAnchorEl(null);
                setIsBulkDeleteConfirmOpen(true);
              }}
              sx={{ color: "error.main" }}
            >
              Delete Selected
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Members Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid #e2e8f0", boxShadow: "none" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox indeterminate={isIndeterminate} checked={isAllSelected} onChange={handleSelectAll} size="small" />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Full Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Phone Number</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Join Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Invite Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No members registered. Click <strong>Invite Members +</strong> to add one.
                </TableCell>
              </TableRow>
            ) : (
              members.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                const isSelected = selectedIds.includes(row._id);
                const formattedDate = formatDate(row.joinDate);

                return (
                  <TableRow key={row._id} hover selected={isSelected}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} onChange={() => handleSelectOne(row._id)} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {row.fullName}
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {row.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.phoneNumber || "—"}</TableCell>
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell>{row.inviteSent ? <Chip icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 16 } }} />} label="Invite Sent" size="small" color="success" variant="outlined" /> : <Chip label="Pending" size="small" variant="outlined" />}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title="Send App Invite Link via Resend">
                          <IconButton size="small" color="primary" onClick={() => handleSendInvite(row._id, row.email)}>
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit Member">
                          <IconButton size="small" color="default" onClick={() => setEditingMember(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Member">
                          <IconButton size="small" color="error" onClick={() => setDeletingId(row._id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={members.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Modals */}
      <InviteMemberModal
        open={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onMemberCreated={(newMember, sentLink) => {
          fetchMembers();
          setSnackbar({
            open: true,
            message: `Member created! ${sentLink ? "Invite email triggered via Resend." : ""}`,
            severity: "success",
          });
        }}
      />

      <EditMemberModal
        open={Boolean(editingMember)}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onMemberUpdated={() => {
          fetchMembers();
          setSnackbar({ open: true, message: "Member details updated successfully", severity: "success" });
        }}
      />

      {/* Single Delete Confirm */}
      <DeleteConfirmModal open={Boolean(deletingId)} onClose={() => setDeletingId(null)} onConfirm={handleConfirmSingleDelete} title="Delete Member" message="Are you sure you want to remove this member? This action cannot be reversed." loading={actionLoading} />

      {/* Bulk Delete Confirm */}
      <DeleteConfirmModal open={isBulkDeleteConfirmOpen} onClose={() => setIsBulkDeleteConfirmOpen(false)} onConfirm={handleConfirmBulkDelete} title="Bulk Delete Members" message={`Are you sure you want to delete ${selectedIds.length} selected members?`} loading={actionLoading} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MembersPage;
