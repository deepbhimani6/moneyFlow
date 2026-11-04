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
import { forSelfService } from "../services/api";

const AddForSelfModal = ({ open, onClose, onEntryCreated }) => {
  const [forFromName, setForFromName] = useState("Myself (You)");
  const [type, setType] = useState("Expense");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForFromName("Myself (You)");
      setType("Expense");
      setPaymentStatus("Paid");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setTime(new Date().toTimeString().split(" ")[0].substring(0, 5));
      setError("");
    }
  }, [open]);

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
      const res = await forSelfService.createForSelfEntry({
        forFromName: forFromName.trim() || "Myself (You)",
        type,
        status: type,
        paymentStatus,
        amount: numericAmount,
        description,
        date,
        time,
      });

      if (res.success) {
        onEntryCreated();
        onClose();
      } else {
        setError(res.message || "Failed to create For Self entry");
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add For Self</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Member Name */}
          <TextField
            label="Member Name"
            value={forFromName}
            onChange={(e) => setForFromName(e.target.value)}
            placeholder="Myself (You)"
            fullWidth
            required
            helperText="This entry belongs to you (For Self)"
          />

          {/* 2. Type */}
          <FormControl fullWidth>
            <InputLabel id="for-self-type-label">Type</InputLabel>
            <Select
              labelId="for-self-type-label"
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Add Balance">Add Balance</MenuItem>
            </Select>
          </FormControl>

          {/* 3. Status */}
          <FormControl fullWidth>
            <InputLabel id="for-self-status-label">Status</InputLabel>
            <Select
              labelId="for-self-status-label"
              value={paymentStatus}
              label="Status"
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
            </Select>
          </FormControl>

          {/* 4. Amount */}
          <TextField
            label="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^[0-9]+$/.test(val)) {
                setAmount(val);
              }
            }}
            placeholder="e.g. 1500"
            fullWidth
            required
            inputProps={{ min: "1", step: "1" }}
          />

          {/* 5. Description */}
          <TextField
            label="Description (Optional)"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner with team, office supplies, cab fare..."
            fullWidth
          />

          {/* 6. Date & Time */}
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
            {submitting ? "Saving..." : "Add For Self"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddForSelfModal;
