import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, Checkbox, Chip, Menu, MenuItem, IconButton, CircularProgress, TablePagination, Tooltip, Snackbar, Alert } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { entryService } from "../services/api";
import AddEntryModal from "../modals/AddEntryModal";
import EditEntryModal from "../modals/EditEntryModal";
import FilterModal from "../modals/FilterModal";

const getTypeChip = (type) => {
  switch (type) {
    case "Expense":
      return <Chip label="Expense" size="small" color="error" variant="outlined" />;
    case "Received":
      return <Chip label="Received" size="small" color="success" variant="outlined" />;
    case "Loan":
      return <Chip label="Loan" size="small" color="warning" variant="outlined" />;
    case "Split":
      return <Chip icon={<CallSplitIcon sx={{ "&&": { fontSize: 16 } }} />} label="Split" size="small" color="info" variant="outlined" />;
    case "Add Balance":
      return <Chip icon={<AccountBalanceWalletIcon sx={{ "&&": { fontSize: 16 } }} />} label="Add Balance" size="small" color="primary" variant="outlined" />;
    default:
      return <Chip label={type || "Expense"} size="small" />;
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

const EntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    status: "All",
    search: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });

  // Bulk action menu
  const [bulkAnchorEl, setBulkAnchorEl] = useState(null);
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] = useState(null);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      console.error("Failed to fetch entries:", err);
      setSnackbar({ open: true, message: "Failed to load entries from MongoDB", severity: "error" });
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

  const handleDeleteSingle = async (id) => {
    try {
      await entryService.deleteEntry(id);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setSnackbar({ open: true, message: "Entry deleted", severity: "success" });
      fetchEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to delete entry", severity: "error" });
    }
  };

  const handleBulkDelete = async () => {
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;
    try {
      await entryService.bulkDelete(selectedIds);
      setSnackbar({ open: true, message: `${selectedIds.length} entries deleted`, severity: "success" });
      setSelectedIds([]);
      fetchEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk deletion", severity: "error" });
    }
  };

  const handleBulkTypeChange = async (newType) => {
    setTypeMenuAnchorEl(null);
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;
    try {
      await entryService.bulkUpdateStatus(selectedIds, { type: newType, isTypeUpdate: true });
      setSnackbar({ open: true, message: `Updated type for ${selectedIds.length} entries`, severity: "success" });
      setSelectedIds([]);
      fetchEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk type update", severity: "error" });
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    setStatusMenuAnchorEl(null);
    setBulkAnchorEl(null);
    if (selectedIds.length === 0) return;
    try {
      await entryService.bulkUpdateStatus(selectedIds, { paymentStatus: newStatus });
      setSnackbar({ open: true, message: `Updated status for ${selectedIds.length} entries to ${newStatus}`, severity: "success" });
      setSelectedIds([]);
      fetchEntries();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed bulk status update", severity: "error" });
    }
  };

  const handleToggleStatus = async (row) => {
    const current = row.paymentStatus === 'Received' ? 'Received' : 'Pending';
    const nextStatus = current === 'Received' ? 'Pending' : 'Received';
    try {
      await entryService.updateEntry(row._id, { paymentStatus: nextStatus });
      setEntries((prev) =>
        prev.map((item) => (item._id === row._id ? { ...item, paymentStatus: nextStatus } : item))
      );
      setSnackbar({ open: true, message: `Status updated to ${nextStatus}`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
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
          Entries
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          {/* Filter Button */}
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setIsFilterOpen(true)} size="small">
            Filter
          </Button>

          {/* Add Entries Button */}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddOpen(true)} size="small">
            Add Entries
          </Button>

          {/* Bulk Actions Button */}
          <Button variant="outlined" color="secondary" disabled={selectedIds.length === 0} onClick={(e) => setBulkAnchorEl(e.currentTarget)} size="small">
            Bulk Actions ({selectedIds.length})
          </Button>

          {/* Bulk Actions Menu */}
          <Menu anchorEl={bulkAnchorEl} open={Boolean(bulkAnchorEl)} onClose={() => setBulkAnchorEl(null)}>
            <MenuItem onClick={(e) => setTypeMenuAnchorEl(e.currentTarget)}>Change Type</MenuItem>
            <MenuItem onClick={(e) => setStatusMenuAnchorEl(e.currentTarget)}>Change Status</MenuItem>
            <MenuItem onClick={handleBulkDelete} sx={{ color: "error.main" }}>
              Delete Selected
            </MenuItem>
          </Menu>

          {/* Submenu for Type */}
          <Menu anchorEl={typeMenuAnchorEl} open={Boolean(typeMenuAnchorEl)} onClose={() => setTypeMenuAnchorEl(null)}>
            <MenuItem onClick={() => handleBulkTypeChange("Add Balance")}>Set Add Balance</MenuItem>
            <MenuItem onClick={() => handleBulkTypeChange("Expense")}>Set Expense</MenuItem>
            <MenuItem onClick={() => handleBulkTypeChange("Loan")}>Set Loan</MenuItem>
            <MenuItem onClick={() => handleBulkTypeChange("Received")}>Set Received</MenuItem>
          </Menu>

          {/* Submenu for Status */}
          <Menu anchorEl={statusMenuAnchorEl} open={Boolean(statusMenuAnchorEl)} onClose={() => setStatusMenuAnchorEl(null)}>
            <MenuItem onClick={() => handleBulkStatusChange("Received")}>Set Received</MenuItem>
            <MenuItem onClick={() => handleBulkStatusChange("Pending")}>Set Pending</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Entries Data Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid #e2e8f0", boxShadow: "none" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox indeterminate={isIndeterminate} checked={isAllSelected} onChange={handleSelectAll} size="small" />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>For/From Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">
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
                  No entries found. Click <strong>Add Entries</strong> to create one.
                </TableCell>
              </TableRow>
            ) : (
              entries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                const isSelected = selectedIds.includes(row._id);
                const rowType = row.type || (["Add Balance", "Expense", "Loan", "Received", "Split"].includes(row.status) ? row.status : "Expense");

                return (
                  <TableRow key={row._id} hover selected={isSelected} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} onChange={() => handleSelectOne(row._id)} size="small" />
                    </TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {row.forFromName}
                        {row.isSplit && <Chip label="Split group" size="small" variant="outlined" sx={{ ml: 1, fontSize: "0.65rem", height: 18 }} />}
                      </Box>
                      {row.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontStyle: "italic" }}>
                          {row.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{getTypeChip(rowType)}</TableCell>
                    <TableCell>{getStatusChip(row.paymentStatus, () => handleToggleStatus(row))}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ₹ {Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title={row.isSplit ? "Edit split group entry" : "Edit entry"}>
                          <IconButton size="small" color="primary" onClick={() => setEditingEntry(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete entry">
                          <IconButton size="small" color="error" onClick={() => handleDeleteSingle(row._id)}>
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
          count={entries.length}
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
      <AddEntryModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onEntryCreated={() => {
          fetchEntries();
          setSnackbar({ open: true, message: "Entry created successfully in MongoDB", severity: "success" });
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
            search: "",
            startDate: "",
            endDate: "",
            minAmount: "",
            maxAmount: "",
          })
        }
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EntriesPage;
