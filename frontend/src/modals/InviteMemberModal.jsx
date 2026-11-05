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
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import { memberService } from '../services/api';
import { capitalizeName, capitalizeWordsInput } from '../utils/formatters';

const InviteMemberModal = ({
  open,
  onClose,
  onMemberCreated,
  existingMembers = [],
  currentUserEmail = '',
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    username: '',
    sendLink: true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);

  const validateEmailValue = (rawEmail) => {
    const clean = (rawEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!clean) {
      return 'Email address is required.';
    }
    if (!emailRegex.test(clean)) {
      return 'Please enter a valid email address.';
    }
    if (currentUserEmail && clean === currentUserEmail.trim().toLowerCase()) {
      return 'You cannot invite your own email address.';
    }
    const isDuplicate = existingMembers.some(
      (m) => (m.email || '').trim().toLowerCase() === clean
    );
    if (isDuplicate) {
      return 'This email address already exists.';
    }
    return '';
  };

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
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) {
      setError('');
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'fullName' && typeof value === 'string') {
      setFormData((prev) => ({
        ...prev,
        fullName: capitalizeName(value),
      }));
    } else if (name === 'email') {
      const emailErr = validateEmailValue(value);
      if (emailErr) {
        setErrors((prev) => ({ ...prev, email: emailErr }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const formattedFullName = capitalizeName(formData.fullName);
    const newErrors = {};

    if (!formattedFullName) {
      newErrors.fullName = 'Full name is required';
    }

    const emailErr = validateEmailValue(formData.email);
    if (emailErr) {
      newErrors.email = emailErr;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.fullName && fullNameRef.current) {
        fullNameRef.current.focus();
      } else if (newErrors.email && emailRef.current) {
        emailRef.current.focus();
      }
      return;
    }

    try {
      setSubmitting(true);
      const res = await memberService.createMember({
        fullName: formattedFullName,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim(),
        sendLink: formData.sendLink,
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
          sendLink: true,
        });
        setErrors({});
      } else {
        setError(res.message || 'Failed to create member');
        if (res.message && res.message.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: res.message }));
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to create member';
      setError(errMsg);
      if (errMsg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: errMsg }));
      }
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
            helperText={errors.fullName || ''}
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
            helperText={errors.email || 'A temporary password will be sent to this email.'}
            onChange={handleChange}
            onBlur={handleBlur}
            fullWidth
            required
            placeholder="e.g. john@example.com"
          />

          {/* 4. Username */}
          <TextField
            label="Username (optional)"
            name="username"
            value={formData.username}
            onChange={handleChange}
            fullWidth
            placeholder="e.g. johndoe (defaults to email username)"
          />

          {/* Info Card: Automatic Random Password & Invite Link */}
          <Box
            sx={{
              p: 1.75,
              bgcolor: '#f8fafc',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <VpnKeyOutlinedIcon sx={{ color: 'primary.main', fontSize: 24, flexShrink: 0 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Secure Random Password
              </Typography>
              <Typography variant="caption" color="text.secondary">
                A strong, secure password is automatically generated according to password validation standards and included in the invitation email.
              </Typography>
            </Box>
          </Box>

          {/* 5. Checkbox Send Link */}
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
                    Send invite email immediately
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Member will receive an invitation email with their temporary password and app access link.
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
