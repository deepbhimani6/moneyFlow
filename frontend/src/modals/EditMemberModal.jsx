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

const EditMemberModal = ({ open, onClose, member, onMemberUpdated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    username: '',
    password: '',
    role: 'Member',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (member) {
      setFormData({
        fullName: member.fullName || '',
        phoneNumber: member.phoneNumber || '',
        email: member.email || '',
        username: member.username || '',
        password: '',
        role: member.role || 'Member',
      });
      setErrors({});
      setError('');
    }
  }, [member]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newErrors = {};
    if (!formData.fullName || !formData.fullName.trim()) newErrors.fullName = true;
    if (!formData.email || !formData.email.trim()) newErrors.email = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.fullName && fullNameRef.current) fullNameRef.current.focus();
      else if (newErrors.email && emailRef.current) emailRef.current.focus();
      return;
    }

    try {
      setSubmitting(true);
      const res = await memberService.updateMember(member._id, formData);
      if (res.success) {
        onMemberUpdated(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to update member');
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit Member</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            inputRef={fullNameRef}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName ? 'Full name is required' : ''}
            onChange={handleChange}
            fullWidth
            required
          />

          <TextField
            label="Phone Number"
            name="phoneNumber"
            value={formData.phoneNumber}
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
            helperText={errors.email ? 'Valid email is required' : ''}
            onChange={handleChange}
            fullWidth
            required
          />

          <TextField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Password (leave blank to keep current)"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="edit-role-label">Role</InputLabel>
            <Select
              labelId="edit-role-label"
              name="role"
              value={formData.role || 'Member'}
              label="Role"
              onChange={handleChange}
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Member">Member</MenuItem>
            </Select>
          </FormControl>
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
