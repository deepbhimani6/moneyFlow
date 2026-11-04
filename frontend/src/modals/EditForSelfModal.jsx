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
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { forSelfService } from "../services/api";
import { toInputDateFormat, toInputTimeFormat } from "../utils/formatters";

const EditForSelfModal = ({ open, onClose, entry, onEntryUpdated }) => {
  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (entry && open) {
      setType(entry.type || "Expense");
      setAmount(entry.amount !== undefined ? String(Math.trunc(entry.amount)) : "");
      setDate(toInputDateFormat(entry.date) || "");
      setTime(toInputTimeFormat(entry.time) || "");
      setDescription(entry.description || "");
      setError("");
    }
  }, [entry, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const numericAmount = Math.trunc(parseFloat(amount) || 0);
    if (!amount || numericAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setSubmitting(true);
      const res = await forSelfService.updateForSelfEntry(entry._id, {
        type,
        amount: numericAmount,
        date,
        time,
        description,
      });

      if (res.success) {
        onEntryUpdated();
        onClose();
      } else {
        setError(res.message || "Failed to update entry");
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Edit For Self Entry</span>
          {entry?.isSplit && (
            <Chip
              icon={<CallSplitIcon sx={{ "&&": { fontSize: 16 } }} />}
              label="Split Expense"
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </DialogTitle>

        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {entry?.isSplit && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              This expense was created from a multi-member split.
            </Alert>
          )}

          {/* Type Selection */}
          <FormControl fullWidth size="small">
            <InputLabel id="edit-for-self-type-label">Type</InputLabel>
            <Select
              labelId="edit-for-self-type-label"
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Add Balance">Add Balance</MenuItem>
            </Select>
          </FormControl>

          {/* Amount */}
          <TextField
            label="Amount (₹)"
            type="number"
            size="small"
            fullWidth
            required
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^[0-9]+$/.test(val)) {
                setAmount(val);
              }
            }}
            placeholder="0"
            inputProps={{ min: "1", step: "1" }}
          />

          {/* Date and Time */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Date"
              type="date"
              size="small"
              fullWidth
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Time"
              type="time"
              size="small"
              fullWidth
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Description */}
          <TextField
            label="Description"
            multiline
            rows={2}
            size="small"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Groceries, Coffee, Salary deposit..."
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting && <CircularProgress size={16} />}
          >
            {submitting ? "Updating..." : "Update Entry"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditForSelfModal;
