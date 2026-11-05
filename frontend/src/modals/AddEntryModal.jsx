import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { memberService, entryService } from "../services/api";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { formatAmount, capitalizeName, isCurrentLoggedInUser } from "../utils/formatters";

const AddEntryModal = ({ open, onClose, onEntryCreated }) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [includeMine, setIncludeMine] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const memberInputRef = useRef(null);
  const amountRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  // Fetch available members for multi-select
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

      // Reset form
      setSelectedNames([]);
      setInputValue("");
      setType("Expense");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setTime(new Date().toTimeString().split(" ")[0].substring(0, 5));
      setIncludeMine(false);
      setErrors({});
      setError("");
    }
  }, [open]);

  // Dropdown options: only real members (never include logged-in user or "myself")
  const autocompleteOptions = useMemo(() => {
    return members.filter((m) => !isCurrentLoggedInUser(m, profile, user));
  }, [members, profile, user]);

  // Split is active if multiple members are selected, OR at least 1 member + myself
  const isSplitActive = selectedNames.length > 1 || (selectedNames.length >= 1 && includeMine);
  const totalSplitCount = selectedNames.length + (includeMine ? 1 : 0);
  const numericAmount = Math.trunc(parseFloat(amount) || 0);
  const splitPerPerson = isSplitActive && totalSplitCount > 0 ? Math.trunc(numericAmount / totalSplitCount) : 0;

  // If split is active, auto-set to Split; else default to Expense if currently Split
  useEffect(() => {
    if (isSplitActive) {
      setType("Split");
    } else if (type === "Split") {
      setType("Expense");
    }
  }, [isSplitActive, type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let finalNames = [...selectedNames];
    if (inputValue && inputValue.trim()) {
      const trimmed = capitalizeName(inputValue);
      const alreadyIn = finalNames.some(
        (item) => (typeof item === "string" ? item : item.fullName).toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyIn) {
        finalNames.push(trimmed);
      }
    }

    const newErrors = {};
    if (finalNames.length === 0) newErrors.members = true;
    if (!amount || numericAmount <= 0) newErrors.amount = true;
    if (!date || !date.trim()) newErrors.date = true;
    if (!time || !time.trim()) newErrors.time = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.members && memberInputRef.current) memberInputRef.current.focus();
      else if (newErrors.amount && amountRef.current) amountRef.current.focus();
      else if (newErrors.date && dateRef.current) dateRef.current.focus();
      else if (newErrors.time && timeRef.current) timeRef.current.focus();
      return;
    }

    try {
      setSubmitting(true);
      const isSplit = finalNames.length > 1 || (finalNames.length >= 1 && includeMine);
      const res = await entryService.createEntry({
        names: finalNames.map((item) => {
          if (typeof item === "string") return capitalizeName(item);
          return { name: capitalizeName(item.fullName), memberId: item._id };
        }),
        type: isSplit ? "Split" : type,
        status: isSplit ? "Split" : type,
        amount: numericAmount,
        description,
        date,
        time,
        includeMine: Boolean(includeMine),
      });

      if (res.success) {
        onEntryCreated();
        onClose();
      } else {
        setError(res.message || "Failed to create entry");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add To Receive</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Member Name (Multi-select from Members & add custom) */}
          <Autocomplete
            multiple
            freeSolo
            options={autocompleteOptions}
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
              if (errors.members) setErrors((prev) => ({ ...prev, members: false }));
            }}
            renderTags={(value, getTagProps) => (
              <>
                {value.map((option, index) => {
                  const label = typeof option === "string" ? capitalizeName(option) : capitalizeName(option.fullName);
                  return (
                    <Chip
                      variant="outlined"
                      color="primary"
                      size="small"
                      label={label}
                      sx={{ textTransform: "capitalize" }}
                      {...getTagProps({ index })}
                      key={index}
                    />
                  );
                })}
                {includeMine && (
                  <Chip
                    size="small"
                    label="Myself (You)"
                    onDelete={() => setIncludeMine(false)}
                    sx={{
                      bgcolor: "#ede9fe",
                      color: "#5b21b6",
                      fontWeight: 600,
                      "& .MuiChip-deleteIcon": {
                        color: "#6d28d9 !important",
                        fontSize: "18px",
                        opacity: 1,
                        "&:hover": {
                          color: "#4c1d95 !important",
                        },
                      },
                    }}
                  />
                )}
              </>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Member Name"
                required
                inputRef={memberInputRef}
                error={Boolean(errors.members)}
                placeholder="Choose members or type & press enter..."
                inputProps={{
                  ...params.inputProps,
                  style: { textTransform: "capitalize" },
                }}
                helperText={
                  errors.members
                    ? "Member name is required."
                    : "Select 1 or more members. If multiple are selected, amount will be split."
                }
              />
            )}
          />

          {/* Inline Add myself checkbox when 1 member is selected */}
          {selectedNames.length === 1 && !includeMine && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={false}
                  onChange={(e) => setIncludeMine(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label="Add myself (splits my share into For Self)"
              componentsProps={{
                typography: {
                  sx: { fontSize: "0.82rem", fontWeight: 500, color: "text.secondary" },
                },
              }}
              sx={{
                mt: -1.5,
                mb: -1,
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.82rem",
                  fontWeight: 500,
                },
              }}
            />
          )}

          {/* Split notification & Add myself checkbox */}
          {isSplitActive && (
            <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2, border: "1px solid #90caf9" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <CallSplitIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "primary.dark" }}>
                  {includeMine && selectedNames.length === 1
                    ? "Split with Myself Activated"
                    : "Auto Split Activated"}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 1 }}>
                Splitting amount equally across {totalSplitCount} participants.
              </Typography>

              {/* Checkbox: Add myself */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeMine}
                    onChange={(e) => setIncludeMine(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label="Add myself (splits my share into For Self)"
                componentsProps={{
                  typography: {
                    sx: { fontSize: "0.82rem", fontWeight: 500, color: "text.primary" },
                  },
                }}
                sx={{
                  mb: 0.5,
                  "& .MuiFormControlLabel-label": {
                    fontSize: "0.82rem",
                    fontWeight: 500,
                  },
                }}
              />

              {numericAmount > 0 && (
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: "primary.main" }}>
                  ₹ {formatAmount(splitPerPerson)} per person ({totalSplitCount} participants
                  {includeMine ? ", your share added to For Self" : ""})
                </Typography>
              )}
            </Box>
          )}

          {/* 2. Type: Expense, Loan (Split when multiple or split with myself) */}
          <FormControl fullWidth required disabled={isSplitActive}>
            <InputLabel id="type-label" required>Type</InputLabel>
            <Select
              labelId="type-label"
              value={isSplitActive ? "Split" : type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              {isSplitActive ? (
                <MenuItem value="Split">Split</MenuItem>
              ) : (
                [
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                  <MenuItem key="Loan" value="Loan">Loan</MenuItem>,
                ]
              )}
            </Select>
            {isSplitActive && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                Type automatically set to "Split" for multi-participant splits
              </Typography>
            )}
          </FormControl>

          {/* 3. Amount */}
          <TextField
            label="Amount (₹)"
            type="number"
            value={amount}
            inputRef={amountRef}
            error={Boolean(errors.amount)}
            helperText={errors.amount ? "Please enter a valid amount" : ""}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
            }}
            placeholder="e.g. 1500"
            fullWidth
            required
            inputProps={{ min: "0", step: "any" }}
          />

          {/* Description */}
          <TextField
            label="Description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner with team, office supplies, cab fare..."
            fullWidth
          />

          {/* 4. Date & 5. Time */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Date"
              type="date"
              value={date}
              inputRef={dateRef}
              error={Boolean(errors.date)}
              helperText={errors.date ? "Date is required" : ""}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: false }));
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Time"
              type="time"
              value={time}
              inputRef={timeRef}
              error={Boolean(errors.time)}
              helperText={errors.time ? "Time is required" : ""}
              onChange={(e) => {
                setTime(e.target.value);
                if (errors.time) setErrors((prev) => ({ ...prev, time: false }));
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting && <CircularProgress size={18} />}
          >
            {submitting ? "Saving..." : "Add To Receive"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddEntryModal;
