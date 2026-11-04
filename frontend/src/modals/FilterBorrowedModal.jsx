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
  Autocomplete,
  Chip,
} from "@mui/material";
import { memberService } from "../services/api";

const FilterBorrowedModal = ({ open, onClose, currentFilters, onApplyFilters, onResetFilters }) => {
  const [filters, setFilters] = useState(currentFilters || {});
  const [members, setMembers] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (open) {
      memberService
        .getMembers()
        .then((res) => {
          if (res.success) setMembers(res.data);
        })
        .catch(console.error);

      setFilters(currentFilters || {});

      // Parse existing personName filters
      if (currentFilters?.personName) {
        const raw = currentFilters.personName;
        const arr = Array.isArray(raw) ? raw : [raw];
        setSelectedNames(arr);
      } else {
        setSelectedNames([]);
      }
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
      if (!finalNames.includes(trimmed)) {
        finalNames.push(trimmed);
      }
    }

    onApplyFilters({
      ...filters,
      personName: finalNames.length > 0 ? finalNames : undefined,
    });
    onClose();
  };

  const handleReset = () => {
    const emptyFilters = {
      status: "All",
      type: "All",
      personName: undefined,
      description: "",
      startDate: "",
      endDate: "",
    };
    setSelectedNames([]);
    setInputValue("");
    setFilters(emptyFilters);
    onResetFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Filter Borrowed Entries</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* 1. Person Name multi-select */}
        <Autocomplete
          multiple
          freeSolo
          options={members.map((m) => m.fullName)}
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
            value.map((option, index) => (
              <Chip
                variant="outlined"
                color="primary"
                size="small"
                label={option}
                {...getTagProps({ index })}
                key={index}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Person / Lender Name"
              placeholder="Filter by person name..."
            />
          )}
        />

        {/* 2. Type & Status */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="filter-borrowed-type-label">Type</InputLabel>
            <Select
              labelId="filter-borrowed-type-label"
              value={filters.type || "All"}
              label="Type"
              onChange={(e) => handleChange("type", e.target.value)}
            >
              <MenuItem value="All">All Types</MenuItem>
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Borrowed">Borrowed</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="filter-borrowed-status-label">Status</InputLabel>
            <Select
              labelId="filter-borrowed-status-label"
              value={filters.status || "All"}
              label="Status"
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Pending">Pending (Unpaid)</MenuItem>
              <MenuItem value="Paid">Paid (Settled)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* 3. Description search */}
        <TextField
          label="Description Keyword"
          type="text"
          value={filters.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Filter by notes or description..."
          fullWidth
        />

        {/* 4. Date Range */}
        <Box sx={{ display: "flex", gap: 2 }}>
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
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleReset} color="inherit">
          Reset All
        </Button>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilterBorrowedModal;
