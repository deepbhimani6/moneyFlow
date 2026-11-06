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
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterListIcon from "@mui/icons-material/FilterList";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { userService } from "../services/api";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import EditMemberModal from "../modals/EditMemberModal";
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
      // 4. Join Date range (First Login)
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

      if (orderBy === "joinDate" || orderBy === "createdAt") {
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

  // Restrict access: only visible and accessible to deepbhimani6@gmail.com
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAllSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.includes(u._id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1200, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Top Header & Actions */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 3 },
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Users
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          {/* Filter Button */}
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setIsFilterOpen(true)} size="small">
            Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          {/* Bulk Actions Menu Button */}
          <Button variant="outlined" color="secondary" disabled={selectedIds.length === 0} onClick={(e) => setBulkAnchorEl(e.currentTarget)} size="small">
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
        {/* Mobile-First Card View (Screens < 768px) */}
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : filteredUsers.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {users.length === 0 ? "No users registered." : "No users match the selected filter criteria."}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5} sx={{ p: 1.5 }}>
              {sortedUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                const isSelected = selectedIds.includes(row._id);
                const hasJoined = Boolean(row.hasLoggedIn || row.joinDate);
                const formattedJoinDate = hasJoined && row.joinDate ? formatDate(row.joinDate) : "—";
                const isCurrent = isCurrentLoggedInUser(row, profile, user);
                const disableDelete = isCurrent;
                const deleteTooltip = isCurrent ? "You cannot delete your own logged-in account" : "Delete User";

                return (
                  <Paper
                    key={row._id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: isSelected ? "2px solid #1976d2" : "1px solid #e2e8f0",
                      bgcolor: isSelected ? "rgba(25, 118, 210, 0.03)" : "#ffffff",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                        {!isCurrent && (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectOne(row._id)}
                            size="small"
                            sx={{ p: 0.25 }}
                          />
                        )}
                        <Avatar sx={{ width: 34, height: 34, bgcolor: "#1976d2", fontSize: "0.85rem", fontWeight: 700 }}>
                          {(row.fullName || "U")[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3, color: "#1e293b" }} noWrap>
                            {capitalizeName(row.fullName)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.74rem" }}>
                            {row.email || row.phoneNumber || "No contact info"}
                          </Typography>
                        </Box>
                      </Box>

                      {hasJoined ? (
                        <Chip
                          icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 14 } }} />}
                          label="Joined"
                          size="small"
                          color="success"
                          sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                        />
                      ) : row.inviteSent ? (
                        <Chip
                          label="Invite Sent"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                        />
                      ) : (
                        <Chip label="Pending" size="small" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />
                      )}
                    </Box>

                    {/* Join date */}
                    <Box sx={{ my: 1, bgcolor: "#f8fafc", p: 1, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        <strong>Joined:</strong> {formattedJoinDate}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Divider sx={{ my: 1, borderColor: "#f1f5f9" }} />
                    <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setEditingUser(row)}
                        sx={{ textTransform: "none", fontSize: "0.76rem", py: 0.4, px: 1.25, borderRadius: 2 }}
                      >
                        Edit
                      </Button>
                      <Tooltip title={deleteTooltip}>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleOpenSingleDelete(row)}
                            disabled={disableDelete}
                            sx={{ textTransform: "none", fontSize: "0.76rem", py: 0.4, px: 1.25, borderRadius: 2 }}
                          >
                            Delete
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Desktop Data Table (Screens >= 768px) */}
        <TableContainer sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
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
                    Status
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
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {displayedUsers.length === 0 ? (
                      "No users registered."
                    ) : (
                      "No users match the selected filter criteria."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                  const isSelected = selectedIds.includes(row._id);
                  const hasJoined = Boolean(row.hasLoggedIn || row.joinDate);
                  const formattedJoinDate = hasJoined && row.joinDate ? formatDate(row.joinDate) : "—";
                  const isCurrent = isCurrentLoggedInUser(row, profile, user);
                  const disableDelete = isCurrent;
                  const deleteTooltip = isCurrent
                    ? "You cannot delete your own logged-in account"
                    : "Delete User";

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
        hideInviteDate={true}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        onResetFilters={() => setFilters(initialFilters)}
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
