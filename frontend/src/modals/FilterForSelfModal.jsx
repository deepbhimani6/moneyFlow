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
      type: filters.type || "All",
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
            <MenuItem value="Add Balance">Add Balance</MenuItem>
          </Select>
        </FormControl>

        {/* Date Range */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            fullWidth
            value={filters.startDate || ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            fullWidth
            value={filters.endDate || ""}
            onChange={(e) => handleChange("endDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Amount Range */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Min Amount (₹)"
            type="number"
            size="small"
            fullWidth
            value={filters.minAmount || ""}
            onChange={(e) => handleChange("minAmount", e.target.value)}
            placeholder="0"
            inputProps={{ min: "0", step: "1" }}
          />
          <TextField
            label="Max Amount (₹)"
            type="number"
            size="small"
            fullWidth
            value={filters.maxAmount || ""}
            onChange={(e) => handleChange("maxAmount", e.target.value)}
            placeholder="No limit"
            inputProps={{ min: "0", step: "1" }}
          />
        </Box>

        {/* Description Filter */}
        <TextField
          label="Description / Keyword"
          size="small"
          fullWidth
          value={filters.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Search by keywords in description"
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={handleReset} color="inherit">
          Reset Filters
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} variant="contained">
            Apply Filters
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FilterForSelfModal;
