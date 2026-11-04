import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Box, Alert, CircularProgress } from "@mui/material";
import { memberService, toPayService } from "../services/api";

const AddToPayModal = ({ open, onClose, onEntryCreated }) => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let finalName = "";
    let finalMemberId = null;

    if (selectedMember) {
      if (typeof selectedMember === "string") {
        finalName = selectedMember.trim();
      } else {
        finalName = selectedMember.fullName || "";
        finalMemberId = selectedMember._id || null;
      }
    } else if (inputValue && inputValue.trim()) {
      finalName = inputValue.trim();
    }

    if (!finalName) {
      setError("Please select or enter a member name");
      return;
    }

    const numericAmount = Math.trunc(parseFloat(amount) || 0);
    if (!amount || numericAmount <= 0) {
      setError("Please enter a valid amount");
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
        onEntryCreated();
        onClose();
      } else {
        setError(res.message || "Failed to create To Pay entry");
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add To Pay</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Member / Person Name (Single Select or FreeSolo) */}
          <Autocomplete
            freeSolo
            options={members}
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
            }}
            renderInput={(params) => <TextField {...params} label="For/From Name (Select Member or Type Name)" placeholder="Choose member or type name..." required={!selectedMember && !inputValue.trim()} />}
          />

          {/* 2. Type: Only Expense and Loan */}
          <FormControl fullWidth>
            <InputLabel id="type-label">Type</InputLabel>
            <Select labelId="type-label" value={type} label="Type" onChange={(e) => setType(e.target.value)}>
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Loan">Loan</MenuItem>
            </Select>
          </FormControl>

          {/* 3. Amount */}
          <TextField label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1500" fullWidth required inputProps={{ min: "0", step: "any" }} />

          {/* Description */}
          <TextField label="Description (Optional)" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dinner, cab fare, tickets..." fullWidth />

          {/* 4. Date & 5. Time */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} required />
            <TextField label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} required />
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
