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
} from "@mui/material";
import { borrowedService } from "../services/api";
import { toInputDateFormat, toInputTimeFormat } from "../utils/formatters";

const EditBorrowedModal = ({ open, onClose, entry, onBorrowedUpdated }) => {
  const [personName, setPersonName] = useState("");
  const [type, setType] = useState("Expense");
  const [status, setStatus] = useState("Pending");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (entry && open) {
      setPersonName(entry.personName || "");
      setType(entry.type || "Expense");
      setStatus(entry.status || "Pending");
      setAmount(entry.amount !== undefined ? String(Math.trunc(entry.amount)) : "");
      setDate(toInputDateFormat(entry.date) || "");
      setTime(toInputTimeFormat(entry.time) || "");
      setDescription(entry.description || "");
      setError("");
    }
  }, [entry, open]);

  if (!entry) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!personName.trim()) {
      setError("Person / Lender name is required.");
      return;
    }

    const numericAmount = Math.trunc(parseFloat(amount) || 0);
    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await borrowedService.updateBorrowed(entry._id, {
        personName: personName.trim(),
        type,
        status,
        amount: numericAmount,
        date,
        time,
        description: description.trim(),
      });

      if (res.success) {
        onBorrowedUpdated();
        onClose();
      } else {
        setError(res.message || "Failed to update borrowed entry");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update borrowed entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit Borrowed Entry</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Person Name */}
          <TextField
            label="Person / Lender Name"
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            fullWidth
            required
          />

          {/* 2. Type & Status */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="edit-borrowed-type-label">Type</InputLabel>
              <Select
                labelId="edit-borrowed-type-label"
                value={type}
                label="Type"
                onChange={(e) => setType(e.target.value)}
              >
                <MenuItem value="Expense">Expense (They paid for you)</MenuItem>
                <MenuItem value="Borrowed">Borrowed (Cash / Loan)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="edit-borrowed-status-label">Status</InputLabel>
              <Select
                labelId="edit-borrowed-status-label"
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="Pending">Pending (To Give / Unpaid)</MenuItem>
                <MenuItem value="Paid">Paid (Settled / Returned)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 3. Amount */}
          <TextField
            label="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            required
            inputProps={{ min: "1", step: "1" }}
          />

          {/* 4. Description */}
          <TextField
            label="Description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />

          {/* 5. Date & Time */}
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
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting && <CircularProgress size={18} />}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditBorrowedModal;
