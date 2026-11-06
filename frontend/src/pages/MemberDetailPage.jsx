import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Stack,
  CircularProgress,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Divider,
  Checkbox,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { memberService, entryService, toPayService } from "../services/api";
import { formatDate, formatAmount, capitalizeName } from "../utils/formatters";
import MemberDetailFilterModal, { defaultMemberDetailFilters } from "../modals/MemberDetailFilterModal";

const MemberDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(defaultMemberDetailFilters);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection & Bulk Status
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredEntries.map((e) => e._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (entryId) => {
    setSelectedIds((prev) =>
      prev.includes(entryId) ? prev.filter((i) => i !== entryId) : [...prev, entryId]
    );
  };

  const handleToggleStatus = async (entry) => {
    if (entry.canEdit === false) {
      setSnackbar({
        open: true,
        message: "Only the creator of this entry can change the status.",
        severity: "warning",
      });
      return;
    }

    const isReceive = entry.directionType === "receive";
    const current = entry.paymentStatus;
    let nextStatus;
    if (isReceive) {
      nextStatus = current === "Received" ? "Pending" : "Received";
    } else {
      nextStatus = current === "Paid" ? "Pending" : "Paid";
    }

    // Optimistically update status locally immediately for instant feedback
    setData((prev) => {
      if (!prev) return prev;
      const updatedEntries = (prev.entries || []).map((item) =>
        item._id === entry._id ? { ...item, paymentStatus: nextStatus } : item
      );
      return { ...prev, entries: updatedEntries };
    });

    try {
      if (isReceive) {
        await entryService.updateEntry(entry._id, { paymentStatus: nextStatus });
      } else {
        await toPayService.updateToPayEntry(entry._id, { paymentStatus: nextStatus });
      }

      setSnackbar({
        open: true,
        message: `Status updated to ${nextStatus}.`,
        severity: "success",
      });

      // Background silent sync without full screen loading spinner
      fetchMemberDetail(false);
    } catch (err) {
      console.error(err);
      // Revert status on failure
      setData((prev) => {
        if (!prev) return prev;
        const revertedEntries = (prev.entries || []).map((item) =>
          item._id === entry._id ? { ...item, paymentStatus: current } : item
        );
        return { ...prev, entries: revertedEntries };
      });
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to update status.",
        severity: "error",
      });
    }
  };

  const handleBulkChangeStatus = async (target) => {
    setStatusMenuAnchorEl(null);
    setBulkAnchorEl(null);

    const selectedEntries = entries.filter((e) => selectedIds.includes(e._id));
    const editableEntries = selectedEntries.filter((e) => e.canEdit !== false);

    if (editableEntries.length === 0) {
      setSnackbar({
        open: true,
        message: "None of the selected entries can be updated because you are not their creator.",
        severity: "warning",
      });
      return;
    }

    const receiveIds = [];
    const payIds = [];
    for (const e of editableEntries) {
      if (e.directionType === "receive") {
        receiveIds.push(e._id);
      } else {
        payIds.push(e._id);
      }
    }

    try {
      let updatedCount = 0;
      if (receiveIds.length > 0) {
        const statusVal = target === "Settled" ? "Received" : "Pending";
        const res = await entryService.bulkUpdateStatus(receiveIds, statusVal);
        updatedCount += res.updatedCount || receiveIds.length;
      }
      if (payIds.length > 0) {
        const statusVal = target === "Settled" ? "Paid" : "Pending";
        const res = await toPayService.bulkUpdateStatus(payIds, statusVal);
        updatedCount += res.updatedCount || payIds.length;
      }

      setSnackbar({
        open: true,
        message: `Updated status for ${updatedCount} entries to ${target === "Settled" ? "Settled" : "Pending"}.`,
        severity: "success",
      });
      setSelectedIds([]);
      // Silent refresh without full-page spinner
      fetchMemberDetail(false);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed bulk status update.",
        severity: "error",
      });
    }
  };

  const renderStatusChip = (entry) => {
    const isReceive = entry.directionType === "receive";
    const isPending = entry.paymentStatus === "Pending";
    const targetNext = isReceive ? (isPending ? "Received" : "Pending") : (isPending ? "Paid" : "Pending");
    const canEdit = entry.canEdit !== false;

    return (
      <Tooltip title={canEdit ? `Click to mark as ${targetNext}` : "Only the creator of this entry can change the status"}>
        <span>
          <Chip
            label={entry.paymentStatus}
            size="small"
            color={isPending ? "warning" : "success"}
            variant={isPending ? "outlined" : "filled"}
            clickable={canEdit}
            onClick={canEdit ? (e) => { e.stopPropagation(); handleToggleStatus(entry); } : undefined}
            sx={{
              height: 24,
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: canEdit ? "pointer" : "not-allowed",
              opacity: canEdit ? 1 : 0.75,
              transition: "all 0.15s ease",
              "&:hover": canEdit ? { transform: "scale(1.05)" } : {},
            }}
          />
        </span>
      </Tooltip>
    );
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.direction && filters.direction !== "all") count++;
    if (filters.type && filters.type !== "All") count++;
    if (filters.status && filters.status !== "All") count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.minAmount !== "" && filters.minAmount !== undefined && filters.minAmount !== null) count++;
    if (filters.maxAmount !== "" && filters.maxAmount !== undefined && filters.maxAmount !== null) count++;
    if (filters.description && filters.description.trim()) count++;
    return count;
  }, [filters]);

  const fetchMemberDetail = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await memberService.getMemberEntriesDetail(id);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Error fetching member details:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMemberDetail();
    }
  }, [id]);

  const member = data?.member;
  const stats = data?.stats || {
    pendingReceiveAmount: 0,
    pendingPayAmount: 0,
    netBalance: 0,
    totalEntries: 0,
    receiveEntriesCount: 0,
    payEntriesCount: 0,
  };
  const entries = data?.entries || [];

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Direction filter
      if (filters.direction === "receive" && e.directionType !== "receive") return false;
      if (filters.direction === "pay" && e.directionType !== "pay") return false;

      // Type filter
      if (filters.type && filters.type !== "All") {
        const t = (e.type || "").toLowerCase();
        if (t !== filters.type.toLowerCase()) return false;
      }

      // Status filter
      if (filters.status === "Pending" && e.paymentStatus !== "Pending") return false;
      if (filters.status === "Settled" && e.paymentStatus !== "Received" && e.paymentStatus !== "Paid") return false;

      // Date range filter
      if (filters.startDate && (!e.date || e.date < filters.startDate)) return false;
      if (filters.endDate && (!e.date || e.date > filters.endDate)) return false;

      // Amount range filter
      const amt = Number(e.amount) || 0;
      if (filters.minAmount !== "" && filters.minAmount !== undefined && filters.minAmount !== null && amt < Number(filters.minAmount)) return false;
      if (filters.maxAmount !== "" && filters.maxAmount !== undefined && filters.maxAmount !== null && amt > Number(filters.maxAmount)) return false;

      // Description filter
      if (filters.description && !(e.description || "").toLowerCase().includes(filters.description.toLowerCase().trim())) {
        return false;
      }

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const desc = (e.description || "").toLowerCase();
        const type = (e.type || "").toLowerCase();
        const amtStr = String(e.amount);
        const date = (e.date || "").toLowerCase();
        const creator = (e.creatorName || "").toLowerCase();
        if (!desc.includes(q) && !type.includes(q) && !amtStr.includes(q) && !date.includes(q) && !creator.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [entries, filters, searchQuery]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!member) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Member not found
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/members")} sx={{ mt: 2 }}>
          Back to Members
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1200, mx: "auto", width: "100%", boxSizing: "border-box" }}>
      {/* 1. Header & Navigation */}
      <Box sx={{ mb: 2.5 }}>
        <Breadcrumbs sx={{ mb: 1, fontSize: "0.85rem" }}>
          <Link underline="hover" color="inherit" onClick={() => navigate("/members")} sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            Members
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            {capitalizeName(member.fullName)}
          </Typography>
        </Breadcrumbs>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/members")} variant="outlined" size="small" sx={{ textTransform: "none", borderRadius: 2 }}>
            Back to Members
          </Button>

          {member.hasJoined ? <Chip icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 16 } }} />} label="Joined Member" color="success" size="small" sx={{ fontWeight: 600 }} /> : member.inviteSent ? <Chip label="Invite Sent" color="primary" variant="outlined" size="small" sx={{ fontWeight: 600 }} /> : <Chip label="Pending Registration" size="small" variant="outlined" />}
        </Box>
      </Box>

      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        {/* 2. Member Profile Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Avatar
              sx={{
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                bgcolor: member.avatarColor || "#1976d2",
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                fontWeight: 700,
              }}
            >
              {(member.fullName || "M")[0].toUpperCase()}
            </Avatar>

            <Box sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden" }}>
              <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", sm: "1.45rem" }, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {capitalizeName(member.fullName)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5, flexWrap: "wrap", minWidth: 0 }}>
                {member.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", minWidth: 0, maxWidth: "100%" }}>
                    <EmailOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", wordBreak: "break-all" }}>
                      {member.email}
                    </Typography>
                  </Box>
                )}
                {member.phoneNumber && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", minWidth: 0, maxWidth: "100%" }}>
                    <PhoneOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.phoneNumber}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* 3. Financial Summary Cards (CSS Grid) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(3, 1fr)",
            },
            gap: { xs: 1.5, sm: 2 },
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Card 1: Pending to Receive */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #bfdbfe",
              bgcolor: "#f0f9ff",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#0284c7", fontSize: "0.72rem" }}>
                Pending Receive
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(2, 132, 199, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CallReceivedIcon sx={{ fontSize: 16, color: "#0284c7" }} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0369a1", fontSize: { xs: "1.15rem", sm: "1.3rem" } }}>
              ₹ {formatAmount(stats.pendingReceiveAmount)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              Member owes you
            </Typography>
          </Card>

          {/* Card 2: Pending to Pay */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #fed7aa",
              bgcolor: "#fff7ed",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#ea580c", fontSize: "0.72rem" }}>
                Pending Pay
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(234, 88, 12, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PaymentIcon sx={{ fontSize: 16, color: "#ea580c" }} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#c2410c", fontSize: { xs: "1.15rem", sm: "1.3rem" } }}>
              ₹ {formatAmount(stats.pendingPayAmount)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              You owe member
            </Typography>
          </Card>

          {/* Card 3: Final Receive / Final Pay */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${stats.pendingReceiveAmount > stats.pendingPayAmount ? "#bbf7d0" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "#fed7aa" : "#e2e8f0"}`,
              bgcolor: stats.pendingReceiveAmount > stats.pendingPayAmount ? "#f0fdf4" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "#fff7ed" : "#ffffff",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: stats.pendingReceiveAmount > stats.pendingPayAmount ? "#16a34a" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "#ea580c" : "#475569",
                  fontSize: "0.72rem",
                }}
              >
                {stats.pendingReceiveAmount > stats.pendingPayAmount ? "Final Receive" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "Final Pay" : "Final Receive"}
              </Typography>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: stats.pendingReceiveAmount > stats.pendingPayAmount ? "rgba(22, 163, 74, 0.15)" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "rgba(234, 88, 12, 0.15)" : "rgba(71, 85, 105, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AccountBalanceWalletIcon
                  sx={{
                    fontSize: 16,
                    color: stats.pendingReceiveAmount > stats.pendingPayAmount ? "#16a34a" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "#ea580c" : "#475569",
                  }}
                />
              </Box>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: stats.pendingReceiveAmount > stats.pendingPayAmount ? "#16a34a" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "#ea580c" : "#475569",
                fontSize: { xs: "1.15rem", sm: "1.3rem" },
              }}
            >
              ₹ {formatAmount(Math.abs(stats.pendingReceiveAmount - stats.pendingPayAmount))}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              {stats.pendingReceiveAmount > stats.pendingPayAmount ? "You will receive" : stats.pendingPayAmount > stats.pendingReceiveAmount ? "You will pay" : "All settled"}
            </Typography>
          </Card>
        </Box>

        {/* 4. Filter & Search Toolbar */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            {/* Filter Modal Button */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant={activeFiltersCount > 0 ? "contained" : "outlined"}
                startIcon={<FilterListIcon />}
                onClick={() => setIsFilterOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
              </Button>

              {/* Bulk Actions Menu */}
              <Menu
                anchorEl={bulkAnchorEl}
                open={Boolean(bulkAnchorEl)}
                onClose={() => setBulkAnchorEl(null)}
              >
                <MenuItem
                  onClick={(e) => {
                    setBulkAnchorEl(null);
                    setStatusMenuAnchorEl(e.currentTarget);
                  }}
                >
                  Change Status
                </MenuItem>
              </Menu>

              {/* Status Submenu */}
              <Menu
                anchorEl={statusMenuAnchorEl}
                open={Boolean(statusMenuAnchorEl)}
                onClose={() => setStatusMenuAnchorEl(null)}
              >
                <MenuItem onClick={() => handleBulkChangeStatus("Settled")}>
                  Set Received / Paid
                </MenuItem>
                <MenuItem onClick={() => handleBulkChangeStatus("Pending")}>
                  Set Pending
                </MenuItem>
              </Menu>
            </Box>

            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { xs: "100%", sm: 220 }, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Box>
        </Paper>

        {/* 5. Transactions List (Mobile Card + Desktop Table) */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            overflow: "hidden",
          }}
        >
          {/* Mobile Card View */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            {/* Subheader Toolbar with Select All */}
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: 1.5,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Checkbox
                  size="small"
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filteredEntries.length}
                  checked={filteredEntries.length > 0 && selectedIds.length === filteredEntries.length}
                  onChange={handleSelectAll}
                  sx={{ p: 0.25 }}
                />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#475467" }}>
                  Select All ({filteredEntries.length})
                </Typography>
              </Box>
              {selectedIds.length > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                    {selectedIds.length} selected
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={(e) => setBulkAnchorEl(e.currentTarget)}
                    sx={{
                      py: 0.25,
                      px: 1,
                      fontSize: "0.75rem",
                      borderRadius: 1.5,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Bulk Actions
                  </Button>
                </Box>
              )}
            </Box>

            {filteredEntries.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: "text.secondary" }}>
                  No entries found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Try adjusting your filters or create a new entry
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5} sx={{ p: 1.5 }}>
                {filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((entry) => {
                  const isReceive = entry.directionType === "receive";
                  const isPending = entry.paymentStatus === "Pending";
                  const isSelected = selectedIds.includes(entry._id);
                  return (
                    <Paper
                      key={entry._id}
                      elevation={0}
                      sx={{
                        p: 1.75,
                        borderRadius: 2.5,
                        border: "1px solid #e2e8f0",
                        outline: isSelected ? "2px solid #1976d2" : "none",
                        outlineOffset: "-2px",
                        bgcolor: isSelected ? "rgba(25, 118, 210, 0.03)" : "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => handleSelectOne(entry._id)}
                            sx={{ p: 0.25 }}
                          />
                          <Chip label={entry.direction} size="small" color={isReceive ? "primary" : "warning"} sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }} />
                          <Chip label={entry.type} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />
                          {entry.isSplit && <Chip icon={<CallSplitIcon sx={{ "&&": { fontSize: 13 } }} />} label="Split" size="small" sx={{ height: 22, fontSize: "0.68rem" }} />}
                        </Box>

                        {renderStatusChip(entry)}
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", my: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            color: isReceive ? "#1976d2" : "#ea580c",
                            fontSize: "1.25rem",
                          }}
                        >
                          ₹ {formatAmount(entry.amount)}
                        </Typography>

                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                          {formatDate(entry.date)} • {entry.time || ""}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1, borderTop: "1px solid #f1f5f9" }}>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          Source: <strong>{entry.creatorName}</strong>
                        </Typography>
                        {entry.description && (
                          <Typography variant="caption" sx={{ color: "#64748b", fontStyle: "italic", maxWidth: 180 }} noWrap>
                            {entry.description}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Desktop Table View */}
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            {selectedIds.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2.5,
                  py: 1.25,
                  bgcolor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {selectedIds.length} selected
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={(e) => setBulkAnchorEl(e.currentTarget)}
                  sx={{
                    py: 0.25,
                    px: 1.25,
                    fontSize: "0.75rem",
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Bulk Actions
                </Button>
              </Box>
            )}
            <TableContainer>
              <Table sx={{ minWidth: 700 }}>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        indeterminate={selectedIds.length > 0 && selectedIds.length < filteredEntries.length}
                        checked={filteredEntries.length > 0 && selectedIds.length === filteredEntries.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Creator / Source</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: "#475467" }}>
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          No entries found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Try adjusting your filters or create a new entry
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((entry) => {
                      const isReceive = entry.directionType === "receive";
                      const isPending = entry.paymentStatus === "Pending";
                      return (
                        <TableRow key={entry._id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={selectedIds.includes(entry._id)}
                              onChange={() => handleSelectOne(entry._id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={entry.direction} size="small" color={isReceive ? "primary" : "warning"} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {entry.type}
                              </Typography>
                              {entry.isSplit && <Chip icon={<CallSplitIcon sx={{ "&&": { fontSize: 13 } }} />} label="Split" size="small" sx={{ height: 20, fontSize: "0.68rem" }} />}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatDate(entry.date)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {entry.time || ""}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Chip
                              label={entry.creatorName}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 22,
                                fontSize: "0.72rem",
                                fontWeight: entry.isMine ? 500 : 700,
                                borderColor: entry.isMine ? "#cbd5e1" : "#1976d2",
                                color: entry.isMine ? "text.primary" : "primary.main",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {entry.description || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {renderStatusChip(entry)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 800,
                                color: isReceive ? "#1976d2" : "#ea580c",
                              }}
                            >
                              ₹ {formatAmount(entry.amount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <TablePagination component="div" count={filteredEntries.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} sx={{ borderTop: "1px solid #e2e8f0" }} />
        </Paper>
      </Stack>

      {/* Filter Modal like all pages have */}
      <MemberDetailFilterModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilters={filters}
        onApplyFilters={(applied) => {
          setFilters(applied);
          setPage(0);
        }}
        onResetFilters={() => {
          setFilters(defaultMemberDetailFilters);
          setPage(0);
        }}
      />

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MemberDetailPage;
