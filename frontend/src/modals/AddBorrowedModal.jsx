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
  Box,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import HandshakeIcon from "@mui/icons-material/Handshake";
import { memberService, borrowedService } from "../services/api";

const AddBorrowedModal = ({ open, onClose, onBorrowedCreated }) => {
  const [members, setMembers] = useState([]);
  const [personName, setPersonName] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [type, setType] = useState("Expense");
  const [status, setStatus] = useState("Pending");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setPersonName(null);
      setInputValue("");
      setType("Expense");
      setStatus("Pending");
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

    // Determine final person name
    let finalName = "";
    let finalMemberId = null;

    if (personName) {
      if (typeof personName === "string") {
        finalName = personName.trim();
      } else {
        finalName = personName.fullName || "";
        finalMemberId = personName._id || null;
      }
    } else if (inputValue && inputValue.trim()) {
      finalName = inputValue.trim();
    }

    if (!finalName) {
      setError("Please select or enter the person who paid or lent money.");
      return;
    }

    if (/myself/i.test(finalName)) {
      setError("Borrowed flow is for other people who paid for you. You cannot borrow from yourself.");
      return;
    }

    const numericAmount = Math.trunc(parseFloat(amount) || 0);
    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await borrowedService.createBorrowed({
        personName: finalName,
        memberId: finalMemberId,
        type,
        status,
        amount: numericAmount,
        date,
        time,
        description: description.trim(),
      });

      if (res.success) {
        onBorrowedCreated();
        onClose();
      } else {
        setError(res.message || "Failed to create borrowed entry");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create borrowed entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <HandshakeIcon color="primary" /> Add Borrowed Entry
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Info Notice */}
          <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" color="text.secondary">
              Record expenses others paid for you, or loans/cash you borrowed that you need to return.
            </Typography>
          </Box>

          {/* 1. Person / Lender Name */}
          <Autocomplete
            freeSolo
            options={members}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.fullName)}
            value={personName}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
              setPersonName(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Who Paid / Lent You? (Select Member or Type New Name)"
                placeholder="Choose member or type name..."
                required={!personName && !inputValue}
              />
            )}
          />

          {/* 2. Type & Status */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="borrowed-type-label">Type</InputLabel>
              <Select
                labelId="borrowed-type-label"
                value={type}
                label="Type"
                onChange={(e) => setType(e.target.value)}
              >
                <MenuItem value="Expense">Expense (They paid for you)</MenuItem>
                <MenuItem value="Borrowed">Borrowed (Cash / Loan)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="borrowed-status-label">Status</InputLabel>
              <Select
                labelId="borrowed-status-label"
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
            placeholder="e.g. 500"
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
            placeholder="e.g. Dinner bill covered by Rahul, cab fare, tickets..."
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
            {submitting ? "Saving..." : "Add Borrowed"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddBorrowedModal;
