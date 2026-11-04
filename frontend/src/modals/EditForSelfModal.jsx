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
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { forSelfService } from "../services/api";
import { toInputDateFormat, toInputTimeFormat, formatAmount } from "../utils/formatters";

const EditForSelfModal = ({ open, onClose, entry, onEntryUpdated }) => {
  const [forFromName, setForFromName] = useState("Myself (You)");
  const [type, setType] = useState("Expense");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [amount, setAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Split group details
  const [splitGroupMembers, setSplitGroupMembers] = useState([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const isSplit = Boolean(entry?.isSplit && entry?.splitGroupId);

  useEffect(() => {
    if (entry && open) {
      setForFromName(entry.forFromName || "Myself (You)");
      setType(entry.type || entry.status || "Expense");
      setPaymentStatus(entry.paymentStatus || "Paid");
      setAmount(entry.amount !== undefined ? String(Math.trunc(entry.amount)) : "");
      setDate(toInputDateFormat(entry.date) || "");
      setTime(toInputTimeFormat(entry.time) || "");
      setDescription(entry.description || "");
      setError("");

      if (entry.isSplit && entry.splitGroupId) {
        setLoadingGroup(true);
        forSelfService
          .getSplitGroupEntries(entry.splitGroupId)
          .then((res) => {
            if (res.success) {
              setSplitGroupMembers(res.data);
              const count = res.data.length || 1;
              const originalTotal = entry.originalTotalAmount || entry.amount * count;
              setTotalAmount(String(Math.trunc(originalTotal)));
            }
          })
          .catch(console.error)
          .finally(() => setLoadingGroup(false));
      } else {
        setSplitGroupMembers([]);
        setTotalAmount("");
      }
    }
  }, [entry, open]);

  // Handle total amount change for split entries
  const handleTotalAmountChange = (newTotal) => {
    setTotalAmount(newTotal);
    const numTotal = parseFloat(newTotal);
    const count = splitGroupMembers.length || 1;
    if (!isNaN(numTotal) && numTotal > 0) {
      setAmount(String(Math.trunc(numTotal / count)));
    }
  };

  // Handle per-person amount change for split entries
  const handlePerPersonChange = (newAmount) => {
    setAmount(newAmount);
    const numAmount = parseFloat(newAmount);
    const count = splitGroupMembers.length || 1;
    if (!isNaN(numAmount) && numAmount > 0) {
      setTotalAmount(String(Math.trunc(numAmount * count)));
    }
  };

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
        forFromName: forFromName.trim() || "Myself (You)",
        type,
        status: type,
        paymentStatus,
        amount: numericAmount,
        totalAmount: isSplit ? Math.trunc(parseFloat(totalAmount) || 0) : undefined,
        date,
        time,
        description,
      });

      if (res.success) {
        onEntryUpdated(res.message);
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
          {isSplit && (
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

          {/* Split synchronization info */}
          {isSplit && (
            <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2, border: "1px solid #90caf9" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <CallSplitIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.dark" }}>
                  Split Group Synced Update
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
                This entry is linked to <strong>{splitGroupMembers.length} participants</strong>. Updating amount, date, time, or description will automatically synchronize all participants in this split.
              </Typography>

              {loadingGroup ? (
                <CircularProgress size={20} />
              ) : (
                <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                  {splitGroupMembers.map((m) => (
                    <Chip
                      key={m._id}
                      label={`${m.forFromName || "Myself (You)"} (₹${formatAmount(m.amount)})`}
                      size="small"
                      color={m._id === entry._id ? "primary" : "default"}
                      variant={m._id === entry._id ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* 1. Member Name */}
          <TextField
            label="Member Name"
            value={forFromName}
            onChange={(e) => setForFromName(e.target.value)}
            fullWidth
            required
            disabled={isSplit}
            helperText={isSplit ? "Participant name in this split group" : "This entry belongs to you (For Self)"}
          />

          {/* 2. Type */}
          <FormControl fullWidth disabled={isSplit}>
            <InputLabel id="edit-for-self-type-label">Type</InputLabel>
            <Select
              labelId="edit-for-self-type-label"
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              {isSplit ? (
                <MenuItem value="Expense">Expense</MenuItem>
              ) : (
                [
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                  <MenuItem key="Add Balance" value="Add Balance">Add Balance</MenuItem>,
                ]
              )}
            </Select>
            {isSplit && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                Type is fixed for split group participants ({type})
              </Typography>
            )}
          </FormControl>

          {/* 3. Status */}
          <FormControl fullWidth>
            <InputLabel id="edit-for-self-status-label">Status</InputLabel>
            <Select
              labelId="edit-for-self-status-label"
              value={paymentStatus}
              label="Status"
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
            </Select>
          </FormControl>

          {/* 4. Amounts */}
          {isSplit ? (
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Total Group Amount (₹)"
                type="number"
                value={totalAmount}
                onChange={(e) => handleTotalAmountChange(e.target.value)}
                fullWidth
                required
                inputProps={{ min: "0", step: "any" }}
                helperText={`Divided equally across ${splitGroupMembers.length || 1} participants`}
              />
              <TextField
                label="Your Share (₹)"
                type="number"
                value={amount}
                onChange={(e) => handlePerPersonChange(e.target.value)}
                fullWidth
                required
                inputProps={{ min: "0", step: "any" }}
              />
            </Box>
          ) : (
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
          )}

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
            {submitting ? "Saving..." : "Update For Self"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditForSelfModal;
