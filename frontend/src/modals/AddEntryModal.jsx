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
import { formatAmount, capitalizeName } from "../utils/formatters";

const AddEntryModal = ({ open, onClose, onEntryCreated }) => {
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

  // Helper to identify myself
  const isMyself = (item) => {
    if (!item) return false;
    if (typeof item === "string") return /myself/i.test(item);
    return item._id === "myself" || /myself/i.test(item.fullName || "");
  };

  const selectedRealMembers = useMemo(() => {
    return selectedNames.filter((item) => !isMyself(item));
  }, [selectedNames]);

  const hasMyselfSelected = useMemo(() => {
    return selectedNames.some((item) => isMyself(item));
  }, [selectedNames]);

  const effectiveIncludeMine = includeMine || hasMyselfSelected;

  // Dropdown options: add "Myself (You)" only when at least 1 real member is already selected
  const autocompleteOptions = useMemo(() => {
    if (selectedRealMembers.length >= 1 && !hasMyselfSelected) {
      return [{ _id: "myself", fullName: "Myself (You)" }, ...members];
    }
    return members;
  }, [members, selectedRealMembers.length, hasMyselfSelected]);

  const handleToggleMyself = (checked) => {
    setIncludeMine(checked);
    if (checked) {
      if (!hasMyselfSelected) {
        setSelectedNames((prev) => [...prev, { _id: "myself", fullName: "Myself (You)" }]);
      }
    } else {
      setSelectedNames((prev) => prev.filter((item) => !isMyself(item)));
    }
  };

  // Split is active if multiple real members are selected, OR at least 1 real member + myself
  const isSplitActive = selectedRealMembers.length > 1 || (selectedRealMembers.length >= 1 && effectiveIncludeMine);
  const totalSplitCount = selectedRealMembers.length + (effectiveIncludeMine ? 1 : 0);
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
        if (/myself/i.test(trimmed)) {
          finalNames.push({ _id: "myself", fullName: "Myself (You)" });
        } else {
          finalNames.push(trimmed);
        }
      }
    }

    const realParticipants = finalNames.filter((item) => !isMyself(item));
    const isMine = finalNames.some((item) => isMyself(item)) || effectiveIncludeMine;

    const newErrors = {};
    if (realParticipants.length === 0) {
      if (isMine) {
        setError("Please add at least one member to split with.");
      }
      newErrors.members = true;
    }
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
      const isSplit = realParticipants.length > 1 || (realParticipants.length >= 1 && isMine);
      const res = await entryService.createEntry({
        names: realParticipants.map((item) => {
          if (typeof item === "string") return capitalizeName(item);
          return { name: capitalizeName(item.fullName), memberId: item._id };
        }),
        type: isSplit ? "Split" : type,
        status: isSplit ? "Split" : type,
        amount: numericAmount,
        description,
        date,
        time,
        includeMine: isMine,
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
            getOptionLabel={(option) => {
              if (isMyself(option)) return "Myself (You)";
              return typeof option === "string" ? option : option.fullName || "";
            }}
            isOptionEqualToValue={(option, value) => {
              if (isMyself(option) && isMyself(value)) return true;
              if (typeof value === "string") return option.fullName === value;
              return option._id === value?._id;
            }}
            value={selectedNames}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
              const containsMyself = newValue.some((item) => isMyself(item));
              setIncludeMine(containsMyself);
              setSelectedNames(newValue);
              setInputValue("");
              if (errors.members) setErrors((prev) => ({ ...prev, members: false }));
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const isMineOption = isMyself(option);
                const label = isMineOption
                  ? "Myself (You)"
                  : (typeof option === "string" ? capitalizeName(option) : capitalizeName(option.fullName));
                return (
                  <Chip
                    variant={isMineOption ? "filled" : "outlined"}
                    color={isMineOption ? "secondary" : "primary"}
                    size="small"
                    label={label}
                    sx={
                      isMineOption
                        ? { bgcolor: "#f3e8ff", color: "#6b21a8", fontWeight: 600 }
                        : { textTransform: "capitalize" }
                    }
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
                    ? "Please select or enter at least one member name"
                    : "Select 1 or more members. If multiple are selected, amount will be split."
                }
              />
            )}
          />

          {/* Inline Add myself checkbox when 1 member is selected */}
          {selectedRealMembers.length === 1 && !effectiveIncludeMine && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={false}
                  onChange={(e) => handleToggleMyself(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label="Add myself (splits my share into For Self)"
              sx={{ mt: -1.5, mb: -1 }}
            />
          )}

          {/* Split notification & Add myself checkbox */}
          {isSplitActive && (
            <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2, border: "1px solid #90caf9" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <CallSplitIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "primary.dark" }}>
                  {effectiveIncludeMine && selectedRealMembers.length === 1
                    ? "Split with Myself Activated"
                    : "Auto Split Activated"}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 1 }}>
                {effectiveIncludeMine
                  ? `Splitting amount equally across ${totalSplitCount} participants (${selectedRealMembers.length} member${selectedRealMembers.length > 1 ? "s" : ""} in To Receive + your share in For Self).`
                  : `Splitting amount equally across ${totalSplitCount} selected members.`}
              </Typography>

              {/* Checkbox: Add myself */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={effectiveIncludeMine}
                    onChange={(e) => handleToggleMyself(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label="Add myself (splits my share into For Self)"
                sx={{ mb: 0.5 }}
              />

              {numericAmount > 0 && (
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: "primary.main" }}>
                  ₹ {formatAmount(splitPerPerson)} per person ({totalSplitCount} participants
                  {effectiveIncludeMine ? ", your share added to For Self" : ""})
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
