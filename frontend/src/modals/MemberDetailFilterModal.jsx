import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";

export const defaultMemberDetailFilters = {
  direction: "all", // "all", "receive", "pay"
  type: "All", // "All", "Expense", "Loan", "Split"
  status: "All", // "All", "Pending", "Settled"
  description: "",
  startDate: "",
  endDate: "",
  minAmount: "",
  maxAmount: "",
};

const MemberDetailFilterModal = ({
  open,
  onClose,
  currentFilters = defaultMemberDetailFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [filters, setFilters] = useState(defaultMemberDetailFilters);

  useEffect(() => {
    if (open) {
      setFilters({ ...defaultMemberDetailFilters, ...(currentFilters || {}) });
    }
  }, [open, currentFilters]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApplyFilters({
      ...filters,
      description: (filters.description || "").trim(),
    });
    onClose();
  };

  const handleReset = () => {
    setFilters(defaultMemberDetailFilters);
    onResetFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Filter Member Transactions</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        {/* Category / Direction */}
        <FormControl fullWidth size="small">
          <InputLabel id="filter-direction-label">Category</InputLabel>
          <Select
            labelId="filter-direction-label"
            value={filters.direction || "all"}
            label="Category"
            onChange={(e) => handleChange("direction", e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            <MenuItem value="receive">To Receive (Member owes you)</MenuItem>
            <MenuItem value="pay">To Pay (You owe member)</MenuItem>
          </Select>
        </FormControl>

        {/* Type Filter */}
        <FormControl fullWidth size="small">
          <InputLabel id="filter-type-label">Type</InputLabel>
          <Select
            labelId="filter-type-label"
            value={filters.type || "All"}
            label="Type"
            onChange={(e) => handleChange("type", e.target.value)}
          >
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Expense">Expense</MenuItem>
            <MenuItem value="Loan">Loan</MenuItem>
            <MenuItem value="Split">Split</MenuItem>
          </Select>
        </FormControl>

        {/* Status Filter */}
        <FormControl fullWidth size="small">
          <InputLabel id="filter-status-label">Payment Status</InputLabel>
          <Select
            labelId="filter-status-label"
            value={filters.status || "All"}
            label="Payment Status"
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Pending">Pending Only</MenuItem>
            <MenuItem value="Settled">Settled (Received / Paid)</MenuItem>
          </Select>
        </FormControl>

        {/* Description Filter */}
        <TextField
          size="small"
          label="Description"
          value={filters.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Filter by description (e.g. dinner, movie, rent)..."
          fullWidth
        />

        {/* Date Range */}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            size="small"
            label="From Date"
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            size="small"
            label="To Date"
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => handleChange("endDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>

        {/* Amount Range */}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            size="small"
            label="Min Amount (₹)"
            type="number"
            value={filters.minAmount || ""}
            onChange={(e) => handleChange("minAmount", e.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            label="Max Amount (₹)"
            type="number"
            value={filters.maxAmount || ""}
            onChange={(e) => handleChange("maxAmount", e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleReset} color="inherit">
          Reset
        </Button>
        <Button onClick={handleApply} variant="contained">
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberDetailFilterModal;
