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

const FilterForSelfModal = ({ open, onClose, currentFilters, onApplyFilters, onResetFilters }) => {
  const [filters, setFilters] = useState(currentFilters || {});

  useEffect(() => {
    if (open) {
      setFilters(currentFilters || {});
    }
  }, [open, currentFilters]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApplyFilters({
      ...filters,
      type: filters.status || filters.type || "All",
      status: filters.status || filters.type || "All",
      paymentStatus: filters.paymentStatus || "All",
      forFromName: (filters.forFromName || "").trim(),
      name: (filters.forFromName || "").trim(),
      description: (filters.description || "").trim(),
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
      minAmount: filters.minAmount || "",
      maxAmount: filters.maxAmount || "",
    });
    onClose();
  };

  const handleReset = () => {
    const emptyFilters = {
      type: "All",
      status: "All",
      paymentStatus: "All",
      forFromName: "",
      name: "",
      search: "",
      description: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    };
    setFilters(emptyFilters);
    onResetFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Filter For Self</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        {/* Type Filter */}
        <FormControl fullWidth>
          <InputLabel id="filter-for-self-type-label">Type</InputLabel>
          <Select
            labelId="filter-for-self-type-label"
            value={filters.status || filters.type || "All"}
            label="Type"
            onChange={(e) => {
              handleChange("status", e.target.value);
              handleChange("type", e.target.value);
            }}
          >
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Expense">Expense</MenuItem>
            <MenuItem value="Add Balance">Add Balance</MenuItem>
            <MenuItem value="Split">Split</MenuItem>
          </Select>
        </FormControl>

        {/* Status Filter */}
        <FormControl fullWidth>
          <InputLabel id="filter-for-self-status-label">Status</InputLabel>
          <Select
            labelId="filter-for-self-status-label"
            value={filters.paymentStatus || "All"}
            label="Status"
            onChange={(e) => handleChange("paymentStatus", e.target.value)}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
          </Select>
        </FormControl>

        {/* Member Name */}
        <TextField
          label="Member Name"
          value={filters.forFromName || filters.name || ""}
          onChange={(e) => {
            handleChange("forFromName", e.target.value);
            handleChange("name", e.target.value);
          }}
          placeholder="Filter by member name (e.g. Myself)..."
          fullWidth
        />

        {/* Description Filter */}
        <TextField
          label="Description"
          value={filters.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Filter by description notes (e.g. coffee, groceries)..."
          fullWidth
        />

        {/* Date Range */}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="From Date"
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
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
            label="Min Amount (₹)"
            type="number"
            value={filters.minAmount || ""}
            onChange={(e) => handleChange("minAmount", e.target.value)}
            fullWidth
          />
          <TextField
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

export default FilterForSelfModal;
