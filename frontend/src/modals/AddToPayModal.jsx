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
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { memberService, toPayService } from "../services/api";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { capitalizeName, isCurrentLoggedInUser } from "../utils/formatters";

const AddToPayModal = ({ open, onClose, onEntryCreated }) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const memberInputRef = useRef(null);
  const amountRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  // Fetch available members
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
      setSelectedMember(null);
      setInputValue("");
      setType("Expense");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setTime(new Date().toTimeString().split(" ")[0].substring(0, 5));
      setErrors({});
      setError("");
    }
  }, [open]);

  // Exclude currently logged-in user from dropdown options
  const availableMembers = useMemo(() => {
    return members.filter((m) => !isCurrentLoggedInUser(m, profile, user));
  }, [members, profile, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let finalName = "";
    let finalMemberId = null;

    if (selectedMember) {
      if (typeof selectedMember === "string") {
        finalName = capitalizeName(selectedMember);
      } else {
        finalName = capitalizeName(selectedMember.fullName || "");
        finalMemberId = selectedMember._id || null;
      }
    } else if (inputValue && inputValue.trim()) {
      finalName = capitalizeName(inputValue);
    }

    const newErrors = {};
    const numericAmount = Math.trunc(parseFloat(amount) || 0);

    if (!finalName) newErrors.member = true;
    if (!amount || numericAmount <= 0) newErrors.amount = true;
    if (!date || !date.trim()) newErrors.date = true;
    if (!time || !time.trim()) newErrors.time = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.member && memberInputRef.current) memberInputRef.current.focus();
      else if (newErrors.amount && amountRef.current) amountRef.current.focus();
      else if (newErrors.date && dateRef.current) dateRef.current.focus();
      else if (newErrors.time && timeRef.current) timeRef.current.focus();
      return;
    }

    try {
      setSubmitting(true);
      const res = await toPayService.createToPayEntry({
        names: [{ name: finalName, memberId: finalMemberId }],
        type,
        status: type,
        paymentStatus: "Pending",
        amount: numericAmount,
        description,
        date,
        time,
      });

      if (res.success) {
        window.dispatchEvent(new CustomEvent('moneyflow-entry-created'));
        onEntryCreated();
        onClose();
      } else {
        const msg = res.message || "Failed to create To Pay entry.";
        const lower = msg.toLowerCase();
        if (lower.includes("member") || lower.includes("name")) {
          setErrors((prev) => ({ ...prev, member: msg }));
        } else if (lower.includes("amount")) {
          setErrors((prev) => ({ ...prev, amount: msg }));
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create To Pay entry.";
      const lower = msg.toLowerCase();
      if (lower.includes("member") || lower.includes("name")) {
        setErrors((prev) => ({ ...prev, member: msg }));
      } else if (lower.includes("amount")) {
        setErrors((prev) => ({ ...prev, amount: msg }));
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add To Pay</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Member / Person Name (Single Select or FreeSolo) */}
          <Autocomplete
            freeSolo
            options={availableMembers}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.fullName || "")}
            isOptionEqualToValue={(option, value) => {
              if (typeof value === "string") return option.fullName === value;
              return option._id === value?._id;
            }}
            value={selectedMember}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
              setSelectedMember(newValue);
              if (errors.member) setErrors((prev) => ({ ...prev, member: false }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Member Name"
                placeholder="Search or enter member name..."
                required
                inputRef={memberInputRef}
                error={Boolean(errors.member)}
                inputProps={{
                  ...params.inputProps,
                  style: { textTransform: "capitalize" },
                }}
                helperText={typeof errors.member === "string" ? errors.member : (errors.member ? "Member name is required." : "")}
              />
            )}
          />

          {/* 2. Type: Only Expense and Loan */}
          <FormControl fullWidth required>
            <InputLabel id="type-label" required>Type</InputLabel>
            <Select labelId="type-label" value={type} label="Type" onChange={(e) => setType(e.target.value)}>
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Loan">Loan</MenuItem>
            </Select>
          </FormControl>

          {/* 3. Amount */}
          <TextField
            label="Amount (₹)"
            type="number"
            value={amount}
            inputRef={amountRef}
            error={Boolean(errors.amount)}
            helperText={typeof errors.amount === "string" ? errors.amount : (errors.amount ? "Please enter a valid amount." : "")}
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
            placeholder="e.g. Dinner, cab fare, tickets..."
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
          <Button type="submit" variant="contained" disabled={submitting} startIcon={submitting && <CircularProgress size={18} />}>
            {submitting ? "Saving..." : "Add To Pay"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddToPayModal;
