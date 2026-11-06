import React, { useState, useEffect, useRef } from "react";
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
  FormHelperText,
} from "@mui/material";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { forSelfService } from "../services/api";
import { toInputDateFormat, toInputTimeFormat, formatAmount } from "../utils/formatters";

const EditForSelfModal = ({ open, onClose, entry, onEntryUpdated }) => {
  const [type, setType] = useState("Add Balance");
  const [amount, setAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const typeRef = useRef(null);
  const amountRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  // Split group details
  const [splitGroupMembers, setSplitGroupMembers] = useState([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const isSplit = Boolean(entry?.isSplit && entry?.splitGroupId);

  useEffect(() => {
    if (entry && open) {
      setType(entry.type || entry.status || "Add Balance");
      setAmount(entry.amount !== undefined ? String(Math.trunc(entry.amount)) : "");
      setDate(toInputDateFormat(entry.date) || "");
      setTime(toInputTimeFormat(entry.time) || "");
      setDescription(entry.description || "");
      setErrors({});
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

    const newErrors = {};
    const numericAmount = Math.trunc(parseFloat(amount) || 0);

    if (!type) newErrors.type = true;
    if (!amount || numericAmount <= 0) newErrors.amount = true;
    if (!date || !date.trim()) newErrors.date = true;
    if (!time || !time.trim()) newErrors.time = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.type && typeRef.current) typeRef.current.focus();
      else if (newErrors.amount && amountRef.current) amountRef.current.focus();
      else if (newErrors.date && dateRef.current) dateRef.current.focus();
      else if (newErrors.time && timeRef.current) timeRef.current.focus();
      return;
    }

    try {
      setSubmitting(true);
      const res = await forSelfService.updateForSelfEntry(entry._id, {
        type,
        status: type,
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
        const msg = res.message || "Failed to update entry.";
        const lower = msg.toLowerCase();
        if (lower.includes("amount")) {
          setErrors((prev) => ({ ...prev, amount: msg }));
        } else if (lower.includes("type")) {
          setErrors((prev) => ({ ...prev, type: msg }));
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update entry.";
      const lower = msg.toLowerCase();
      if (lower.includes("amount")) {
        setErrors((prev) => ({ ...prev, amount: msg }));
      } else if (lower.includes("type")) {
        setErrors((prev) => ({ ...prev, type: msg }));
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
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
                      label={`${m.forFromName || "Participant"} (₹${formatAmount(m.amount)})`}
                      size="small"
                      color={m._id === entry._id ? "primary" : "default"}
                      variant={m._id === entry._id ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* 1. Type: Add Balance always top */}
          <FormControl fullWidth required error={Boolean(errors.type)} disabled={isSplit}>
            <InputLabel id="edit-for-self-type-label" required error={Boolean(errors.type)}>
              Type
            </InputLabel>
            <Select
              labelId="edit-for-self-type-label"
              value={type}
              label="Type"
              inputRef={typeRef}
              error={Boolean(errors.type)}
              onChange={(e) => {
                setType(e.target.value);
                if (errors.type) setErrors((prev) => ({ ...prev, type: false }));
              }}
            >
              {isSplit ? (
                <MenuItem value="Expense">Expense</MenuItem>
              ) : (
                [
                  <MenuItem key="Add Balance" value="Add Balance">Add Balance</MenuItem>,
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                ]
              )}
            </Select>
            {errors.type && <FormHelperText error>Type is required</FormHelperText>}
            {isSplit && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                Type is fixed for split group participants ({type})
              </Typography>
            )}
          </FormControl>

          {/* 2. Amounts */}
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
                inputRef={amountRef}
                error={Boolean(errors.amount)}
                helperText={typeof errors.amount === "string" ? errors.amount : (errors.amount ? "Please enter a valid amount" : "")}
                onChange={(e) => {
                  handlePerPersonChange(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
                }}
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
              inputRef={amountRef}
              error={Boolean(errors.amount)}
              helperText={typeof errors.amount === "string" ? errors.amount : (errors.amount ? "Please enter a valid amount" : "")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^[0-9]+$/.test(val)) {
                  setAmount(val);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
                }
              }}
              placeholder="e.g. 1500"
              fullWidth
              required
              inputProps={{ min: "1", step: "1" }}
            />
          )}

          {/* 3. Description */}
          <TextField
            label="Description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Salary deposit, groceries, coffee..."
            fullWidth
          />

          {/* 4. Date & Time */}
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
            {submitting ? "Saving..." : "Update For Self"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditForSelfModal;
