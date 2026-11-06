import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { memberService } from '../services/api';
import { capitalizeName, capitalizeWordsInput } from '../utils/formatters';

const EditMemberModal = ({ open, onClose, member, onMemberUpdated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (member) {
      setFormData({
        fullName: capitalizeName(member.fullName || ''),
        phoneNumber: member.phoneNumber || '',
        email: member.email || '',
        username: member.username || '',
        password: '',
      });
      setErrors({});
      setError('');
    }
  }, [member]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'fullName' && typeof value === 'string') {
      value = capitalizeWordsInput(value);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const res = await memberService.updateMember(member._id, {
        ...formData,
        fullName: formattedFullName,
      });
      if (res.success) {
        onMemberUpdated(res.data);
        onClose();
      } else {
        const msg = res.message || 'Failed to update member.';
        const lower = msg.toLowerCase();
        if (lower.includes('email')) {
          setErrors((prev) => ({ ...prev, email: msg }));
          if (emailRef.current) emailRef.current.focus();
        } else if (lower.includes('name')) {
          setErrors((prev) => ({ ...prev, fullName: msg }));
          if (fullNameRef.current) fullNameRef.current.focus();
        } else if (lower.includes('username')) {
          setErrors((prev) => ({ ...prev, username: msg }));
        } else if (lower.includes('phone') || lower.includes('mobile')) {
          setErrors((prev) => ({ ...prev, phoneNumber: msg }));
        } else if (lower.includes('password')) {
          setErrors((prev) => ({ ...prev, password: msg }));
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update member.';
      const lower = msg.toLowerCase();
      if (lower.includes('email')) {
        setErrors((prev) => ({ ...prev, email: msg }));
        if (emailRef.current) emailRef.current.focus();
      } else if (lower.includes('name')) {
        setErrors((prev) => ({ ...prev, fullName: msg }));
        if (fullNameRef.current) fullNameRef.current.focus();
      } else if (lower.includes('username')) {
        setErrors((prev) => ({ ...prev, username: msg }));
      } else if (lower.includes('phone') || lower.includes('mobile')) {
        setErrors((prev) => ({ ...prev, phoneNumber: msg }));
      } else if (lower.includes('password')) {
        setErrors((prev) => ({ ...prev, password: msg }));
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit Member</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            inputRef={fullNameRef}
            error={Boolean(errors.fullName)}
            helperText={typeof errors.fullName === 'string' ? errors.fullName : (errors.fullName ? 'Full name is required.' : '')}
            onChange={handleChange}
            onBlur={handleBlur}
            inputProps={{ style: { textTransform: 'capitalize' } }}
            fullWidth
            required
          />

          <TextField
            label="Phone Number"
            name="phoneNumber"
            value={formData.phoneNumber}
            error={Boolean(errors.phoneNumber)}
            helperText={errors.phoneNumber || ''}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="E-mail"
            name="email"
            type="email"
            value={formData.email}
            inputRef={emailRef}
            error={Boolean(errors.email)}
            helperText={typeof errors.email === 'string' ? errors.email : (errors.email ? 'Please enter a valid email address.' : '')}
            onChange={handleChange}
            fullWidth
            required
          />

          <TextField
            label="Username"
            name="username"
            value={formData.username}
            error={Boolean(errors.username)}
            helperText={errors.username || ''}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Password (leave blank to keep current)"
            name="password"
            type="password"
            value={formData.password}
            error={Boolean(errors.password)}
            helperText={errors.password || ''}
            onChange={handleChange}
            fullWidth
          />
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
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditMemberModal;
