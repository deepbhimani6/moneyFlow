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
  Chip,
  Box,
} from "@mui/material";
import { memberService } from "../services/api";

const FilterModal = ({ open, onClose, currentFilters, onApplyFilters, onResetFilters }) => {
  const [members, setMembers] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
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
      setSelectedNames(currentFilters?.selectedNames || []);
      setInputValue("");
    }
  }, [open, currentFilters]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    let finalNames = [...selectedNames];
    if (inputValue && inputValue.trim()) {
      const trimmed = inputValue.trim();
      const alreadyIn = finalNames.some(
        (item) => (typeof item === "string" ? item : item.fullName).toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyIn) {
        finalNames.push(trimmed);
      }
    }

    const stringNames = finalNames.map((item) => (typeof item === "string" ? item : item.fullName));

    onApplyFilters({
      ...filters,
      selectedNames: finalNames,
      names: stringNames.join(","),
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
      selectedNames: [],
      names: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    };
    setFilters(emptyFilters);
    setSelectedNames([]);
    setInputValue("");
    onResetFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Filter To Receive</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        {/* Type Filter */}
        <FormControl fullWidth>
          <InputLabel id="filter-type-label">Type</InputLabel>
          <Select labelId="filter-type-label" value={filters.status || "All"} label="Type" onChange={(e) => handleChange("status", e.target.value)}>
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Expense">Expense</MenuItem>
            <MenuItem value="Loan">Loan</MenuItem>
            <MenuItem value="Split">Split</MenuItem>
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
            <MenuItem value="Received">Received</MenuItem>
          </Select>
        </FormControl>

        {/* Member Name */}
        <Autocomplete
          multiple
          freeSolo
          options={members}
          getOptionLabel={(option) => (typeof option === "string" ? option : option.fullName || "")}
          isOptionEqualToValue={(option, value) => {
            if (typeof value === "string") return option.fullName === value;
            return option._id === value?._id;
          }}
          value={selectedNames}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
          }}
          onChange={(event, newValue) => {
            setSelectedNames(newValue);
            setInputValue("");
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const label = typeof option === "string" ? option : option.fullName;
              return (
                <Chip
                  variant="outlined"
                  color="primary"
                  size="small"
                  label={label}
                  {...getTagProps({ index })}
                  key={index}
                />
              );
            })
          }
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
          placeholder="Filter by description notes (e.g. pizza, dinner, groceries)..."
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
