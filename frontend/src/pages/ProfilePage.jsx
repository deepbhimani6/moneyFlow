import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useProfile } from '../context/ProfileContext';

const AVATAR_COLORS = [
  '#1976d2', // Primary Blue
  '#1565c0', // Dark Blue
  '#0288d1', // Light Blue
  '#00897b', // Teal
  '#2e7d32', // Green
  '#9c27b0', // Purple
  '#673ab7', // Deep Purple
  '#d32f2f', // Red
  '#ed6c02', // Orange
  '#455a64', // Blue Grey
];

const normalizeRole = (role) => {
  if (!role) return 'Admin';
  if (role.toLowerCase() === 'member') return 'Member';
  return 'Admin';
};

const ProfilePage = () => {
  const { profile, initials, updateProfile } = useProfile();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    username: '',
    role: 'Admin',
    bio: '',
    avatarColor: '#1976d2',
  });

  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Sync state when context profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
        username: profile.username || '',
        role: normalizeRole(profile.role),
        bio: profile.bio || '',
        avatarColor: profile.avatarColor || '#1976d2',
      });
    }
  }, [profile]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!formData.fullName.trim()) {
      setSnackbar({
        open: true,
        message: 'Full Name is required',
        severity: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      const res = await updateProfile(formData);
      if (res.success) {
        setSnackbar({
          open: true,
          message: 'Profile updated successfully!',
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: res.message || 'Failed to update profile',
          severity: 'error',
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || 'Error updating profile',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setSaving(true);
      const res = await updateProfile({
        fullName: 'Deep Bhimani',
        email: 'deep.bhimani@shunyavkash.com',
        phoneNumber: '+91 6359276907',
        username: 'deepBhimani',
        role: 'Admin',
        bio: 'Personal Finance & Expense Manager on MoneyFlow',
        avatarColor: '#1976d2',
      });
      if (res.success) {
        setSnackbar({
          open: true,
          message: 'Profile reset to default values',
          severity: 'success',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Top Banner / Hero Card */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 60%, #0d47a1 100%)',
          color: '#ffffff',
          borderRadius: 3,
          boxShadow: '0 8px 24px rgba(25, 118, 210, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Grid container spacing={3} alignItems="center">
            {/* Avatar */}
            <Grid item xs={12} sm="auto" sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  alt={formData.fullName}
                  sx={{
                    width: { xs: 84, sm: 104 },
                    height: { xs: 84, sm: 104 },
                    bgcolor: formData.avatarColor,
                    color: '#ffffff',
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                    fontWeight: 700,
                    border: '4px solid rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  }}
                >
                  {initials}
                </Avatar>
              </Box>
            </Grid>

            {/* User Info Details */}
            <Grid item xs={12} sm>
              <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 1, mb: 0.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                    {formData.fullName || 'User Profile'}
                  </Typography>
                  <Chip
                    label={formData.role || 'Admin'}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                </Box>

                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)', mb: 1 }}>
                  @{formData.username || 'username'} • {formData.email || 'No email provided'} • {formData.phoneNumber || 'No phone'}
                </Typography>

                {formData.bio && (
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.95)', fontStyle: 'italic', maxWidth: 600 }}>
                    "{formData.bio}"
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" /> Personal Information
          </Typography>

          <Box component="form" onSubmit={handleSave}>
            <Grid container spacing={2.5}>
              {/* Full Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="e.g. Deep Bhimani"
                />
              </Grid>

              {/* Username */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="e.g. deepBhimani"
                />
              </Grid>

              {/* Email Address */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="e.g. deep.bhimani@shunyavkash.com"
                />
              </Grid>

              {/* Phone Number */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  placeholder="e.g. +91 6359276907"
                />
              </Grid>

              {/* Role Dropdown (admin, member) */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="role-select-label">Role</InputLabel>
                  <Select
                    labelId="role-select-label"
                    value={formData.role}
                    label="Role"
                    onChange={(e) => handleChange('role', e.target.value)}
                  >
                    <MenuItem value="Admin">Admin</MenuItem>
                    <MenuItem value="Member">Member</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Avatar Color Picker */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Avatar Background Color Theme
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                  {AVATAR_COLORS.map((color) => {
                    const isSelected = formData.avatarColor === color;
                    return (
                      <Box
                        key={color}
                        onClick={() => handleChange('avatarColor', color)}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: isSelected ? '3px solid #000' : '2px solid #ffffff',
                          boxShadow: isSelected ? '0 0 0 2px rgba(25, 118, 210, 0.5)' : '0 2px 5px rgba(0,0,0,0.15)',
                          transition: 'transform 0.15s ease',
                          '&:hover': {
                            transform: 'scale(1.15)',
                          },
                        }}
                      >
                        {isSelected && <CheckCircleIcon sx={{ color: '#ffffff', fontSize: 18 }} />}
                      </Box>
                    );
                  })}
                </Box>
              </Grid>

              {/* Bio / About */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Bio / Notes"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Add a brief description about yourself or notes for this account..."
                />
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleResetToDefault}
                disabled={saving}
              >
                Reset Defaults
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving}
                sx={{ px: 4 }}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;
