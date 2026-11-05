import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, Checkbox, Chip, IconButton, Menu, MenuItem, CircularProgress, TablePagination, Tooltip, Snackbar, Alert, TextField, InputAdornment, TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { memberService } from "../services/api";
import { useProfile } from "../context/ProfileContext";
import InviteMemberModal from "../modals/InviteMemberModal";
import EditMemberModal from "../modals/EditMemberModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import { formatDate, formatAmount } from "../utils/formatters";

const TABLE_RADIUS = 10;

const MembersPage = () => {
  const { profile } = useProfile();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [singleDeleteState, setSingleDeleteState] = useState({
    open: false,
    loadingSummary: false,
    member: null,
    summary: null,
  });
  const [bulkDeleteState, setBulkDeleteState] = useState({
    open: false,
    loadingSummary: false,
    summary: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk actions menu
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);

  // Visible error/warning popup for bulk invite
  const [inviteErrorDialog, setInviteErrorDialog] = useState({
    open: false,
    title: "",
    message: "",
    missingMembers: [],
    validMembers: [],
    severity: "error",
  });
  const [confirmBulkInvite, setConfirmBulkInvite] = useState({ open: false, members: [] });
  const [sendingInviteId, setSendingInviteId] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      if (orderBy === "joinDate" || orderBy === "createdAt") {
        aVal = new Date(a[orderBy] || 0).getTime();
        bVal = new Date(b[orderBy] || 0).getTime();
      } else if (orderBy === "inviteSent") {
        aVal = a.inviteSent ? 1 : 0;
        bVal = b.inviteSent ? 1 : 0;
      } else if (typeof aVal === "string") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [members, order, orderBy]);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });



  // Current Admin check: the logged-in admin profile can never delete their own account
  const isProfileAdmin = profile?.role === "Admin";
  const isCurrentAdmin = (member) => {
    if (!member) return false;
    const profileEmail = (profile?.email || "").toLowerCase().trim();
    const memberEmail = (member.email || "").toLowerCase().trim();
    if (profileEmail && memberEmail && profileEmail === memberEmail) return true;

    const profileUsername = (profile?.username || "").toLowerCase().trim();
    const memberUsername = (member.username || "").toLowerCase().trim();
    if (profileUsername && memberUsername && profileUsername === memberUsername) return true;

    const profileName = (profile?.fullName || "").toLowerCase().trim();
    const memberName = (member.fullName || "").toLowerCase().trim();
    if (profileName && memberName && profileName === memberName && (member.role === "Admin" || isProfileAdmin)) return true;

    return false;
  };

  // Only Admin check: an admin cannot be deleted if they are the only admin in the system
  const isOnlyAdmin = (member) => {
    if (!member || member.role !== "Admin") return false;
    if (isProfileAdmin && profile?.email && member.email !== profile.email) {
      return false;
    }
    const otherAdminMembers = members.filter((m) => m.role === "Admin" && m._id !== member._id);
    return otherAdminMembers.length === 0;
  };



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

  const selectableMembers = useMemo(() => {
    return members.filter((m) => !isCurrentAdmin(m));
  }, [members, profile]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(selectableMembers.map((m) => m._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    const targetMember = members.find((m) => m._id === id);
    if (isCurrentAdmin(targetMember)) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Open single member delete confirmation modal and fetch entry details
  const handleOpenSingleDelete = async (member) => {
    if (isCurrentAdmin(member)) {
      setSnackbar({
        open: true,
        message: "You cannot delete your own logged-in Admin account.",
        severity: "error",
      });
      return;
    }

    if (isOnlyAdmin(member)) {
      setSnackbar({
        open: true,
        message: "Cannot delete the only Admin in the system. There must always be at least one Admin.",
        severity: "error",
      });
      return;
    }

    setSingleDeleteState({
      open: true,
      loadingSummary: true,
      member,
      summary: null,
    });

    try {
      const res = await memberService.getEntriesSummary(member._id);
      if (res.success) {
        setSingleDeleteState((prev) => ({
          ...prev,
          loadingSummary: false,
          summary: res.data,
        }));
      } else {
        setSingleDeleteState((prev) => ({
          ...prev,
          loadingSummary: false,
          summary: { hasEntries: false, entryCount: 0, totalAmount: 0, entries: [] },
        }));
      }
    } catch (err) {
      console.error(err);
      setSingleDeleteState((prev) => ({
        ...prev,
        loadingSummary: false,
        summary: { hasEntries: false, entryCount: 0, totalAmount: 0, entries: [] },
      }));
    }
  };

  // Confirm delete single member & associated entries
  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteState.member) return;
    try {
      setActionLoading(true);
      const res = await memberService.deleteMember(singleDeleteState.member._id);
      setSnackbar({
        open: true,
        message: res.message || "Member deleted successfully",
        severity: "success",
      });
      setSingleDeleteState({ open: false, loadingSummary: false, member: null, summary: null });
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteState.member._id));
      fetchMembers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to delete member",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open bulk delete members confirmation modal and fetch entry details
  const handleOpenBulkDelete = async () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;

    const selectedMembers = members.filter((m) => selectedIds.includes(m._id));

    // Current logged-in admin self-deletion protection
    const currentAdminSelected = selectedMembers.some((m) => isCurrentAdmin(m));
    if (currentAdminSelected) {
      setSnackbar({
        open: true,
        message: "You cannot delete your own logged-in Admin account. Please deselect it before deleting.",
        severity: "error",
      });
      return;
    }

    const adminSelected = selectedMembers.filter((m) => isOnlyAdmin(m));
    if (adminSelected.length > 0) {
      setSnackbar({
        open: true,
        message: "Cannot delete the only Admin in the system. Please deselect the Admin before deleting.",
        severity: "error",
      });
      return;
    }

    setBulkDeleteState({
      open: true,
      loadingSummary: true,
      summary: null,
    });

    try {
      const res = await memberService.getBulkEntriesSummary(selectedIds);
      if (res.success) {
        setBulkDeleteState({
          open: true,
          loadingSummary: false,
          summary: res.data,
        });
      } else {
        setBulkDeleteState((prev) => ({
          ...prev,
          loadingSummary: false,
          summary: { hasEntries: false, entryCount: 0, totalAmount: 0, memberSummary: [] },
        }));
      }
    } catch (err) {
      console.error(err);
      setBulkDeleteState((prev) => ({
        ...prev,
        loadingSummary: false,
        summary: { hasEntries: false, entryCount: 0, totalAmount: 0, memberSummary: [] },
      }));
    }
  };

  // Confirm bulk delete members & associated entries
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await memberService.bulkDelete(selectedIds);
      setSnackbar({
        open: true,
        message: res.message || `${selectedIds.length} members deleted`,
        severity: "success",
      });
      setBulkDeleteState({ open: false, loadingSummary: false, summary: null });
      setSelectedIds([]);
      fetchMembers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed bulk deletion",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Send single invite link
  const handleSendInvite = async (id, memberEmail) => {
    try {
      setSendingInviteId(id);
      const res = await memberService.sendInvite(id);
      if (res.success) {
        setSnackbar({ open: true, message: `Invite link sent to ${memberEmail}`, severity: "success" });
        fetchMembers();
      } else {
        setSnackbar({ open: true, message: res.message || "Failed to send invite", severity: "error" });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || err.message, severity: "error" });
    } finally {
      setSendingInviteId(null);
    }
  };

  // Execute actual bulk invite API call
  const executeBulkSendInvites = async (idsToSend) => {
    try {
      setActionLoading(true);
      const res = await memberService.bulkInvite(idsToSend);
      if (res.sentCount > 0) {
        setSnackbar({
          open: true,
          message: `Successfully sent invite links to ${res.sentCount} member(s)`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: res.message || "No invites were sent",
          severity: res.failedCount > 0 ? "error" : "info",
        });
      }
      setSelectedIds([]);
      fetchMembers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to send invites",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
      setConfirmBulkInvite({ open: false, members: [] });
      setInviteErrorDialog((prev) => ({ ...prev, open: false }));
    }
  };

  // Bulk send invite links
  const handleBulkSendInvites = () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;

    const selectedMembers = members.filter((m) => selectedIds.includes(m._id));
    const missingEmailMembers = selectedMembers.filter((m) => !m.email || !m.email.trim());
    const validEmailMembers = selectedMembers.filter((m) => m.email && m.email.trim());

    // Case 1: ALL selected members have no email set -> show prominent error popup
    if (missingEmailMembers.length > 0 && validEmailMembers.length === 0) {
      setInviteErrorDialog({
        open: true,
        title: "Cannot Send Invite Links",
        message: `Invite links could not be sent because none of the ${selectedMembers.length} selected member(s) have an E-mail address set.`,
        missingMembers: missingEmailMembers,
        validMembers: [],
        severity: "error",
      });
      return;
    }

    // Case 2: SOME members have no email set -> show warning popup with options
    if (missingEmailMembers.length > 0 && validEmailMembers.length > 0) {
      setInviteErrorDialog({
        open: true,
        title: "Missing E-mail Warning",
        message: `${missingEmailMembers.length} of the ${selectedMembers.length} selected member(s) do not have an E-mail address set and will be skipped.`,
        missingMembers: missingEmailMembers,
        validMembers: validEmailMembers,
        severity: "warning",
      });
      return;
    }

    // Case 3: ALL selected members have valid emails -> show confirmation dialog
    setConfirmBulkInvite({
      open: true,
      members: validEmailMembers,
    });
  };

  const isAllSelected = selectableMembers.length > 0 && selectableMembers.every((m) => selectedIds.includes(m._id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

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
            <MenuItem onClick={handleOpenBulkDelete} sx={{ color: "error.main" }}>
              Delete Selected
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Members Table Card */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: `${TABLE_RADIUS}px`,
          border: "1px solid #e2e8f0",
          boxShadow: "none",
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          bgcolor: "background.paper",
        }}
      >
        <TableContainer
          sx={{
            width: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": {
              height: "6px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#f8fafc",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(0, 0, 0, 0.18)",
              borderRadius: "3px",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.3)",
              },
            },
          }}
        >
          <Table sx={{ minWidth: 720 }}>
            <TableHead
              sx={{
                bgcolor: "#f8fafc",
                "& th": {
                  bgcolor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  color: "#475467",
                  whiteSpace: "nowrap",
                },
              }}
            >
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox indeterminate={isIndeterminate} checked={isAllSelected} onChange={handleSelectAll} size="small" />
                </TableCell>

                <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "fullName" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "fullName"}
                    direction={orderBy === "fullName" ? order : "asc"}
                    onClick={() => handleRequestSort("fullName")}
                    sx={{ fontWeight: 600 }}
                  >
                    Full Name
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "phoneNumber" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "phoneNumber"}
                    direction={orderBy === "phoneNumber" ? order : "asc"}
                    onClick={() => handleRequestSort("phoneNumber")}
                    sx={{ fontWeight: 600 }}
                  >
                    Phone Number
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "email" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "email"}
                    direction={orderBy === "email" ? order : "asc"}
                    onClick={() => handleRequestSort("email")}
                    sx={{ fontWeight: 600 }}
                  >
                    E-mail
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "role" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "role"}
                    direction={orderBy === "role" ? order : "asc"}
                    onClick={() => handleRequestSort("role")}
                    sx={{ fontWeight: 600 }}
                  >
                    Role
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "joinDate" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "joinDate"}
                    direction={orderBy === "joinDate" ? order : "asc"}
                    onClick={() => handleRequestSort("joinDate")}
                    sx={{ fontWeight: 600 }}
                  >
                    Join Date
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "inviteSent" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "inviteSent"}
                    direction={orderBy === "inviteSent" ? order : "asc"}
                    onClick={() => handleRequestSort("inviteSent")}
                    sx={{ fontWeight: 600 }}
                  >
                    Invite Status
                  </TableSortLabel>
                </TableCell>

                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No members registered. Click <strong>Invite Members +</strong> to add one.
                  </TableCell>
                </TableRow>
              ) : (
                sortedMembers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                  const isSelected = selectedIds.includes(row._id);
                  const formattedDate = formatDate(row.joinDate);
                  const isCurrent = isCurrentAdmin(row);
                  const isOnly = isOnlyAdmin(row);
                  const isMemberAdmin = row.role === 'Admin' || isCurrent;
                  const disableDelete = isCurrent || isOnly;
                  const deleteTooltip = isCurrent
                    ? "You cannot delete your own logged-in Admin account"
                    : isOnly
                    ? "Cannot delete the only Admin in the system"
                    : "Delete Member";

                  return (
                    <TableRow
                      key={row._id}
                      hover
                      selected={isSelected}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell padding="checkbox">
                        {isCurrent ? (
                          <Tooltip title="Your own logged-in Admin account cannot be selected for deletion">
                            <span>
                              <Checkbox disabled checked={false} size="small" />
                            </span>
                          </Tooltip>
                        ) : (
                          <Checkbox checked={isSelected} onChange={() => handleSelectOne(row._id)} size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                        {row.fullName}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.phoneNumber || "—"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", color: row.email ? "text.primary" : "text.secondary" }}>
                        {row.email || "—"}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {isMemberAdmin ? (
                          <Chip
                            label={isCurrent ? "Admin (You)" : "Admin"}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                          />
                        ) : (
                          <Chip
                            label="Member"
                            size="small"
                            variant="outlined"
                            sx={{ color: "text.secondary", borderColor: "#cbd5e1", height: 22, fontSize: "0.75rem" }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formattedDate}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.inviteSent ? <Chip icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 16 } }} />} label="Invite Sent" size="small" color="success" variant="outlined" /> : <Chip label="Pending" size="small" variant="outlined" />}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title={row.email ? "Send App Invite Link" : "No email available to send invite"}>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleSendInvite(row._id, row.email)}
                                disabled={!row.email || sendingInviteId === row._id}
                              >
                                {sendingInviteId === row._id ? (
                                  <CircularProgress size={16} color="primary" />
                                ) : (
                                  <SendIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Edit Member">
                            <IconButton size="small" color="default" onClick={() => setEditingMember(row)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={deleteTooltip}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={disableDelete}
                                onClick={() => handleOpenSingleDelete(row)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer - Fixed to Card, Never scrolls horizontally */}
        <Divider />
        <Box sx={{ width: "100%", bgcolor: "background.paper" }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 20, 50, 100]}
            component="div"
            count={members.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              width: "100%",
              "& .MuiTablePagination-toolbar": {
                flexWrap: { xs: "wrap", sm: "nowrap" },
                justifyContent: { xs: "center", sm: "flex-end" },
                px: { xs: 1, sm: 2 },
                gap: { xs: 0.5, sm: 0 },
              },
            }}
          />
        </Box>
      </Paper>

      {/* Modals */}
      <InviteMemberModal
        open={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onMemberCreated={(newMember, sentLink) => {
          fetchMembers();
          setSnackbar({
            open: true,
            message: `Member created! ${sentLink ? "Invite email sent." : ""}`,
            severity: "success",
          });
        }}
      />

      <EditMemberModal
        open={Boolean(editingMember)}
        member={editingMember}
        isCurrentAdmin={isCurrentAdmin(editingMember)}
        isOnlyAdmin={isOnlyAdmin(editingMember)}
        onClose={() => setEditingMember(null)}
        onMemberUpdated={() => {
          fetchMembers();
          setSnackbar({ open: true, message: "Member details updated successfully", severity: "success" });
        }}
      />

      {/* Single Member Delete Confirmation Modal with Entries Details */}
      <Dialog
        open={singleDeleteState.open}
        onClose={() => !actionLoading && setSingleDeleteState((prev) => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: "text.primary",
            pb: 1,
          }}
        >
          <DeleteOutlineIcon color="action" sx={{ fontSize: 28 }} />
          Confirm Delete Member
        </DialogTitle>

        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2.5, pb: 2.5 }}>
          {singleDeleteState.loadingSummary ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Checking member's associated entries...
              </Typography>
            </Box>
          ) : singleDeleteState.summary?.hasEntries ? (
            <>
              {/* Has entries: Notice & Details (Entries are kept intact) */}
              <Alert severity="info" sx={{ fontWeight: 500 }}>
                <strong>Notice:</strong> <strong>{singleDeleteState.member?.fullName}</strong> has <strong>{singleDeleteState.summary.entryCount} associated entry/entries</strong> (totaling ₹ {formatAmount(singleDeleteState.summary.totalAmount)}) in the Entries page.
                <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}>
                  Note: Only the member will be deleted. Their entries will remain in the Entries page.
                </Typography>
              </Alert>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Associated Entries ({singleDeleteState.summary.entryCount}):
                </Typography>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflowY: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    bgcolor: "#f8fafc",
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {singleDeleteState.summary.entries.map((entry) => (
                    <Box
                      key={entry._id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1,
                        bgcolor: "#ffffff",
                        borderRadius: 1.5,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(entry.date)} • {entry.type || entry.status || "Expense"}
                        </Typography>
                        {entry.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {entry.description}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                        ₹ {formatAmount(entry.amount)}
                      </Typography>
                    </Box>
                  ))}
                  {singleDeleteState.summary.entryCount > singleDeleteState.summary.entries.length && (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", pt: 0.5 }}>
                      ...and {singleDeleteState.summary.entryCount - singleDeleteState.summary.entries.length} more entry/entries
                    </Typography>
                  )}
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Are you sure you want to delete member <strong>{singleDeleteState.member?.fullName}</strong>? This action cannot be reversed.
              </Typography>
            </>
          ) : (
            <>
              {/* No entries: Normal confirmation details */}
              <Typography variant="body1">
                Are you sure you want to delete member <strong>{singleDeleteState.member?.fullName}</strong>?
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography variant="body2" color="text.secondary">
                  ✓ This member has <strong>no associated entries</strong> in the Entries page.
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This action cannot be undone.
              </Typography>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSingleDeleteState((prev) => ({ ...prev, open: false }))}
            disabled={actionLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSingleDelete}
            color="error"
            variant="contained"
            disabled={actionLoading || singleDeleteState.loadingSummary}
            startIcon={actionLoading ? <CircularProgress size={18} /> : <DeleteOutlineIcon />}
          >
            {actionLoading ? "Deleting..." : "Delete Member"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Members Confirmation Modal with Entries Details */}
      <Dialog
        open={bulkDeleteState.open}
        onClose={() => !actionLoading && setBulkDeleteState((prev) => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: "text.primary",
            pb: 1,
          }}
        >
          <DeleteOutlineIcon color="action" sx={{ fontSize: 28 }} />
          Confirm Bulk Delete Members
        </DialogTitle>

        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2.5, pb: 2.5 }}>
          {bulkDeleteState.loadingSummary ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Checking selected members' associated entries...
              </Typography>
            </Box>
          ) : bulkDeleteState.summary?.hasEntries ? (
            <>
              {/* Has entries: Notice & Details (Entries are kept intact) */}
              <Alert severity="info" sx={{ fontWeight: 500 }}>
                <strong>Notice:</strong> The selected members have <strong>{bulkDeleteState.summary.entryCount} associated entry/entries</strong> (totaling ₹ {formatAmount(bulkDeleteState.summary.totalAmount)}) in the Entries page.
                <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}>
                  Note: Only the selected members will be deleted. All entries will remain in the Entries page.
                </Typography>
              </Alert>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Breakdown by Member:
                </Typography>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflowY: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    bgcolor: "#f8fafc",
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {bulkDeleteState.summary.memberSummary.map((m) => (
                    <Box
                      key={m._id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1,
                        bgcolor: "#ffffff",
                        borderRadius: 1.5,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {m.fullName}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: m.count > 0 ? "primary.main" : "text.secondary" }}>
                        {m.count > 0 ? `${m.count} entries (₹ ${formatAmount(m.totalAmount)})` : "No entries"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Are you sure you want to delete these <strong>{selectedIds.length} selected members</strong>? This action cannot be reversed.
              </Typography>
            </>
          ) : (
            <>
              {/* No entries: Normal confirmation details */}
              <Typography variant="body1">
                Are you sure you want to delete <strong>{selectedIds.length} selected members</strong>?
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography variant="body2" color="text.secondary">
                  ✓ None of the selected members have associated entries in the Entries page.
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This action cannot be undone.
              </Typography>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setBulkDeleteState((prev) => ({ ...prev, open: false }))}
            disabled={actionLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBulkDelete}
            color="error"
            variant="contained"
            disabled={actionLoading || bulkDeleteState.loadingSummary}
            startIcon={actionLoading ? <CircularProgress size={18} /> : <DeleteOutlineIcon />}
          >
            {actionLoading ? "Deleting..." : `Delete ${selectedIds.length} Members`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Visible Error Popup Dialog for Bulk Invites */}
      <Dialog
        open={inviteErrorDialog.open}
        onClose={() => setInviteErrorDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: inviteErrorDialog.severity === "error" ? "error.main" : "warning.dark",
            pb: 1,
          }}
        >
          {inviteErrorDialog.severity === "error" ? (
            <ErrorOutlineIcon color="error" sx={{ fontSize: 28 }} />
          ) : (
            <WarningAmberIcon color="warning" sx={{ fontSize: 28 }} />
          )}
          {inviteErrorDialog.title}
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          <Alert severity={inviteErrorDialog.severity || "error"}>
            {inviteErrorDialog.message}
          </Alert>

          {inviteErrorDialog.missingMembers.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}>
                Members without E-mail ({inviteErrorDialog.missingMembers.length}):
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  p: 1.5,
                  bgcolor: "#fef2f2",
                  borderRadius: 2,
                  border: "1px solid #fecaca",
                }}
              >
                {inviteErrorDialog.missingMembers.map((m) => (
                  <Chip
                    key={m._id}
                    label={m.fullName}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ bgcolor: "#ffffff", fontWeight: 500 }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                * Invite links require a valid email address. Click the Edit icon on each member to add their email before sending invites.
              </Typography>
            </Box>
          )}

          {inviteErrorDialog.validMembers.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}>
                Members ready to receive invites ({inviteErrorDialog.validMembers.length}):
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  p: 1.5,
                  bgcolor: "#f0fdf4",
                  borderRadius: 2,
                  border: "1px solid #bbf7d0",
                }}
              >
                {inviteErrorDialog.validMembers.map((m) => (
                  <Chip
                    key={m._id}
                    label={`${m.fullName} (${m.email})`}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ bgcolor: "#ffffff", fontWeight: 500 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setInviteErrorDialog((prev) => ({ ...prev, open: false }))}
            disabled={actionLoading}
          >
            {inviteErrorDialog.validMembers.length > 0 ? "Cancel" : "Close"}
          </Button>
          {inviteErrorDialog.validMembers.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              disabled={actionLoading}
              onClick={() => executeBulkSendInvites(inviteErrorDialog.validMembers.map((m) => m._id))}
              startIcon={actionLoading ? <CircularProgress size={18} /> : <SendIcon />}
            >
              Send to {inviteErrorDialog.validMembers.length} Member{inviteErrorDialog.validMembers.length > 1 ? "s" : ""} With E-mail
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk Send Invites Confirmation Modal */}
      <DeleteConfirmModal
        open={confirmBulkInvite.open}
        onClose={() => setConfirmBulkInvite({ open: false, members: [] })}
        onConfirm={() => executeBulkSendInvites(confirmBulkInvite.members.map((m) => m._id))}
        title="Confirm Send Invites"
        message={`Are you sure you want to send invite links to ${confirmBulkInvite.members.length} selected member(s)?`}
        loading={actionLoading}
        confirmText="Send Invites"
        confirmColor="primary"
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MembersPage;
