import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Menu,
  MenuItem,
  IconButton,
  CircularProgress,
  TablePagination,
  Tooltip,
  Snackbar,
  Alert,
  TableSortLabel,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import HandshakeIcon from "@mui/icons-material/Handshake";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { borrowedService } from "../services/api";
import AddBorrowedModal from "../modals/AddBorrowedModal";
import EditBorrowedModal from "../modals/EditBorrowedModal";
import FilterBorrowedModal from "../modals/FilterBorrowedModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import { formatDate, formatTime, formatAmount } from "../utils/formatters";

const getTypeChip = (type) => {
  switch (type) {
    case "Borrowed":
    case "Loan":
      return <Chip label="Borrowed (Loan)" size="small" color="warning" variant="outlined" />;
    case "Expense":
      return <Chip label="Expense" size="small" color="error" variant="outlined" />;
    default:
      return <Chip label={type || "Expense"} size="small" />;
  }
};

const getStatusChip = (status, onToggle) => {
  const isPaid = (status || "").toLowerCase() === "paid";
  return (
    <Chip
      label={isPaid ? "Paid" : "Pending"}
      size="small"
      color={isPaid ? "success" : "warning"}
      variant="outlined"
      clickable
      onClick={onToggle}
      sx={{ cursor: "pointer", fontWeight: 600 }}
    />
  );
};

const TABLE_RADIUS = 10;

const BorrowedPage = () => {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ totalPending: 0, totalPaid: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    status: "All",
    type: "All",
    search: "",
    description: "",
    personName: undefined,
    startDate: "",
    endDate: "",
  });

  // Bulk action menu
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      if (orderBy === "date") {
        aVal = `${a.date || ""} ${a.time || ""}`;
        bVal = `${b.date || ""} ${b.time || ""}`;
      } else if (orderBy === "time") {
        aVal = a.time || "";
        bVal = b.time || "";
      } else if (orderBy === "amount") {
        aVal = Number(a.amount || 0);
        bVal = Number(b.amount || 0);
      } else if (orderBy === "personName") {
        aVal = (a.personName || "").toLowerCase();
        bVal = (b.personName || "").toLowerCase();
      } else if (orderBy === "type") {
        aVal = (a.type || "").toLowerCase();
        bVal = (b.type || "").toLowerCase();
      } else if (orderBy === "status") {
        aVal = (a.status || "").toLowerCase();
        bVal = (b.status || "").toLowerCase();
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [entries, order, orderBy]);

  // Notification
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Viewport-visibility-based sticky header and footer
  const tableContainerRef = useRef(null);
  const footerWrapperRef = useRef(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const [isFooterSticky, setIsFooterSticky] = useState(false);
  const [tableBounds, setTableBounds] = useState({ left: 0, width: "100%" });

  useEffect(() => {
    let ticking = false;

    const checkStickyStates = () => {
      const navHeight = window.innerWidth < 600 ? 56 : 64;
      const winHeight = window.innerHeight;

      if (tableContainerRef.current) {
        const tableRect = tableContainerRef.current.getBoundingClientRect();

        setTableBounds({
          left: Math.round(tableRect.left),
          width: Math.round(tableRect.width),
        });

        const headerStuck = tableRect.top <= navHeight && tableRect.bottom > navHeight + 80;
        setIsHeaderStuck(headerStuck);

        if (footerWrapperRef.current) {
          const footerRect = footerWrapperRef.current.getBoundingClientRect();
          const isTableInView = tableRect.top < winHeight - 60 && tableRect.bottom > 100;
          const isFooterOutOfView = footerRect.top > winHeight - 52;
          setIsFooterSticky(isTableInView && isFooterOutOfView);
        }
      }
      ticking = false;
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkStickyStates);
        ticking = true;
      }
    };

    checkStickyStates();

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [entries, rowsPerPage, page, loading]);

  const fetchBorrowedEntries = async () => {
    try {
      setLoading(true);
      const res = await borrowedService.getBorrowed(filters);
      if (res.success) {
        setEntries(res.data);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Error fetching borrowed entries:", err);
      setSnackbar({ open: true, message: "Failed to load borrowed entries", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowedEntries();
  }, [filters]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(entries.map((item) => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleConfirmSingleDelete = async () => {
    if (!deletingId) return;
    try {
      setActionLoading(true);
      await borrowedService.deleteBorrowed(deletingId);
      setSnackbar({ open: true, message: "Borrowed entry deleted successfully", severity: "success" });
      setDeletingId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId));
      fetchBorrowedEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to delete borrowed entry", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await borrowedService.bulkDelete(selectedIds);
      setSnackbar({ open: true, message: res.message || `${selectedIds.length} entries deleted`, severity: "success" });
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      fetchBorrowedEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk deletion", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    setStatusMenuAnchorEl(null);
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;
    try {
      await borrowedService.bulkUpdateStatus(selectedIds, newStatus);
      setSnackbar({ open: true, message: `Updated status for ${selectedIds.length} entries to ${newStatus}`, severity: "success" });
      setSelectedIds([]);
      fetchBorrowedEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk status update", severity: "error" });
    }
  };

  const handleToggleStatus = async (row) => {
    const current = (row.status || "").toLowerCase() === "paid" ? "Paid" : "Pending";
    const nextStatus = current === "Paid" ? "Pending" : "Paid";
    try {
      await borrowedService.updateBorrowed(row._id, { status: nextStatus });
      setEntries((prev) =>
        prev.map((item) => (item._id === row._id ? { ...item, status: nextStatus } : item))
      );
      setSnackbar({ open: true, message: `Status updated to ${nextStatus}`, severity: "success" });
      fetchBorrowedEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to update status", severity: "error" });
    }
  };

  const isAllSelected = entries.length > 0 && selectedIds.length === entries.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < entries.length;

  const hasActiveFilters = Boolean(
    (filters.status && filters.status !== "All") ||
    (filters.type && filters.type !== "All") ||
    filters.personName ||
    filters.description ||
    filters.startDate ||
    filters.endDate
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Top Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <HandshakeIcon color="primary" sx={{ fontSize: 30 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Borrowed
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          {/* Add Borrowed Button */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddOpen(true)}
            size="small"
          >
            Add Borrowed
          </Button>

          {/* Bulk Actions Button */}
          <Button
            variant="outlined"
            color="secondary"
            disabled={selectedIds.length === 0}
            onClick={(e) => setBulkAnchorEl(e.currentTarget)}
            size="small"
          >
            Bulk Actions ({selectedIds.length})
          </Button>

          {/* Bulk Actions Menu */}
          <Menu anchorEl={bulkAnchorEl} open={Boolean(bulkAnchorEl)} onClose={() => setBulkAnchorEl(null)}>
            <MenuItem onClick={(e) => setStatusMenuAnchorEl(e.currentTarget)}>Change Status</MenuItem>
            <MenuItem
              onClick={() => {
                setBulkAnchorEl(null);
                setIsBulkDeleteOpen(true);
              }}
              sx={{ color: "error.main" }}
            >
              Delete Selected
            </MenuItem>
          </Menu>

          {/* Submenu for Status */}
          <Menu anchorEl={statusMenuAnchorEl} open={Boolean(statusMenuAnchorEl)} onClose={() => setStatusMenuAnchorEl(null)}>
            <MenuItem onClick={() => handleBulkStatusChange("Paid")}>Set Paid</MenuItem>
            <MenuItem onClick={() => handleBulkStatusChange("Pending")}>Set Pending</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Summary KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "#fff8e1", border: "1px solid #ffe082", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#b78103", textTransform: "uppercase" }}>
                    Pending to Pay (You Owe)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#e65100", mt: 0.5 }}>
                    ₹ {formatAmount(stats.totalPending)}
                  </Typography>
                </Box>
                <HourglassEmptyIcon sx={{ color: "#f57c00", fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "#f1f8e9", border: "1px solid #c5e1a5", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#33691e", textTransform: "uppercase" }}>
                    Paid / Settled
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#2e7d32", mt: 0.5 }}>
                    ₹ {formatAmount(stats.totalPaid)}
                  </Typography>
                </Box>
                <CheckCircleOutlineIcon sx={{ color: "#43a047", fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#0d47a1", textTransform: "uppercase" }}>
                    Total Borrowed Entries
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#1565c0", mt: 0.5 }}>
                    ₹ {formatAmount(stats.totalAmount)}
                  </Typography>
                </Box>
                <HandshakeIcon sx={{ color: "#1976d2", fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters Bar */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
        <TextField
          placeholder="Search by person name or description..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          size="small"
          sx={{ flexGrow: 1, bgcolor: "background.paper" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant={hasActiveFilters ? "contained" : "outlined"}
          color={hasActiveFilters ? "primary" : "inherit"}
          startIcon={<FilterListIcon />}
          onClick={() => setIsFilterOpen(true)}
          size="small"
        >
          {hasActiveFilters ? "Filtered" : "Filter"}
        </Button>
      </Box>

      {/* Borrowed Data Table */}
      <TableContainer
        ref={tableContainerRef}
        component={Paper}
        sx={{
          borderRadius: `${TABLE_RADIUS}px`,
          border: "1px solid #e2e8f0",
          boxShadow: "none",
          overflow: "visible",
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              bgcolor: "transparent",
              position: "sticky",
              top: { xs: 56, sm: 64 },
              zIndex: 5,
              "& tr": { bgcolor: "transparent" },
              "& th": {
                bgcolor: "#f8fafc",
                position: "sticky",
                top: { xs: 56, sm: 64 },
                zIndex: 5,
                borderBottom: "1px solid #e2e8f0",
              },
            }}
          >
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{
                  borderTopLeftRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS - 1}px`,
                }}
              >
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={orderBy === "date"}
                  direction={orderBy === "date" ? order : "asc"}
                  onClick={() => handleRequestSort("date")}
                >
                  Date
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={orderBy === "time"}
                  direction={orderBy === "time" ? order : "asc"}
                  onClick={() => handleRequestSort("time")}
                >
                  Time
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={orderBy === "personName"}
                  direction={orderBy === "personName" ? order : "asc"}
                  onClick={() => handleRequestSort("personName")}
                >
                  Person / Lender
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={orderBy === "type"}
                  direction={orderBy === "type" ? order : "asc"}
                  onClick={() => handleRequestSort("type")}
                >
                  Type
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={orderBy === "status"}
                  direction={orderBy === "status" ? order : "asc"}
                  onClick={() => handleRequestSort("status")}
                >
                  Status
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }} align="right">
                <TableSortLabel
                  active={orderBy === "amount"}
                  direction={orderBy === "amount" ? order : "asc"}
                  onClick={() => handleRequestSort("amount")}
                >
                  Amount
                </TableSortLabel>
              </TableCell>

              <TableCell
                sx={{
                  fontWeight: 600,
                  borderTopRightRadius: isHeaderStuck ? 0 : `${TABLE_RADIUS - 1}px`,
                }}
                align="center"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading borrowed entries...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : sortedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <HandshakeIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No borrowed entries found. Click <strong>Add Borrowed</strong> to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                const isSelected = selectedIds.includes(row._id);

                return (
                  <TableRow
                    key={row._id}
                    hover
                    selected={isSelected}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectOne(row._id)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatTime(row.time)}</TableCell>

                    <TableCell sx={{ fontWeight: 500 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {row.personName}
                      </Box>
                      {row.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.25, fontStyle: "italic" }}
                        >
                          {row.description}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>{getTypeChip(row.type)}</TableCell>

                    <TableCell>{getStatusChip(row.status, () => handleToggleStatus(row))}</TableCell>

                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ₹ {formatAmount(row.amount)}
                    </TableCell>

                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title="Edit Borrowed">
                          <IconButton size="small" onClick={() => setEditingEntry(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeletingId(row._id)}
                          >
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

        {/* Sticky footer pagination */}
        <Box
          ref={footerWrapperRef}
          sx={{
            minHeight: 52,
            position: "relative",
            borderBottomLeftRadius: `${TABLE_RADIUS - 1}px`,
            borderBottomRightRadius: `${TABLE_RADIUS - 1}px`,
            overflow: isFooterSticky ? "visible" : "hidden",
          }}
        >
          <Box
            sx={{
              position: isFooterSticky ? "fixed" : "static",
              bottom: 0,
              left: isFooterSticky && tableBounds.left !== undefined ? `${tableBounds.left}px` : "auto",
              width: isFooterSticky && tableBounds.width ? `${tableBounds.width}px` : "100%",
              maxWidth: isFooterSticky && tableBounds.width ? `${tableBounds.width}px` : "none",
              boxSizing: "border-box",
              zIndex: 10,
              bgcolor: "background.paper",
              borderTop: "1px solid #e2e8f0",
              borderLeft: isFooterSticky ? "1px solid #e2e8f0" : "none",
              borderRight: isFooterSticky ? "1px solid #e2e8f0" : "none",
              borderTopLeftRadius: isFooterSticky ? `${TABLE_RADIUS}px` : 0,
              borderTopRightRadius: isFooterSticky ? `${TABLE_RADIUS}px` : 0,
              borderBottomLeftRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
              borderBottomRightRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
              boxShadow: isFooterSticky ? "0 -4px 16px rgba(0,0,0,0.10)" : "none",
              transition: "box-shadow 0.2s, background-color 0.2s",
            }}
          >
            <TablePagination
              rowsPerPageOptions={[5, 10, 20, 50, 100]}
              component="div"
              count={entries.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                borderBottomLeftRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                borderBottomRightRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                "& .MuiTablePagination-toolbar": {
                  borderBottomLeftRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                  borderBottomRightRadius: isFooterSticky ? 0 : `${TABLE_RADIUS - 1}px`,
                },
              }}
            />
          </Box>
        </Box>
      </TableContainer>

      {/* Modals */}
      <AddBorrowedModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onBorrowedCreated={() => {
          fetchBorrowedEntries();
          setSnackbar({ open: true, message: "Borrowed entry created successfully", severity: "success" });
        }}
      />

      <EditBorrowedModal
        open={Boolean(editingEntry)}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onBorrowedUpdated={() => {
          fetchBorrowedEntries();
          setSnackbar({ open: true, message: "Borrowed entry updated successfully", severity: "success" });
        }}
      />

      <FilterBorrowedModal
        open={isFilterOpen}
        currentFilters={filters}
        onClose={() => setIsFilterOpen(false)}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          setPage(0);
        }}
        onResetFilters={() => {
          setFilters({
            status: "All",
            type: "All",
            search: "",
            description: "",
            personName: undefined,
            startDate: "",
            endDate: "",
          });
          setPage(0);
        }}
      />

      {/* Delete Single Modal */}
      <DeleteConfirmModal
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Borrowed Entry"
        message="Are you sure you want to delete this borrowed entry? This action cannot be reversed."
        loading={actionLoading}
      />

      {/* Delete Bulk Modal */}
      <DeleteConfirmModal
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Borrowed Entries"
        message={`Are you sure you want to delete ${selectedIds.length} selected borrowed entries?`}
        loading={actionLoading}
      />

      {/* Toast Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BorrowedPage;
