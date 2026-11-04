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
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { memberService } from "../services/api";

const FilterToPayModal = ({ open, onClose, currentFilters, onApplyFilters, onResetFilters }) => {
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

  const isMyselfAdded = selectedNames.some((item) => {
    const name = typeof item === "string" ? item : item.fullName;
    return name && name.toLowerCase().includes("myself");
  });

  const handleToggleMyself = () => {
    if (isMyselfAdded) {
      const filtered = selectedNames.filter((item) => {
        const name = typeof item === "string" ? item : item.fullName;
        return !name || !name.toLowerCase().includes("myself");
      });
      setSelectedNames(filtered);
    } else {
      const updated = [{ _id: "myself", fullName: "Myself (You)" }, ...selectedNames];
      setSelectedNames(updated);
    }
  };

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
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Filter To Pay</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        {/* Type Filter */}
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

        {/* For/From Name */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: -1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
            Select Participants:
          </Typography>
          <Chip
            icon={<PersonIcon sx={{ "&&": { fontSize: 16 } }} />}
            label={isMyselfAdded ? "Myself Added ✓" : "+ Add Myself"}
            size="small"
            clickable
            color={isMyselfAdded ? "primary" : "default"}
            variant={isMyselfAdded ? "filled" : "outlined"}
            onClick={handleToggleMyself}
          />
        </Box>

        <Autocomplete
          multiple
          freeSolo
          options={[{ _id: "myself", fullName: "Myself (You)" }, ...members]}
          getOptionLabel={(option) => (typeof option === "string" ? option : option.fullName)}
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
              const isMine = label && label.toLowerCase().includes("myself");
              return (
                <Chip
                  variant="outlined"
                  color={isMine ? "secondary" : "primary"}
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
              label="For/From Name (Select Members or Type Custom)"
              placeholder="Choose members or type & press enter..."
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

export default FilterToPayModal;
