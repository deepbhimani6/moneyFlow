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
import { capitalizeName } from "../utils/formatters";

const defaultFilters = {
  selectedIds: [],
  status: "All",
  keyword: "",
  inviteStartDate: "",
  inviteEndDate: "",
  joinStartDate: "",
  joinEndDate: "",
};

const MemberFilterModal = ({
  open,
  onClose,
  title = "Filter Members",
  entityLabel = "Members",
  items = [],
  currentFilters = defaultFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedItems, setSelectedItems] = useState([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (open) {
      const active = { ...defaultFilters, ...(currentFilters || {}) };
      setFilters(active);
      const matched = items.filter((item) => active.selectedIds?.includes(item._id));
      setSelectedItems(matched);
      setInputValue("");
    }
  }, [open, currentFilters, items]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    const selectedIds = selectedItems.map((item) => item._id);
    onApplyFilters({
      ...filters,
      selectedIds,
    });
    onClose();
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setSelectedItems([]);
    setInputValue("");
    if (onResetFilters) onResetFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        {/* 1. Member/User Multi-Select Dropdown */}
        <Autocomplete
          multiple
          options={items}
          getOptionLabel={(option) => capitalizeName(option.fullName || option.username || option.email || "")}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          value={selectedItems}
          inputValue={inputValue}
          onInputChange={(e, newInputValue) => setInputValue(newInputValue)}
          onChange={(e, newValue) => setSelectedItems(newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option._id}
                label={capitalizeName(option.fullName || option.email || "")}
                size="small"
                sx={{ borderRadius: 1.5 }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={`Select ${entityLabel}`}
              placeholder={`Choose ${entityLabel.toLowerCase()}...`}
            />
          )}
          fullWidth
        />

        {/* 2. Status Filter */}
        <FormControl fullWidth>
          <InputLabel id="filter-status-label">Invite Status</InputLabel>
          <Select
            labelId="filter-status-label"
            value={filters.status || "All"}
            label="Invite Status"
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Joined">Joined</MenuItem>
            <MenuItem value="Invite Sent">Invite Sent</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
          </Select>
        </FormControl>

        {/* 3. Search Keyword (Name, Email, Phone, Username) */}
        <TextField
          label="Search Keyword"
          placeholder="Search by name, email, phone or username..."
          value={filters.keyword || ""}
          onChange={(e) => handleChange("keyword", e.target.value)}
          fullWidth
        />

        {/* 4. Invite Sent Date Range */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}>
            Invite Sent Date Range
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <TextField
              label="From Date"
              type="date"
              value={filters.inviteStartDate || ""}
              onChange={(e) => handleChange("inviteStartDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="To Date"
              type="date"
              value={filters.inviteEndDate || ""}
              onChange={(e) => handleChange("inviteEndDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </Box>

        {/* 5. Join Date Range */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}>
            Join Date Range (First Login)
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <TextField
              label="From Date"
              type="date"
              value={filters.joinStartDate || ""}
              onChange={(e) => handleChange("joinStartDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="To Date"
              type="date"
              value={filters.joinEndDate || ""}
              onChange={(e) => handleChange("joinEndDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleReset} color="inherit" sx={{ textTransform: "none" }}>
          Reset
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberFilterModal;
