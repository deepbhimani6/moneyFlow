import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Chip, Box, Typography, Alert, CircularProgress } from "@mui/material";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import PersonIcon from "@mui/icons-material/Person";
import { memberService, entryService } from "../services/api";
import { formatAmount } from "../utils/formatters";

const AddEntryModal = ({ open, onClose, onEntryCreated }) => {
  const [members, setMembers] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setError("");
    }
  }, [open]);

  const isMyselfAdded = selectedNames.some((item) => {
    const name = typeof item === 'string' ? item : item.fullName;
    return name.toLowerCase().includes('myself');
  });

  const isOnlyMyself = selectedNames.length === 1 && isMyselfAdded;
  const isOnlyOneOther = selectedNames.length === 1 && !isMyselfAdded;

  // Automatically enforce valid type according to selected participants:
  // - Only myself: no "Loan" (cannot loan to oneself) -> default to Expense if Loan
  // - Only 1 other person: no "Add Balance" (cannot add balance to another person) -> default to Expense if Add Balance
  // - Multiple members: automatically "Split"
  useEffect(() => {
    if (selectedNames.length > 1) {
      setType('Split');
    } else if (isOnlyMyself) {
      if (type === 'Loan' || type === 'Split') {
        setType('Expense');
      }
    } else if (isOnlyOneOther) {
      if (type === 'Add Balance' || type === 'Split') {
        setType('Expense');
      }
    } else if (selectedNames.length === 0) {
      if (type === 'Split') {
        setType('Expense');
      }
    }
  }, [selectedNames, isOnlyMyself, isOnlyOneOther, type]);

  // Split calculation preview:
  const numParticipants = selectedNames.length;
  const numericAmount = Math.trunc(parseFloat(amount) || 0);
  const isSplitActive = selectedNames.length > 1;
  const splitPerPerson = isSplitActive && numParticipants > 0 ? Math.trunc(numericAmount / numParticipants) : 0;

  const handleToggleMyself = () => {
    if (isMyselfAdded) {
      const filtered = selectedNames.filter((item) => {
        const name = typeof item === 'string' ? item : item.fullName;
        return !name.toLowerCase().includes('myself');
      });
      setSelectedNames(filtered);
      if (filtered.length <= 1) {
        setType('Expense');
      }
    } else {
      const updated = [{ _id: 'myself', fullName: 'Myself (You)' }, ...selectedNames];
      setSelectedNames(updated);
      if (updated.length > 1) {
        setType('Split');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let finalNames = [...selectedNames];
    if (inputValue && inputValue.trim()) {
      const trimmed = inputValue.trim();
      const alreadyIn = finalNames.some((item) => (typeof item === 'string' ? item : item.fullName).toLowerCase() === trimmed.toLowerCase());
      if (!alreadyIn) {
        finalNames.push(trimmed);
      }
    }

    if (finalNames.length === 0) {
      setError("Please select or enter at least one member/name");
      return;
    }

    if (!amount || numericAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const hasMyself = finalNames.some((item) => {
      const name = typeof item === 'string' ? item : item.fullName;
      return name.toLowerCase().includes('myself');
    });

    try {
      setSubmitting(true);
      const res = await entryService.createEntry({
        names: finalNames.map((item) => {
          if (typeof item === "string") return item;
          return { name: item.fullName, memberId: item._id };
        }),
        type: finalNames.length > 1 ? 'Split' : type,
        status: finalNames.length > 1 ? 'Split' : type,
        amount: numericAmount,
        description,
        date,
        time,
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
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add New Entry</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Member Name (Multi-select from Members tab & add custom) */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: -1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Select Participants:
            </Typography>
            <Chip
              icon={<PersonIcon sx={{ '&&': { fontSize: 16 } }} />}
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
            options={[{ _id: 'myself', fullName: 'Myself (You)' }, ...members]}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.fullName)}
            value={selectedNames}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
              setSelectedNames(newValue);
              setInputValue("");
              if (newValue.length > 1) {
                setType('Split');
              } else if (type === 'Split' && newValue.length <= 1) {
                setType('Expense');
              }
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const label = typeof option === "string" ? option : option.fullName;
                const isMine = label.toLowerCase().includes('myself');
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
                label="Member Name"
                placeholder="Search or enter member name..."
                helperText="Select 1 or more members. If multiple are selected, amount will be split."
              />
            )}
          />

          {/* Multi-member Split notification / logic */}
          {selectedNames.length > 1 && (
            <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2, border: "1px solid #90caf9" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <CallSplitIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "primary.dark" }}>
                  Auto Split Activated
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {isMyselfAdded
                  ? `Splitting equally across ${numParticipants} participants (including your share as an Expense).`
                  : `Splitting amount equally across ${numParticipants} selected members.`}
              </Typography>
              {numericAmount > 0 && (
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: "primary.main" }}>
                  ₹ {formatAmount(splitPerPerson)} per person ({numParticipants} participants)
                </Typography>
              )}
            </Box>
          )}

          {/* 2. Type */}
          <FormControl fullWidth disabled={selectedNames.length > 1}>
            <InputLabel id="type-label">Type</InputLabel>
            <Select
              labelId="type-label"
              value={selectedNames.length > 1 ? 'Split' : type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              {selectedNames.length > 1 ? (
                <MenuItem value="Split">Split</MenuItem>
              ) : isOnlyMyself ? (
                [
                  <MenuItem key="Add Balance" value="Add Balance">Add Balance</MenuItem>,
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                ]
              ) : isOnlyOneOther ? (
                [
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                  <MenuItem key="Loan" value="Loan">Loan</MenuItem>,
                ]
              ) : (
                [
                  <MenuItem key="Add Balance" value="Add Balance">Add Balance</MenuItem>,
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                  <MenuItem key="Loan" value="Loan">Loan</MenuItem>,
                ]
              )}
            </Select>
            {selectedNames.length > 1 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                Type automatically set to "Split" for multiple members
              </Typography>
            )}
          </FormControl>

          {/* 3. Amount */}
          <TextField label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1500" fullWidth required inputProps={{ min: "0", step: "any" }} />

          {/* Description */}
          <TextField
            label="Description (Optional)"
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
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
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
          <Button type="submit" variant="contained" disabled={submitting} startIcon={submitting && <CircularProgress size={18} />}>
            {submitting ? "Saving..." : "Add Entry"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddEntryModal;
