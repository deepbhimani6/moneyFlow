import React, { useState, useEffect } from 'react';
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
  Divider,
} from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { entryService } from '../services/api';
import { toInputDateFormat, toInputTimeFormat, formatAmount } from '../utils/formatters';

const EditEntryModal = ({ open, onClose, entry, onEntryUpdated }) => {
  const [forFromName, setForFromName] = useState('');
  const [status, setStatus] = useState('Expense');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [amount, setAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Split group details
  const [splitGroupMembers, setSplitGroupMembers] = useState([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

  useEffect(() => {
    if (entry && open) {
      setForFromName(entry.forFromName || '');
      setStatus(entry.type || entry.status || 'Expense');
      setPaymentStatus(entry.paymentStatus || 'Pending');
      setAmount(entry.amount !== undefined ? String(Math.trunc(entry.amount)) : '');
      setDate(toInputDateFormat(entry.date) || '');
      setTime(toInputTimeFormat(entry.time) || '');
      setDescription(entry.description || '');
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
            }
          })
          .catch(console.error)
          .finally(() => setLoadingGroup(false));
      } else {
        setSplitGroupMembers([]);
        setTotalAmount('');
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
  const handlePerPersonChange = (newPerPerson) => {
    setAmount(newPerPerson);
    const numPerPerson = parseFloat(newPerPerson);
    const count = splitGroupMembers.length || 1;
    if (!isNaN(numPerPerson) && numPerPerson > 0) {
      setTotalAmount(String(Math.trunc(numPerPerson * count)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = Math.trunc(parseFloat(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        forFromName,
        type: status,
        status,
        paymentStatus,
        amount: numericAmount,
        totalAmount: entry.isSplit ? parseFloat(totalAmount) || undefined : undefined,
        date,
        time,
        description,
      };

      const res = await entryService.updateEntry(entry._id, payload);

      if (res.success) {
        onEntryUpdated(res.message || 'Entry updated successfully');
        onClose();
      } else {
        setError(res.message || 'Failed to update entry');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!entry) return null;

  const isSplit = Boolean(entry.isSplit);
  const isMyself = Boolean(
    (forFromName && forFromName.toLowerCase().includes("myself")) ||
    (entry && (entry.isMine || (entry.forFromName && entry.forFromName.toLowerCase().includes("myself"))))
  );
  const isAddBalance = status === "Add Balance";
  const shouldHideStatus = isMyself || isAddBalance;

  // Enforce valid type when editing single entry:
  // - If myself: no Loan allowed
  // - If other member: no Add Balance allowed
  useEffect(() => {
    if (!isSplit) {
      if (isMyself && status === 'Loan') {
        setStatus('Expense');
      } else if (!isMyself && status === 'Add Balance') {
        setStatus('Expense');
      }
    }
  }, [isMyself, isSplit, status]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {isSplit ? 'Edit Split Group Entry' : 'Edit Entry'}
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
                      label={`${m.forFromName} (₹${formatAmount(m.amount)})`}
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
            onChange={(e) => setForFromName(e.target.value)}
            fullWidth
            required
            disabled={isSplit}
            helperText={isSplit ? 'Participant name in this split group' : ''}
          />

          {/* 2. Type */}
          <FormControl fullWidth disabled={isSplit}>
            <InputLabel id="edit-type-label">Type</InputLabel>
            <Select
              labelId="edit-type-label"
              value={status}
              label="Type"
              onChange={(e) => setStatus(e.target.value)}
            >
              {isSplit ? (
                <MenuItem value={status}>{status}</MenuItem>
              ) : isMyself ? (
                [
                  <MenuItem key="Add Balance" value="Add Balance">Add Balance</MenuItem>,
                  <MenuItem key="Expense" value="Expense">Expense</MenuItem>,
                ]
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

          {/* Status (Pending / Received) - hidden for Myself or Add Balance */}
          {!shouldHideStatus && (
            <FormControl fullWidth>
              <InputLabel id="edit-payment-status-label">Status</InputLabel>
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
          )}

          {/* 3. Amounts */}
          {isSplit ? (
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
                onChange={(e) => handlePerPersonChange(e.target.value)}
                fullWidth
                required
                inputProps={{ min: '0', step: 'any' }}
              />
            </Box>
          ) : (
            <TextField
              label="Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              required
              inputProps={{ min: '0', step: 'any' }}
            />
          )}

          {/* 4. Description */}
          <TextField
            label="Description (Optional)"
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
            {submitting ? 'Saving...' : isSplit ? 'Update All Split Entries' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditEntryModal;
