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
  Avatar,
} from "@mui/material";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { memberService, entryService } from "../services/api";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { formatAmount, capitalizeName, isCurrentLoggedInUser } from "../utils/formatters";

const AddEntryModal = ({ open, onClose, onEntryCreated }) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [includeMine, setIncludeMine] = useState(false);
  const [splitMode, setSplitMode] = useState("equal"); // "equal" | "separate"
  const [memberAmounts, setMemberAmounts] = useState({}); // { [key]: string }
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const memberInputRef = useRef(null);
  const amountRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
      setSplitMode("equal");
      setMemberAmounts({});
      setErrors({});
      setError("");
    }
  }, [open]);

  // Dropdown options: only real members (never include logged-in user or "myself")
  const autocompleteOptions = useMemo(() => {
    return members.filter((m) => !isCurrentLoggedInUser(m, profile, user));
  }, [members, profile, user]);

  // Split is active if multiple members are selected, OR at least 1 member + myself
  const isSplitActive = selectedNames.length > 1 || (selectedNames.length >= 1 && includeMine);
  const totalSplitCount = selectedNames.length + (includeMine ? 1 : 0);
  const numericAmount = Math.trunc(parseFloat(amount) || 0);
  const splitPerPerson = isSplitActive && totalSplitCount > 0 ? Math.trunc(numericAmount / totalSplitCount) : 0;

  const participants = useMemo(() => {
    const list = selectedNames.map((item, idx) => {
      const name = typeof item === "string" ? item : (item.fullName || item.name || "");
      const id = typeof item === "string" ? null : item._id;
      const key = id ? String(id) : `name_${name.toLowerCase().trim()}_${idx}`;
      return { key, name: capitalizeName(name), memberId: id, isMine: false };
    });
    if (includeMine) {
      list.push({ key: "myself", name: "Myself (You)", memberId: null, isMine: true });
    }
    return list;
  }, [selectedNames, includeMine]);

  const handleSplitModeChange = (mode) => {
    setSplitMode(mode);
    if (mode === "separate") {
      const currentNum = Math.trunc(parseFloat(amount) || 0);
      const count = participants.length || 1;
      const defaultShare = currentNum > 0 ? String(Math.trunc(currentNum / count)) : "";
      setMemberAmounts((prev) => {
        const next = { ...prev };
        participants.forEach((p) => {
          if (!next[p.key] || next[p.key] === "0") {
            next[p.key] = defaultShare;
          }
        });
        return next;
      });
    }
  };

  const handleMemberAmountChange = (key, val) => {
    const nextAmounts = { ...memberAmounts, [key]: val };
    setMemberAmounts(nextAmounts);

    const sum = participants.reduce((acc, p) => {
      const num = Math.trunc(parseFloat(nextAmounts[p.key]) || 0);
      return acc + num;
    }, 0);

    setAmount(sum > 0 ? String(sum) : "");
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
  };

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
        finalNames.push(trimmed);
      }
    }

    const isSplit = finalNames.length > 1 || (finalNames.length >= 1 && includeMine);
    const newErrors = {};
    if (finalNames.length === 0) newErrors.members = true;
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

    if (isSplit && splitMode === "separate") {
      const hasInvalid = participants.some((p) => {
        const val = Math.trunc(parseFloat(memberAmounts[p.key]) || 0);
        return isNaN(val) || val <= 0;
      });
      if (hasInvalid) {
        setError("Please enter a valid amount (greater than ₹0) for all selected participants.");
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await entryService.createEntry({
        names: finalNames.map((item, idx) => {
          const name = typeof item === "string" ? capitalizeName(item) : capitalizeName(item.fullName || item.name || "");
          const memberId = typeof item === "string" ? null : item._id;
          const key = memberId ? String(memberId) : `name_${name.toLowerCase().trim()}_${idx}`;
          const customAmount = (isSplit && splitMode === "separate")
            ? Math.trunc(parseFloat(memberAmounts[key]) || 0)
            : undefined;

          return {
            name,
            memberId,
            amount: customAmount,
          };
        }),
        splitMode: isSplit ? splitMode : undefined,
        myAmount: (isSplit && includeMine && splitMode === "separate")
          ? Math.trunc(parseFloat(memberAmounts.myself) || 0)
          : undefined,
        type: isSplit ? "Split" : type,
        status: isSplit ? "Split" : type,
        amount: numericAmount,
        description,
        date,
        time,
        includeMine: Boolean(includeMine),
      });

      if (res.success) {
        window.dispatchEvent(new CustomEvent('moneyflow-entry-created'));
        onEntryCreated();
        onClose();
      } else {
        const msg = res.message || "Failed to create entry.";
        const lower = msg.toLowerCase();
        if (lower.includes("member") || lower.includes("name")) {
          setErrors((prev) => ({ ...prev, members: msg }));
        } else if (lower.includes("amount")) {
          setErrors((prev) => ({ ...prev, amount: msg }));
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create entry.";
      const lower = msg.toLowerCase();
      if (lower.includes("member") || lower.includes("name")) {
        setErrors((prev) => ({ ...prev, members: msg }));
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add To Receive</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Member Name (Multi-select from Members & add custom) */}
          <Autocomplete
            multiple
            freeSolo
            options={autocompleteOptions}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.fullName || "")}
            isOptionEqualToValue={(option, value) => {
              if (typeof value === "string") return option.fullName === value;
              return option._id === value?._id;
            }}
            value={selectedNames}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
              setSelectedNames(newValue);
              setInputValue("");
              if (errors.members) setErrors((prev) => ({ ...prev, members: false }));
            }}
            renderTags={(value, getTagProps) => (
              <>
                {value.map((option, index) => {
                  const label = typeof option === "string" ? capitalizeName(option) : capitalizeName(option.fullName);
                  return (
                    <Chip
                      variant="outlined"
                      color="primary"
                      size="small"
                      label={label}
                      sx={{ textTransform: "capitalize" }}
                      {...getTagProps({ index })}
                      key={index}
                    />
                  );
                })}
                {includeMine && (
                  <Chip
                    size="small"
                    label="Myself (You)"
                    onDelete={() => setIncludeMine(false)}
                    sx={{
                      bgcolor: "#ede9fe",
                      color: "#5b21b6",
                      fontWeight: 600,
                      "& .MuiChip-deleteIcon": {
                        color: "#6d28d9 !important",
                        fontSize: "18px",
                        opacity: 1,
                        "&:hover": {
                          color: "#4c1d95 !important",
                        },
                      },
                    }}
                  />
                )}
              </>
            )}
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
                  typeof errors.members === "string"
                    ? errors.members
                    : errors.members
                    ? "Member name is required."
                    : "Select 1 or more members. If multiple are selected, amount will be split."
                }
              />
            )}
          />

          {/* Inline Add myself checkbox when 1 member is selected */}
          {selectedNames.length === 1 && !includeMine && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={false}
                  onChange={(e) => setIncludeMine(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label="Add myself (splits my share into For Self)"
              componentsProps={{
                typography: {
                  sx: { fontSize: "0.82rem", fontWeight: 500, color: "text.secondary" },
                },
              }}
              sx={{
                mt: -1.5,
                mb: -1,
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.82rem",
                  fontWeight: 500,
                },
              }}
            />
          )}

          {/* Split notification & Add myself checkbox */}
          {isSplitActive && (
            <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2, border: "1px solid #90caf9" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CallSplitIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.dark" }}>
                    {includeMine && selectedNames.length === 1
                      ? "Split with Myself"
                      : "Split Expense"}
                  </Typography>
                </Box>
                <Chip
                  label={`${totalSplitCount} participants`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: "0.75rem", height: 22 }}
                />
              </Box>

              {/* Checkbox: Add myself */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeMine}
                    onChange={(e) => {
                      setIncludeMine(e.target.checked);
                      if (splitMode === "separate" && !e.target.checked) {
                        setMemberAmounts((prev) => {
                          const copy = { ...prev };
                          delete copy.myself;
                          return copy;
                        });
                      }
                    }}
                    size="small"
                    color="primary"
                  />
                }
                label="Add myself (splits my share into For Self)"
                componentsProps={{
                  typography: {
                    sx: { fontSize: "0.82rem", fontWeight: 500, color: "text.primary" },
                  },
                }}
                sx={{ mb: 1.5 }}
              />

              {/* Split Mode Selector */}
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
                  Split Method:
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant={splitMode === "equal" ? "contained" : "outlined"}
                    onClick={() => handleSplitModeChange("equal")}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.8rem",
                      borderRadius: 1.5,
                      flex: 1,
                      py: 0.5,
                    }}
                  >
                    Split Equally
                  </Button>
                  <Button
                    size="small"
                    variant={splitMode === "separate" ? "contained" : "outlined"}
                    onClick={() => handleSplitModeChange("separate")}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.8rem",
                      borderRadius: 1.5,
                      flex: 1,
                      py: 0.5,
                    }}
                  >
                    Split Separately (Member-wise)
                  </Button>
                </Box>
              </Box>

              {/* Mode 1: Equal Split Summary */}
              {splitMode === "equal" && (
                <Box sx={{ p: 1.5, bgcolor: "rgba(25, 118, 210, 0.08)", borderRadius: 1.5, border: "1px dashed #90caf9" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
                    Total amount is divided equally among <strong>{totalSplitCount} participants</strong>.
                  </Typography>
                  {numericAmount > 0 ? (
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
                      ₹ {formatAmount(splitPerPerson)} per person
                      {includeMine ? " (your share added to For Self)" : ""}
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Enter total amount below to calculate per-person share.
                    </Typography>
                  )}
                </Box>
              )}

              {/* Mode 2: Separate Member-wise Input */}
              {splitMode === "separate" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    Enter separate share for each selected participant:
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 220, overflowY: "auto", pr: 0.5 }}>
                    {participants.map((p) => {
                      const isMe = p.isMine;
                      return (
                        <Box
                          key={p.key}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1.5,
                            p: 1,
                            bgcolor: isMe ? "#fff8e1" : "background.paper",
                            borderRadius: 1.5,
                            border: isMe ? "1px solid #ffe082" : "1px solid #e0e0e0",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.75rem",
                                bgcolor: isMe ? "#f57c00" : "#1976d2",
                              }}
                            >
                              {isMe ? "ME" : getInitials(p.name)}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: isMe ? "warning.dark" : "text.primary",
                              }}
                            >
                              {p.name}
                            </Typography>
                          </Box>

                          <TextField
                            size="small"
                            type="number"
                            value={memberAmounts[p.key] ?? ""}
                            onChange={(e) => handleMemberAmountChange(p.key, e.target.value)}
                            placeholder="0"
                            InputProps={{
                              startAdornment: (
                                <Typography variant="caption" sx={{ mr: 0.5, color: "text.secondary", fontWeight: 700 }}>
                                  ₹
                                </Typography>
                              ),
                            }}
                            sx={{ width: 120, "& .MuiInputBase-input": { py: 0.75, fontSize: "0.85rem", fontWeight: 600 } }}
                            inputProps={{ min: "0", step: "any" }}
                          />
                        </Box>
                      );
                    })}
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1, mt: 0.5, borderTop: "1px dashed #90caf9" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.dark" }}>
                      Total Split Sum:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
                      ₹ {formatAmount(numericAmount)}
                    </Typography>
                  </Box>
                </Box>
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
            label={isSplitActive && splitMode === "separate" ? "Total Amount (₹) — Auto-calculated" : "Amount (₹)"}
            type="number"
            value={amount}
            inputRef={amountRef}
            error={Boolean(errors.amount)}
            disabled={isSplitActive && splitMode === "separate"}
            helperText={
              isSplitActive && splitMode === "separate"
                ? "Calculated automatically from separate member shares above"
                : typeof errors.amount === "string"
                ? errors.amount
                : errors.amount
                ? "Please enter a valid amount."
                : ""
            }
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
