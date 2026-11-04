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
  Autocomplete,
  Box,
} from "@mui/material";
import { memberService } from "../services/api";

const FilterToPayModal = ({ open, onClose, currentFilters, onApplyFilters, onResetFilters }) => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [filters, setFilters] = useState(currentFilters || {});

  useEffect(() => {
    if (open) {
      memberService
        .getMembers()
        .then((res) => {
          if (res.success) {
            setMembers(res.data);
          }
        })
        .catch(console.error);

      setFilters(currentFilters || {});
      setSelectedMember(currentFilters?.selectedMember || null);
      setInputValue(currentFilters?.name || currentFilters?.forFromName || "");
    }
  }, [open, currentFilters]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    let nameVal = "";
    if (selectedMember) {
      nameVal = typeof selectedMember === "string" ? selectedMember.trim() : selectedMember.fullName || "";
    } else if (inputValue && inputValue.trim()) {
      nameVal = inputValue.trim();
    }

    onApplyFilters({
      ...filters,
      selectedMember,
      name: nameVal,
      forFromName: nameVal,
      names: nameVal,
      description: (filters.description || "").trim(),
    });
    onClose();
  };

  const handleReset = () => {
    const emptyFilters = {
      status: "All",
      paymentStatus: "All",
      search: "",
      description: "",
      selectedMember: null,
      name: "",
      forFromName: "",
      names: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    };
    setFilters(emptyFilters);
    setSelectedMember(null);
    setInputValue("");
    onResetFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Filter To Pay</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        {/* Type Filter: Only Expense and Loan */}
        <FormControl fullWidth>
          <InputLabel id="filter-type-label">Type</InputLabel>
          <Select
            labelId="filter-type-label"
            value={filters.status || "All"}
            label="Type"
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Expense">Expense</MenuItem>
            <MenuItem value="Loan">Loan</MenuItem>
          </Select>
        </FormControl>

        {/* Status Filter */}
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
            <MenuItem value="Paid">Paid</MenuItem>
          </Select>
        </FormControl>

        {/* Single Member Selection */}
        <Autocomplete
          freeSolo
          options={members}
          getOptionLabel={(option) => (typeof option === "string" ? option : option.fullName || "")}
          isOptionEqualToValue={(option, value) => {
            if (typeof value === "string") return option.fullName === value;
            return option._id === value?._id;
          }}
          value={selectedMember}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
          }}
          onChange={(event, newValue) => {
            setSelectedMember(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Member Name"
              placeholder="Filter by member name..."
            />
          )}
        />

        {/* Description Filter */}
        <TextField
          label="Description"
          value={filters.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Filter by description notes (e.g. dinner, tickets)..."
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

export default FilterToPayModal;
