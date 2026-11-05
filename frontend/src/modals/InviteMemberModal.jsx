import React, { useState, useRef } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { memberService } from '../services/api';
import { capitalizeName, capitalizeWordsInput } from '../utils/formatters';

const InviteMemberModal = ({ open, onClose, onMemberCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    username: '',
    password: '',
    sendLink: true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);

  const handleChange = (e) => {
    let { name, value, checked, type } = e.target;
    if (name === 'fullName' && typeof value === 'string') {
      value = capitalizeWordsInput(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'fullName' && typeof value === 'string') {
      setFormData((prev) => ({
        ...prev,
        fullName: capitalizeName(value),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const formattedFullName = capitalizeName(formData.fullName);
    const newErrors = {};
    if (!formattedFullName) newErrors.fullName = true;
    if (!formData.email || !formData.email.trim()) newErrors.email = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.fullName && fullNameRef.current) fullNameRef.current.focus();
      else if (newErrors.email && emailRef.current) emailRef.current.focus();
      return;
    }

    try {
      setSubmitting(true);
      const res = await memberService.createMember({
        ...formData,
        fullName: formattedFullName,
      });
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
        setErrors({});
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
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Invite New Member</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* 1. Full Name */}
          <TextField
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            inputRef={fullNameRef}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName ? 'Full name is required' : ''}
            onChange={handleChange}
            onBlur={handleBlur}
            inputProps={{ style: { textTransform: 'capitalize' } }}
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
            inputRef={emailRef}
            error={Boolean(errors.email)}
            helperText={errors.email ? 'Valid email is required' : ''}
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
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Send invite link immediately
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Member will receive an invitation link on the email address provided above.
                  </Typography>
                </Box>
              }
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
            {submitting ? 'Saving...' : formData.sendLink ? 'Add & Send Invite' : 'Save Member'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InviteMemberModal;
