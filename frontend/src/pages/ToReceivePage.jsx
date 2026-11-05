import React, { useState, useEffect, useMemo } from "react";
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
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { entryService } from "../services/api";
import AddEntryModal from "../modals/AddEntryModal";
import EditEntryModal from "../modals/EditEntryModal";
import FilterModal from "../modals/FilterModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import { formatDate, formatTime, formatAmount, capitalizeName } from "../utils/formatters";

const getTypeChip = (type) => {
  switch (type) {
    case "Expense":
      return <Chip label="Expense" size="small" color="error" variant="outlined" />;
    case "Loan":
      return <Chip label="Loan" size="small" color="warning" variant="outlined" />;
    case "Split":
      return <Chip icon={<CallSplitIcon sx={{ "&&": { fontSize: 16 } }} />} label="Split" size="small" color="info" variant="outlined" />;
    default:
      return <Chip label={type || "Expense"} size="small" variant="outlined" />;
  }
};

const getStatusChip = (status, onToggle) => {
  const isReceived = status === "Received";
  return (
    <Chip
      label={isReceived ? "Received" : "Pending"}
      size="small"
      color={isReceived ? "success" : "warning"}
      variant="outlined"
      clickable
      onClick={onToggle}
      sx={{ cursor: "pointer", fontWeight: 600 }}
    />
  );
};

const TABLE_RADIUS = 10;

const ToReceivePage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Confirm modals state
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [confirmBulkStatus, setConfirmBulkStatus] = useState({ open: false, newStatus: "" });
  const [itemToDelete, setItemToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    status: "All",
    paymentStatus: "All",
    search: "",
    description: "",
    selectedNames: [],
    names: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });

  // Table Sorting state
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("date");

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Bulk actions menus
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState(null);

  // Request sort handler
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Sort entries comparator
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
      } else if (orderBy === "forFromName") {
        aVal = (a.forFromName || "").toLowerCase();
        bVal = (b.forFromName || "").toLowerCase();
      } else if (orderBy === "type") {
        aVal = (a.type || a.status || "").toLowerCase();
        bVal = (b.type || b.status || "").toLowerCase();
      } else if (orderBy === "paymentStatus") {
        aVal = (a.paymentStatus || "").toLowerCase();
        bVal = (b.paymentStatus || "").toLowerCase();
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

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await entryService.getEntries(filters);
      if (res.success) {
        setEntries(res.data);
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to load entries", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
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
    if (!itemToDelete) return;
    try {
      setActionLoading(true);
      await entryService.deleteEntry(itemToDelete);
      setSelectedIds((prev) => prev.filter((item) => item !== itemToDelete));
      setSnackbar({ open: true, message: "Entry deleted successfully", severity: "success" });
      setItemToDelete(null);
      fetchEntries();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to delete entry", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      await entryService.bulkDelete(selectedIds);
      setSnackbar({ open: true, message: `${selectedIds.length} entries deleted successfully`, severity: "success" });
      setSelectedIds([]);
      setConfirmBulkDeleteOpen(false);
      fetchEntries();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed bulk deletion", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBulkStatusChange = async () => {
    const newStatus = confirmBulkStatus.newStatus;
    if (selectedIds.length === 0 || !newStatus) return;
    try {
      setActionLoading(true);
      await entryService.bulkUpdateStatus(selectedIds, { paymentStatus: newStatus });
      setSnackbar({ open: true, message: `Updated status for ${selectedIds.length} entries to ${newStatus}`, severity: "success" });
      setSelectedIds([]);
      setConfirmBulkStatus({ open: false, newStatus: "" });
      fetchEntries();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed bulk status update", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (row) => {
    const current = row.paymentStatus === "Received" ? "Received" : "Pending";
    const nextStatus = current === "Received" ? "Pending" : "Received";
    try {
      await entryService.updateEntry(row._id, { paymentStatus: nextStatus });
      setEntries((prev) =>
        prev.map((item) => (item._id === row._id ? { ...item, paymentStatus: nextStatus } : item))
      );
      setSnackbar({ open: true, message: `Status updated to ${nextStatus}`, severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to update status", severity: "error" });
    }
  };

  const isAllSelected = entries.length > 0 && selectedIds.length === entries.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < entries.length;

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
          To Receive
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          {/* Filter Button */}
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setIsFilterOpen(true)} size="small">
            Filter
          </Button>

          {/* Add To Receive Button */}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddOpen(true)} size="small">
            Add To Receive
          </Button>

          {/* Bulk Actions Button */}
          <Button variant="outlined" color="secondary" disabled={selectedIds.length === 0} onClick={(e) => setBulkAnchorEl(e.currentTarget)} size="small">
            Bulk Actions ({selectedIds.length})
          </Button>

          {/* Bulk Actions Menu */}
          <Menu anchorEl={bulkAnchorEl} open={Boolean(bulkAnchorEl)} onClose={() => setBulkAnchorEl(null)}>
            <MenuItem onClick={(e) => setStatusMenuAnchorEl(e.currentTarget)}>Change Status</MenuItem>
            <MenuItem
              onClick={() => {
                setBulkAnchorEl(null);
                setConfirmBulkDeleteOpen(true);
              }}
              sx={{ color: "error.main" }}
            >
              Delete Selected
            </MenuItem>
          </Menu>

          {/* Submenu for Status */}
          <Menu anchorEl={statusMenuAnchorEl} open={Boolean(statusMenuAnchorEl)} onClose={() => setStatusMenuAnchorEl(null)}>
            <MenuItem
              onClick={() => {
                setStatusMenuAnchorEl(null);
                setBulkAnchorEl(null);
                setConfirmBulkStatus({ open: true, newStatus: "Received" });
              }}
            >
              Set Received
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusMenuAnchorEl(null);
                setBulkAnchorEl(null);
                setConfirmBulkStatus({ open: true, newStatus: "Pending" });
              }}
            >
              Set Pending
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* To Receive Data Table Card */}
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

              <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "forFromName" ? order : false}>
                <TableSortLabel
                  active={orderBy === "forFromName"}
                  direction={orderBy === "forFromName" ? order : "asc"}
                  onClick={() => handleRequestSort("forFromName")}
                  sx={{ fontWeight: 600 }}
                >
                  Member
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "date" ? order : false}>
                <TableSortLabel
                  active={orderBy === "date"}
                  direction={orderBy === "date" ? order : "asc"}
                  onClick={() => handleRequestSort("date")}
                  sx={{ fontWeight: 600 }}
                >
                  Date
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "time" ? order : false}>
                <TableSortLabel
                  active={orderBy === "time"}
                  direction={orderBy === "time" ? order : "asc"}
                  onClick={() => handleRequestSort("time")}
                  sx={{ fontWeight: 600 }}
                >
                  Time
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "type" ? order : false}>
                <TableSortLabel
                  active={orderBy === "type"}
                  direction={orderBy === "type" ? order : "asc"}
                  onClick={() => handleRequestSort("type")}
                  sx={{ fontWeight: 600 }}
                >
                  Type
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }} sortDirection={orderBy === "paymentStatus" ? order : false}>
                <TableSortLabel
                  active={orderBy === "paymentStatus"}
                  direction={orderBy === "paymentStatus" ? order : "asc"}
                  onClick={() => handleRequestSort("paymentStatus")}
                  sx={{ fontWeight: 600 }}
                >
                  Status
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 600 }} align="right" sortDirection={orderBy === "amount" ? order : false}>
                <TableSortLabel
                  active={orderBy === "amount"}
                  direction={orderBy === "amount" ? order : "asc"}
                  onClick={() => handleRequestSort("amount")}
                  sx={{ fontWeight: 600 }}
                >
                  Amount
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
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No entries found. Click <strong>Add To Receive</strong> to create one.
                </TableCell>
              </TableRow>
            ) : (
              sortedEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                const isSelected = selectedIds.includes(row._id);
                const rowType = row.type || (["Expense", "Loan", "Split"].includes(row.status) ? row.status : "Expense");

                return (
                  <TableRow key={row._id} hover selected={isSelected} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} onChange={() => handleSelectOne(row._id)} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, textTransform: "capitalize" }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {capitalizeName(row.forFromName)}
                        {row.isSplit && <Chip label="Split group" size="small" variant="outlined" sx={{ ml: 1, fontSize: "0.65rem", height: 18, textTransform: "none" }} />}
                      </Box>
                      {row.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontStyle: "italic" }}>
                          {row.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatTime(row.time)}</TableCell>
                    <TableCell>{getTypeChip(rowType)}</TableCell>
                    <TableCell>
                      {getStatusChip(row.paymentStatus, () => handleToggleStatus(row))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ₹ {formatAmount(row.amount)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title={row.isSplit ? "Edit split group entry" : "Edit entry"}>
                          <IconButton size="small" color="primary" onClick={() => setEditingEntry(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete entry">
                          <IconButton size="small" color="error" onClick={() => setItemToDelete(row._id)}>
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
      </TableContainer>

      {/* Pagination Footer - Fixed to Card, Never scrolls horizontally */}
      <Divider />
      <Box sx={{ width: "100%", bgcolor: "background.paper" }}>
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
            width: "100%",
            "& .MuiTablePagination-toolbar": {
              flexWrap: { xs: "wrap", sm: "nowrap" },
              justifyContent: { xs: "center", sm: "flex-end" },
              px: { xs: 1, sm: 2 },
              gap: { xs: 0.5, sm: 0 },
            },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: { xs: "0.78rem", sm: "0.875rem" },
              my: 0.5,
            },
          }}
        />
      </Box>
    </Paper>

      {/* Modals */}
      <AddEntryModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onEntryCreated={() => {
          fetchEntries();
          setSnackbar({ open: true, message: "Entry created successfully", severity: "success" });
        }}
      />

      <EditEntryModal
        open={Boolean(editingEntry)}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onEntryUpdated={(msg) => {
          fetchEntries();
          setSnackbar({ open: true, message: msg || "Entry updated successfully", severity: "success" });
        }}
      />

      <FilterModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilters={filters}
        onApplyFilters={(applied) => setFilters(applied)}
        onResetFilters={() =>
          setFilters({
            status: "All",
            paymentStatus: "All",
            search: "",
            description: "",
            selectedNames: [],
            names: "",
            startDate: "",
            endDate: "",
            minAmount: "",
            maxAmount: "",
          })
        }
      />

      {/* Single Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        loading={actionLoading}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Confirm Bulk Deletion"
        message={`Are you sure you want to delete ${selectedIds.length} selected entries? This action cannot be undone.`}
        loading={actionLoading}
        confirmText={`Delete (${selectedIds.length})`}
      />

      {/* Bulk Status Change Confirmation Modal */}
      <DeleteConfirmModal
        open={confirmBulkStatus.open}
        onClose={() => setConfirmBulkStatus({ open: false, newStatus: "" })}
        onConfirm={handleConfirmBulkStatusChange}
        title="Confirm Status Change"
        message={`Are you sure you want to set status to "${confirmBulkStatus.newStatus}" for ${selectedIds.length} selected entries?`}
        loading={actionLoading}
        confirmText="Update Status"
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

export default ToReceivePage;
