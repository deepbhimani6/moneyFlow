import React, { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Checkbox,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  TablePagination,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import FilterListIcon from "@mui/icons-material/FilterList";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { userService } from "../services/api";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import InviteMemberModal from "../modals/InviteMemberModal";
import EditMemberModal from "../modals/EditMemberModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import MemberFilterModal from "../modals/MemberFilterModal";
import { formatDate, formatAmount, capitalizeName, isCurrentLoggedInUser } from "../utils/formatters";

const TABLE_RADIUS = 10;

const initialFilters = {
  selectedIds: [],
  status: "All",
  keyword: "",
  inviteStartDate: "",
  inviteEndDate: "",
  joinStartDate: "",
  joinEndDate: "",
};

const UsersPage = () => {
  const { profile } = useProfile();
  const { user } = useAuth();

  const currentEmail = (profile?.email || user?.email || "").toLowerCase().trim();
  const isAdmin = currentEmail === "deepbhimani6@gmail.com" || profile?.role === "Admin" || user?.role === "Admin";

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [singleDeleteState, setSingleDeleteState] = useState({
    open: false,
    loadingSummary: false,
    user: null,
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
  const isBulkMenuOpen = Boolean(bulkAnchorEl);

  // Invite error & warning dialog
  const [inviteErrorDialog, setInviteErrorDialog] = useState({
    open: false,
    title: "",
    message: "",
    missingUsers: [],
    validUsers: [],
    severity: "error",
  });
  const [confirmBulkInvite, setConfirmBulkInvite] = useState({ open: false, users: [] });
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

  // Filter out currently logged-in admin from deletion selection
  const displayedUsers = useMemo(() => {
    return users.filter((u) => !isCurrentLoggedInUser(u, profile, user));
  }, [users, profile, user]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.selectedIds && filters.selectedIds.length > 0) count++;
    if (filters.status && filters.status !== "All") count++;
    if (filters.keyword && filters.keyword.trim()) count++;
    if (filters.inviteStartDate || filters.inviteEndDate) count++;
    if (filters.joinStartDate || filters.joinEndDate) count++;
    return count;
  }, [filters]);

  // Filtered users by user dropdown, status, keyword, and date ranges
  const filteredUsers = useMemo(() => {
    return displayedUsers.filter((u) => {
      // 1. Specific Users selection
      if (filters.selectedIds && filters.selectedIds.length > 0) {
        if (!filters.selectedIds.includes(u._id)) return false;
      }
      // 2. Status filter
      if (filters.status && filters.status !== "All") {
        const hasJoined = Boolean(u.hasLoggedIn || u.joinDate);
        if (filters.status === "Joined" && !hasJoined) return false;
        if (filters.status === "Invite Sent" && (hasJoined || !u.inviteSent)) return false;
        if (filters.status === "Pending" && (hasJoined || u.inviteSent)) return false;
      }
      // 3. Keyword filter
      if (filters.keyword && filters.keyword.trim()) {
        const kw = filters.keyword.trim().toLowerCase();
        const matches =
          (u.fullName || "").toLowerCase().includes(kw) ||
          (u.email || "").toLowerCase().includes(kw) ||
          (u.phoneNumber || "").toLowerCase().includes(kw) ||
          (u.username || "").toLowerCase().includes(kw);
        if (!matches) return false;
      }
      // 4. Invite Sent Date range
      if (filters.inviteStartDate) {
        if (!u.lastInviteSentAt) return false;
        const d = new Date(u.lastInviteSentAt).setHours(0, 0, 0, 0);
        const start = new Date(filters.inviteStartDate).setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (filters.inviteEndDate) {
        if (!u.lastInviteSentAt) return false;
        const d = new Date(u.lastInviteSentAt).setHours(23, 59, 59, 999);
        const end = new Date(filters.inviteEndDate).setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      // 5. Join Date range (First Login)
      if (filters.joinStartDate) {
        const hasJoined = Boolean(u.hasLoggedIn || u.joinDate);
        if (!hasJoined || !u.joinDate) return false;
        const d = new Date(u.joinDate).setHours(0, 0, 0, 0);
        const start = new Date(filters.joinStartDate).setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (filters.joinEndDate) {
        const hasJoined = Boolean(u.hasLoggedIn || u.joinDate);
        if (!hasJoined || !u.joinDate) return false;
        const d = new Date(u.joinDate).setHours(23, 59, 59, 999);
        const end = new Date(filters.joinEndDate).setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [displayedUsers, filters]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      if (orderBy === "joinDate" || orderBy === "createdAt" || orderBy === "lastInviteSentAt") {
        aVal = new Date(a[orderBy] || 0).getTime();
        bVal = new Date(b[orderBy] || 0).getTime();
      } else if (orderBy === "inviteSent") {
        const aStatus = (a.hasLoggedIn || a.joinDate) ? 2 : a.inviteSent ? 1 : 0;
        const bStatus = (b.hasLoggedIn || b.joinDate) ? 2 : b.inviteSent ? 1 : 0;
        aVal = aStatus;
        bVal = bStatus;
      } else if (typeof aVal === "string") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, order, orderBy]);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setSnackbar({ open: true, message: "Failed to load users", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredUsers.length) {
      setPage(Math.max(0, Math.ceil(filteredUsers.length / rowsPerPage) - 1));
    }
  }, [filteredUsers.length, page, rowsPerPage]);

  const selectableUsers = useMemo(() => {
    return filteredUsers;
  }, [filteredUsers]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(selectableUsers.map((u) => u._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    const targetUser = users.find((u) => u._id === id);
    if (isCurrentLoggedInUser(targetUser, profile, user)) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Open single delete confirmation modal & fetch entries summary
  const handleOpenSingleDelete = async (u) => {
    if (isCurrentLoggedInUser(u, profile, user)) {
      setSnackbar({
        open: true,
        message: "You cannot delete your own logged-in account.",
        severity: "error",
      });
      return;
    }

    setSingleDeleteState({
      open: true,
      loadingSummary: true,
      user: u,
      summary: null,
    });

    try {
      const res = await userService.getEntriesSummary(u._id);
      if (res.success) {
        setSingleDeleteState({
          open: true,
          loadingSummary: false,
          user: u,
          summary: res.data,
        });
      } else {
        setSingleDeleteState((prev) => ({
          ...prev,
          loadingSummary: false,
          summary: { hasEntries: false, entryCount: 0, totalAmount: 0 },
        }));
      }
    } catch (err) {
      console.error(err);
      setSingleDeleteState((prev) => ({
        ...prev,
        loadingSummary: false,
        summary: { hasEntries: false, entryCount: 0, totalAmount: 0 },
      }));
    }
  };

  // Confirm delete single user (Admin unrestricted)
  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteState.user) return;
    const deletedId = singleDeleteState.user._id;
    try {
      setActionLoading(true);
      const res = await userService.deleteUser(deletedId);
      setSnackbar({
        open: true,
        message: res.message || "User deleted successfully.",
        severity: "success",
      });
      setSingleDeleteState({ open: false, loadingSummary: false, user: null, summary: null });
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
      setUsers((prev) => prev.filter((u) => u._id !== deletedId));
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to delete user.",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open bulk delete confirmation modal & fetch summary
  const handleOpenBulkDelete = async () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;

    const selectedUsers = users.filter((u) => selectedIds.includes(u._id));
    const currentLoggedInSelected = selectedUsers.some((u) => isCurrentLoggedInUser(u, profile, user));
    if (currentLoggedInSelected) {
      setSnackbar({
        open: true,
        message: "You cannot delete your logged-in account.",
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
      const res = await userService.getBulkEntriesSummary(selectedIds);
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
          summary: { hasEntries: false, entryCount: 0, totalAmount: 0 },
        }));
      }
    } catch (err) {
      console.error(err);
      setBulkDeleteState((prev) => ({
        ...prev,
        loadingSummary: false,
        summary: { hasEntries: false, entryCount: 0, totalAmount: 0 },
      }));
    }
  };

  // Confirm bulk delete users (Admin unrestricted)
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const idsToDelete = [...selectedIds];
    try {
      setActionLoading(true);
      const res = await userService.bulkDelete(idsToDelete);
      setSnackbar({
        open: true,
        message: res.message || `${idsToDelete.length} users deleted.`,
        severity: "success",
      });
      setBulkDeleteState({ open: false, loadingSummary: false, summary: null });
      setSelectedIds([]);
      setUsers((prev) => prev.filter((u) => !idsToDelete.includes(u._id)));
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed bulk deletion.",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Send single invite link
  const handleSendInvite = async (id, userEmail) => {
    try {
      setSendingInviteId(id);
      const res = await userService.sendInvite(id);
      if (res.success) {
        setSnackbar({ open: true, message: `Invite sent to ${userEmail}.`, severity: "success" });
        fetchUsers();
      } else {
        setSnackbar({ open: true, message: res.message || "Failed to send invite.", severity: "error" });
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
      const res = await userService.bulkInvite(idsToSend);
      if (res.sentCount > 0) {
        setSnackbar({
          open: true,
          message: `Invites sent to ${res.sentCount} user(s).`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: res.message || "No invites were sent.",
          severity: res.failedCount > 0 ? "error" : "info",
        });
      }
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to send invites.",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
      setConfirmBulkInvite({ open: false, users: [] });
      setInviteErrorDialog((prev) => ({ ...prev, open: false }));
    }
  };

  // Bulk send invite links
  const handleBulkSendInvites = () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;

    const selectedUsers = users.filter((u) => selectedIds.includes(u._id));
    const alreadyJoinedUsers = selectedUsers.filter((u) => u.hasLoggedIn || u.joinDate);
    const pendingUsers = selectedUsers.filter((u) => !u.hasLoggedIn && !u.joinDate);
    const missingEmailUsers = pendingUsers.filter((u) => !u.email || !u.email.trim());
    const validEmailUsers = pendingUsers.filter((u) => u.email && u.email.trim());

    if (alreadyJoinedUsers.length > 0 && pendingUsers.length === 0) {
      setSnackbar({
        open: true,
        message: "Selected user(s) have already joined the app.",
        severity: "info",
      });
      return;
    }

    if (missingEmailUsers.length > 0 && validEmailUsers.length === 0) {
      setInviteErrorDialog({
        open: true,
        title: "Cannot Send Invite Links",
        message: `Invite links could not be sent because none of the ${pendingUsers.length} selected pending user(s) have an E-mail address set.`,
        missingUsers: missingEmailUsers,
        validUsers: [],
        severity: "error",
      });
      return;
    }

    if (missingEmailUsers.length > 0 && validEmailUsers.length > 0) {
      setInviteErrorDialog({
        open: true,
        title: "Missing E-mail Warning",
        message: `${missingEmailUsers.length} of the ${pendingUsers.length} selected user(s) do not have an E-mail address set and will be skipped.`,
        missingUsers: missingEmailUsers,
        validUsers: validEmailUsers,
        severity: "warning",
      });
      return;
    }

    setConfirmBulkInvite({
      open: true,
      users: validEmailUsers,
    });
  };

  // Restrict access: only visible and accessible to deepbhimani6@gmail.com
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAllSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.includes(u._id));
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
          Users
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          {/* Filter Button */}
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setIsFilterOpen(true)}
            size="small"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 2,
              py: 0.8,
              borderColor: activeFiltersCount > 0 ? "primary.main" : "#d0d5dd",
              color: activeFiltersCount > 0 ? "primary.main" : "#344054",
              bgcolor: activeFiltersCount > 0 ? "rgba(25, 118, 210, 0.08)" : "transparent",
            }}
          >
            Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          {/* Invite User Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => setIsInviteOpen(true)}
            size="small"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 2,
              py: 0.8,
              boxShadow: "none",
              whiteSpace: "nowrap",
            }}
          >
            Invite Users
          </Button>

          {/* Bulk Actions Menu Button */}
          <Button
            variant="outlined"
            color="inherit"
            disabled={selectedIds.length === 0}
            onClick={(e) => setBulkAnchorEl(e.currentTarget)}
            size="small"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 2,
              py: 0.8,
              borderColor: "#d0d5dd",
              color: "#344054",
              whiteSpace: "nowrap",
            }}
          >
            Bulk Actions ({selectedIds.length})
          </Button>

          <Menu
            anchorEl={bulkAnchorEl}
            open={isBulkMenuOpen}
            onClose={() => setBulkAnchorEl(null)}
            PaperProps={{
              sx: {
                borderRadius: 2,
                minWidth: 180,
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                mt: 0.5,
              },
            }}
          >
            <MenuItem onClick={handleBulkSendInvites} sx={{ gap: 1.5, py: 1 }}>
              <SendIcon fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Send Invite Links
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleOpenBulkDelete} sx={{ gap: 1.5, py: 1, color: "error.main" }}>
              <DeleteOutlineIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Delete Selected Users
              </Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Users Table Card */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: `${TABLE_RADIUS}px`,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 750 }}>
            <TableHead
              sx={{
                bgcolor: "#f8fafc",
                "& th": {
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
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    size="small"
                  />
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

                <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "lastInviteSentAt" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "lastInviteSentAt"}
                    direction={orderBy === "lastInviteSentAt" ? order : "asc"}
                    onClick={() => handleRequestSort("lastInviteSentAt")}
                    sx={{ fontWeight: 600 }}
                  >
                    Invite Sent Date
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
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {displayedUsers.length === 0 ? (
                      <span>No users registered. Click <strong>Invite Users +</strong> to add one.</span>
                    ) : (
                      "No users match the selected filter criteria."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                  const isSelected = selectedIds.includes(row._id);
                  const formattedInviteDate = row.lastInviteSentAt ? formatDate(row.lastInviteSentAt) : "—";
                  const hasJoined = Boolean(row.hasLoggedIn || row.joinDate);
                  const formattedJoinDate = hasJoined && row.joinDate ? formatDate(row.joinDate) : "—";
                  const isCurrent = isCurrentLoggedInUser(row, profile, user);
                  const disableDelete = isCurrent;
                  const deleteTooltip = isCurrent
                    ? "You cannot delete your own logged-in account"
                    : "Delete User";

                  const disableInvite = !row.email || sendingInviteId === row._id || hasJoined;
                  const inviteTooltip = hasJoined
                    ? "User has already joined the app"
                    : !row.email
                    ? "No email available to send invite"
                    : "Send App Invite Link";

                  return (
                    <TableRow
                      key={row._id}
                      hover
                      selected={isSelected}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell padding="checkbox">
                        {isCurrent ? (
                          <Tooltip title="Your own logged-in account cannot be selected for deletion">
                            <span>
                              <Checkbox disabled checked={false} size="small" />
                            </span>
                          </Tooltip>
                        ) : (
                          <Checkbox checked={isSelected} onChange={() => handleSelectOne(row._id)} size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        {capitalizeName(row.fullName)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.phoneNumber || "—"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", color: row.email ? "text.primary" : "text.secondary" }}>
                        {row.email || "—"}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formattedInviteDate}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formattedJoinDate}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {hasJoined ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 16 } }} />}
                            label="Joined"
                            size="small"
                            color="success"
                            variant="filled"
                          />
                        ) : row.inviteSent ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 16 } }} />}
                            label="Invite Sent"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Chip label="Pending" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title={inviteTooltip}>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleSendInvite(row._id, row.email)}
                                disabled={disableInvite}
                              >
                                {sendingInviteId === row._id ? (
                                  <CircularProgress size={16} color="primary" />
                                ) : (
                                  <SendIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Edit User">
                            <IconButton size="small" color="default" onClick={() => setEditingUser(row)}>
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

        {/* Pagination Footer */}
        <Divider />
        <Box sx={{ width: "100%", bgcolor: "background.paper" }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 20, 50, 100]}
            component="div"
            count={filteredUsers.length}
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
      <MemberFilterModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Users"
        entityLabel="Users"
        items={displayedUsers}
        currentFilters={filters}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        onResetFilters={() => setFilters(initialFilters)}
      />

      <InviteMemberModal
        open={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite New User"
        createFunction={userService.createUser}
        onMemberCreated={() => {
          fetchUsers();
          setSnackbar({ open: true, message: "User created & invited successfully.", severity: "success" });
        }}
        existingMembers={users}
        currentUserEmail={currentEmail}
      />

      {editingUser && (
        <EditMemberModal
          open={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title="Edit User"
          member={editingUser}
          updateFunction={userService.updateUser}
          onMemberUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
            setSnackbar({ open: true, message: "User updated successfully.", severity: "success" });
          }}
        />
      )}

      {/* Single Delete Confirmation Dialog */}
      <Dialog
        open={singleDeleteState.open}
        onClose={() => setSingleDeleteState({ open: false, loadingSummary: false, user: null, summary: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteOutlineIcon color="error" /> Confirm Delete User
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete user{" "}
            <strong>{capitalizeName(singleDeleteState.user?.fullName || "")}</strong>?
          </Typography>

          {singleDeleteState.loadingSummary ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Checking associated entries...
              </Typography>
            </Box>
          ) : singleDeleteState.summary?.hasEntries ? (
            <Alert severity="warning" sx={{ mb: 1, borderRadius: 2 }}>
              <Typography variant="body2">
                This user has <strong>{singleDeleteState.summary.entryCount} associated entry/entries</strong> totaling{" "}
                <strong>{formatAmount(singleDeleteState.summary.totalAmount)}</strong>.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 1, borderRadius: 2 }}>
              This user has <strong>no associated entries</strong> in the Entries page.
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            This action cannot be undone. Admin can delete all persons without restrictions.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSingleDeleteState({ open: false, loadingSummary: false, user: null, summary: null })}
            disabled={actionLoading}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmSingleDelete}
            disabled={actionLoading}
            startIcon={actionLoading && <CircularProgress size={16} color="inherit" />}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            {actionLoading ? "Deleting..." : "Delete User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteState.open}
        onClose={() => setBulkDeleteState({ open: false, loadingSummary: false, summary: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteOutlineIcon color="error" /> Confirm Bulk Delete Users
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{selectedIds.length} selected user(s)</strong>?
          </Typography>

          {bulkDeleteState.loadingSummary ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Checking associated entries...
              </Typography>
            </Box>
          ) : bulkDeleteState.summary?.hasEntries ? (
            <Alert severity="warning" sx={{ mb: 1, borderRadius: 2 }}>
              <Typography variant="body2">
                Selected users have <strong>{bulkDeleteState.summary.entryCount} associated entry/entries</strong> totaling{" "}
                <strong>{formatAmount(bulkDeleteState.summary.totalAmount)}</strong>.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 1, borderRadius: 2 }}>
              Selected users have <strong>no associated entries</strong>.
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            This action cannot be undone. Admin can delete all persons without restrictions.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setBulkDeleteState({ open: false, loadingSummary: false, summary: null })}
            disabled={actionLoading}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmBulkDelete}
            disabled={actionLoading}
            startIcon={actionLoading && <CircularProgress size={16} color="inherit" />}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            {actionLoading ? "Deleting..." : `Delete ${selectedIds.length} Users`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Invite Confirmation Dialog */}
      <DeleteConfirmModal
        open={confirmBulkInvite.open}
        onClose={() => setConfirmBulkInvite({ open: false, users: [] })}
        onConfirm={() => executeBulkSendInvites(confirmBulkInvite.users.map((u) => u._id))}
        title="Confirm Send Invite Links"
        message={`Are you sure you want to send invite links to ${confirmBulkInvite.users.length} selected user(s)?`}
        confirmText="Send Invites"
        confirmColor="primary"
        loading={actionLoading}
      />

      {/* Missing Email Dialog */}
      <Dialog
        open={inviteErrorDialog.open}
        onClose={() => setInviteErrorDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          {inviteErrorDialog.severity === "error" ? (
            <ErrorOutlineIcon color="error" />
          ) : (
            <WarningAmberIcon color="warning" />
          )}
          {inviteErrorDialog.title}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {inviteErrorDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setInviteErrorDialog((prev) => ({ ...prev, open: false }))}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          {inviteErrorDialog.validUsers?.length > 0 && (
            <Button
              variant="contained"
              onClick={() => {
                const ids = inviteErrorDialog.validUsers.map((u) => u._id);
                setInviteErrorDialog((prev) => ({ ...prev, open: false }));
                executeBulkSendInvites(ids);
              }}
              sx={{ textTransform: "none" }}
            >
              Send to Remaining ({inviteErrorDialog.validUsers.length})
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersPage;
