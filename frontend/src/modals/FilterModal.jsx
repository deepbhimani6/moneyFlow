import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, Box } from "@mui/material";
import { formatDate } from "../utils/formatters";

const FilterModal = ({ open, onClose, currentFilters, onApplyFilters, onResetFilters }) => {
  const [filters, setFilters] = useState(currentFilters);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const emptyFilters = {
      status: "All",
      paymentStatus: "All",
      search: "",
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Filter Entries</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="filter-type-label">Type</InputLabel>
          <Select labelId="filter-type-label" value={filters.status || "All"} label="Type" onChange={(e) => handleChange("status", e.target.value)}>
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Add Balance">Add Balance</MenuItem>
            <MenuItem value="Expense">Expense</MenuItem>
            <MenuItem value="Loan">Loan</MenuItem>
            <MenuItem value="Split">Split</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="filter-status-label">Status</InputLabel>
          <Select
            labelId="filter-status-label"
            value={filters.paymentStatus || "All"}
            label="Status"
            onChange={(e) => handleChange("paymentStatus", e.target.value)}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Received">Received</MenuItem>
          </Select>
        </FormControl>

        <TextField label="For/From Name Keyword" value={filters.search || ""} onChange={(e) => handleChange("search", e.target.value)} placeholder="Filter by person or description..." fullWidth />

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="From Date"
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText={filters.startDate ? formatDate(filters.startDate) : "dd-mm-yyyy"}
            fullWidth
          />
          <TextField
            label="To Date"
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => handleChange("endDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText={filters.endDate ? formatDate(filters.endDate) : "dd-mm-yyyy"}
            fullWidth
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField label="Min Amount (₹)" type="number" value={filters.minAmount || ""} onChange={(e) => handleChange("minAmount", e.target.value)} fullWidth />
          <TextField label="Max Amount (₹)" type="number" value={filters.maxAmount || ""} onChange={(e) => handleChange("maxAmount", e.target.value)} fullWidth />
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

export default FilterModal;
