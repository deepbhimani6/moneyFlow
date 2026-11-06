import React, { useState, useEffect, useRef } from 'react';
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
  Avatar,
} from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { entryService } from '../services/api';
import { toInputDateFormat, toInputTimeFormat, formatAmount, capitalizeName, capitalizeWordsInput } from '../utils/formatters';

const EditEntryModal = ({ open, onClose, entry, onEntryUpdated }) => {
  const [forFromName, setForFromName] = useState('');
  const [status, setStatus] = useState('Expense');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [amount, setAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const memberInputRef = useRef(null);
  const amountRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  // Split group details
  const [splitGroupMembers, setSplitGroupMembers] = useState([]);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [splitMode, setSplitMode] = useState("equal"); // "equal" | "separate"
  const [memberAmounts, setMemberAmounts] = useState({}); // { [m._id]: string }

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    if (entry && open) {
      setForFromName(capitalizeName(entry.forFromName || ''));
      setStatus(entry.type || entry.status || 'Expense');
      setPaymentStatus(entry.paymentStatus || 'Pending');
      setAmount(entry.amount !== undefined ? String(Math.trunc(entry.amount)) : '');
      setDate(toInputDateFormat(entry.date) || '');
      setTime(toInputTimeFormat(entry.time) || '');
      setDescription(entry.description || '');
      setErrors({});
      setError('');

      if (entry.isSplit && entry.splitGroupId) {
        setLoadingGroup(true);
        entryService
          .getSplitGroupEntries(entry.splitGroupId)
          .then((res) => {
            if (res.success) {
              setSplitGroupMembers(res.data);
              const count = res.data.length || 1;
              const originalTotal = entry.originalTotalAmount || entry.amount * count;
              setTotalAmount(String(Math.trunc(originalTotal)));

              // Check if member shares are unequal
              const hasUnequal = res.data.some((m) => Math.trunc(m.amount) !== Math.trunc(res.data[0]?.amount));
              setSplitMode(hasUnequal ? "separate" : "equal");

              const amountsMap = {};
              res.data.forEach((m) => {
                amountsMap[m._id] = String(Math.trunc(m.amount));
              });
              setMemberAmounts(amountsMap);
            }
          })
          .catch(console.error)
          .finally(() => setLoadingGroup(false));
      } else {
        setSplitGroupMembers([]);
        setTotalAmount('');
        setSplitMode("equal");
        setMemberAmounts({});
      }
    }
  }, [entry, open]);

  const handleSplitModeChange = (mode) => {
    setSplitMode(mode);
    if (mode === "separate") {
      const currentNum = Math.trunc(parseFloat(totalAmount || amount) || 0);
      const count = splitGroupMembers.length || 1;
      const defaultShare = currentNum > 0 ? String(Math.trunc(currentNum / count)) : "";
      setMemberAmounts((prev) => {
        const next = { ...prev };
        splitGroupMembers.forEach((m) => {
          if (!next[m._id] || next[m._id] === "0") {
            next[m._id] = defaultShare;
          }
        });
        return next;
      });
    }
  };

  const handleMemberAmountChange = (id, val) => {
    const nextAmounts = { ...memberAmounts, [id]: val };
    setMemberAmounts(nextAmounts);

    const sum = splitGroupMembers.reduce((acc, m) => {
      const num = Math.trunc(parseFloat(nextAmounts[m._id]) || 0);
      return acc + num;
    }, 0);

    setTotalAmount(sum > 0 ? String(sum) : "");
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
  };

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
    setError('');

    const newErrors = {};
    const numericAmount = Math.trunc(parseFloat(amount) || 0);
    const numericTotalAmount = Math.trunc(parseFloat(totalAmount) || 0);

    const formattedForFromName = capitalizeName(forFromName);
    if (!formattedForFromName) newErrors.forFromName = true;
    if (!entry.isSplit && (!amount || numericAmount <= 0)) newErrors.amount = true;
    if (entry.isSplit && splitMode === "equal" && (!totalAmount || numericTotalAmount <= 0)) newErrors.amount = true;
    if (!date || !date.trim()) newErrors.date = true;
    if (!time || !time.trim()) newErrors.time = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.forFromName && memberInputRef.current) memberInputRef.current.focus();
      else if (newErrors.amount && amountRef.current) amountRef.current.focus();
      else if (newErrors.date && dateRef.current) dateRef.current.focus();
      else if (newErrors.time && timeRef.current) timeRef.current.focus();
      return;
    }

    if (entry.isSplit && splitMode === "separate") {
      const hasInvalid = splitGroupMembers.some((m) => {
        const val = Math.trunc(parseFloat(memberAmounts[m._id]) || 0);
        return isNaN(val) || val <= 0;
      });
      if (hasInvalid) {
        setError("Please enter a valid amount (greater than ₹0) for all members.");
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        forFromName: formattedForFromName,
        type: status,
        status,
        paymentStatus,
        amount: numericAmount,
        totalAmount: entry.isSplit ? parseFloat(totalAmount) || undefined : undefined,
        splitMode: entry.isSplit ? splitMode : undefined,
        splits: entry.isSplit && splitMode === "separate"
          ? splitGroupMembers.map((m) => ({
              _id: m._id,
              memberId: m.memberId,
              isMine: Boolean(m.isMine),
              amount: Math.trunc(parseFloat(memberAmounts[m._id]) || 0),
            }))
          : undefined,
        date,
        time,
        description,
      };

      const res = await entryService.updateEntry(entry._id, payload);

      if (res.success) {
        onEntryUpdated(res.message || 'Entry updated successfully');
        onClose();
      } else {
        const msg = res.message || 'Failed to update entry.';
        const lower = msg.toLowerCase();
        if (lower.includes('amount')) {
          setErrors((prev) => ({ ...prev, amount: msg }));
        } else if (lower.includes('member') || lower.includes('name')) {
          setErrors((prev) => ({ ...prev, forFromName: msg }));
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update entry.';
      const lower = msg.toLowerCase();
      if (lower.includes('amount')) {
        setErrors((prev) => ({ ...prev, amount: msg }));
      } else if (lower.includes('member') || lower.includes('name')) {
        setErrors((prev) => ({ ...prev, forFromName: msg }));
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!entry) return null;

  const isSplit = Boolean(entry.isSplit);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {isSplit ? 'Edit Split Group To Receive' : 'Edit To Receive'}
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* SPLIT GROUP BANNER */}
          {isSplit && (
            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CallSplitIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  Split Group Synced Update
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                This entry is linked to <strong>{splitGroupMembers.length} participants</strong>. Updating the amount, date, time, or description will automatically synchronize all entries in this split group.
              </Typography>

              {loadingGroup ? (
                <CircularProgress size={20} />
              ) : (
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  {splitGroupMembers.map((m) => (
                    <Chip
                      key={m._id}
                      label={`${m.forFromName || 'Participant'} (₹${formatAmount(m.amount)})`}
                      size="small"
                      color={m._id === entry._id ? 'primary' : 'default'}
                      variant={m._id === entry._id ? 'filled' : 'outlined'}
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
            inputRef={memberInputRef}
            error={Boolean(errors.forFromName)}
            helperText={
              errors.forFromName
                ? 'Member name is required'
                : isSplit
                ? 'Participant name in this split group'
                : ''
            }
            onChange={(e) => {
              setForFromName(capitalizeWordsInput(e.target.value));
              if (errors.forFromName) setErrors((prev) => ({ ...prev, forFromName: false }));
            }}
            onBlur={() => setForFromName((prev) => capitalizeName(prev))}
            inputProps={{ style: { textTransform: 'capitalize' } }}
            fullWidth
            required
            disabled={isSplit}
          />

          {/* 2. Type */}
          <FormControl fullWidth required disabled={isSplit}>
            <InputLabel id="edit-type-label" required>Type</InputLabel>
            <Select
              labelId="edit-type-label"
              value={status}
              label="Type"
              onChange={(e) => setStatus(e.target.value)}
            >
              {isSplit ? (
                <MenuItem value={status}>{status}</MenuItem>
              ) : (
                [
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                  <MenuItem key="Loan" value="Loan">Loan</MenuItem>,
                ]
              )}
            </Select>
            {isSplit && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                Type is fixed for split group participants ({status})
              </Typography>
            )}
          </FormControl>

          {/* Status (Pending / Received) */}
          <FormControl fullWidth required>
            <InputLabel id="edit-payment-status-label" required>Status</InputLabel>
            <Select
              labelId="edit-payment-status-label"
              value={paymentStatus}
              label="Status"
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Received">Received</MenuItem>
            </Select>
          </FormControl>

          {/* 3. Amounts */}
          {isSplit ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Split Mode Selector */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  Split Method:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={splitMode === 'equal' ? 'contained' : 'outlined'}
                    onClick={() => handleSplitModeChange('equal')}
                    sx={{ textTransform: 'none', fontSize: '0.8rem', borderRadius: 1.5, flex: 1, py: 0.5 }}
                  >
                    Split Equally
                  </Button>
                  <Button
                    size="small"
                    variant={splitMode === 'separate' ? 'contained' : 'outlined'}
                    onClick={() => handleSplitModeChange('separate')}
                    sx={{ textTransform: 'none', fontSize: '0.8rem', borderRadius: 1.5, flex: 1, py: 0.5 }}
                  >
                    Split Separately (Member-wise)
                  </Button>
                </Box>
              </Box>

              {splitMode === 'equal' ? (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Total Group Amount (₹)"
                    type="number"
                    value={totalAmount}
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                    fullWidth
                    required
                    inputProps={{ min: '0', step: 'any' }}
                    helperText={`Divided equally across ${splitGroupMembers.length || 1} members`}
                  />
                  <TextField
                    label="Each Member's Share (₹)"
                    type="number"
                    value={amount}
                    inputRef={amountRef}
                    error={Boolean(errors.amount)}
                    helperText={typeof errors.amount === 'string' ? errors.amount : (errors.amount ? 'Please enter a valid amount' : '')}
                    onChange={(e) => {
                      handlePerPersonChange(e.target.value);
                      if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
                    }}
                    fullWidth
                    required
                    inputProps={{ min: '0', step: 'any' }}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Adjust separate share for each participant in this split group:
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
                    {splitGroupMembers.map((m) => {
                      const isMe = Boolean(m.isMine);
                      const name = m.forFromName || (isMe ? 'Myself (You)' : 'Participant');
                      return (
                        <Box
                          key={m._id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            p: 1,
                            bgcolor: isMe ? '#fff8e1' : 'background.paper',
                            borderRadius: 1.5,
                            border: isMe ? '1px solid #ffe082' : '1px solid #e0e0e0',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: '0.75rem',
                                bgcolor: isMe ? '#f57c00' : '#1976d2',
                              }}
                            >
                              {isMe ? 'ME' : getInitials(name)}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: isMe ? 'warning.dark' : 'text.primary',
                              }}
                            >
                              {name}
                            </Typography>
                          </Box>

                          <TextField
                            size="small"
                            type="number"
                            value={memberAmounts[m._id] ?? ''}
                            onChange={(e) => handleMemberAmountChange(m._id, e.target.value)}
                            placeholder="0"
                            InputProps={{
                              startAdornment: (
                                <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary', fontWeight: 700 }}>
                                  ₹
                                </Typography>
                              ),
                            }}
                            sx={{ width: 120, '& .MuiInputBase-input': { py: 0.75, fontSize: '0.85rem', fontWeight: 600 } }}
                            inputProps={{ min: '0', step: 'any' }}
                          />
                        </Box>
                      );
                    })}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px dashed #90caf9' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                      Total Group Amount:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      ₹ {formatAmount(parseFloat(totalAmount) || 0)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <TextField
              label="Amount (₹)"
              type="number"
              value={amount}
              inputRef={amountRef}
              error={Boolean(errors.amount)}
              helperText={typeof errors.amount === 'string' ? errors.amount : (errors.amount ? 'Please enter a valid amount' : '')}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
              }}
              fullWidth
              required
              inputProps={{ min: '0', step: 'any' }}
            />
          )}

          {/* 4. Description */}
          <TextField
            label="Description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner with team, office supplies, cab fare..."
            fullWidth
          />

          {/* 5. Date & Time */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Date"
              type="date"
              value={date}
              inputRef={dateRef}
              error={Boolean(errors.date)}
              helperText={errors.date ? 'Date is required' : ''}
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
              helperText={errors.time ? 'Time is required' : ''}
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
            {submitting ? 'Saving...' : isSplit ? 'Update All Split Entries' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditEntryModal;
