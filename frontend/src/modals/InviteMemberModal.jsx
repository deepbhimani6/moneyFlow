import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { memberService } from '../services/api';

const InviteMemberModal = ({ open, onClose, onMemberCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    username: '',
    password: '',
    sendLink: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.email) {
      setError('Full Name and E-mail are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await memberService.createMember(formData);
      if (res.success) {
        onMemberCreated(res.data, formData.sendLink);
        onClose();
        // Reset form
        setFormData({
          fullName: '',
          phoneNumber: '',
          email: '',
          username: '',
          password: '',
          sendLink: true,
        });
      } else {
        setError(res.message || 'Failed to create member');
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Invite New Member</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Full Name */}
          <TextField
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            fullWidth
            required
            placeholder="e.g. John Doe"
          />

          {/* 2. Phone Number */}
          <TextField
            label="Phone Number"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            fullWidth
            placeholder="e.g. +91 9876543210"
          />

          {/* 3. E-mail */}
          <TextField
            label="E-mail"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            fullWidth
            required
            placeholder="e.g. john@example.com"
          />

          {/* 4. Username */}
          <TextField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            fullWidth
            placeholder="e.g. johndoe"
          />

          {/* 5. Password */}
          <TextField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            fullWidth
            placeholder="Temporary or initial password"
          />

          {/* 6. Checkbox Send Link */}
          <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="sendLink"
                  checked={formData.sendLink}
                  onChange={handleChange}
                  color="success"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Send app invite link directly to e-mail via Resend
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              When enabled, sends a welcome email with credentials & app link.
            </Typography>
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
            startIcon={
              submitting ? (
                <CircularProgress size={18} />
              ) : formData.sendLink ? (
                <SendIcon />
              ) : (
                <PersonAddIcon />
              )
            }
          >
            {submitting
              ? formData.sendLink
                ? 'Sending Invite...'
                : 'Adding...'
              : formData.sendLink
              ? 'Send Invite'
              : 'Add Member'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InviteMemberModal;
