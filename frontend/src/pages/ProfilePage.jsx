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
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useProfile } from '../context/ProfileContext';
import { capitalizeName, capitalizeWordsInput } from '../utils/formatters';

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

const ProfilePage = () => {
  const { profile, initials, updateProfile } = useProfile();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    username: '',
    password: '',
    confirmPassword: '',
    bio: '',
    avatarColor: '#1976d2',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Sync state when context profile changes
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
        username: profile.username || '',
        password: '',
        confirmPassword: '',
        bio: profile.bio || '',
        avatarColor: profile.avatarColor || '#1976d2',
      }));
    }
  }, [profile]);

  const handleChange = (field, value) => {
    let finalVal = value;
    if (field === 'fullName' && typeof value === 'string') {
      finalVal = capitalizeWordsInput(value);
    }
    setFormData((prev) => ({
      ...prev,
      [field]: finalVal,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field) => {
    if (field === 'fullName') {
      setFormData((prev) => ({
        ...prev,
        fullName: capitalizeName(prev.fullName),
      }));
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setErrors({});

    const formattedFullName = capitalizeName(formData.fullName);
    const newErrors = {};
    if (!formattedFullName) {
      newErrors.fullName = 'Full name is required.';
    }

    if (formData.password && formData.password.trim()) {
      if (formData.password.trim().length < 6) {
        newErrors.password = 'Password must be at least 6 characters.';
      }
      if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your new password.';
      } else if (formData.password.trim() !== formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    } else if (formData.confirmPassword && formData.confirmPassword.trim()) {
      newErrors.password = 'Please enter a new password.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        fullName: formattedFullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        username: formData.username,
        bio: formData.bio,
        avatarColor: formData.avatarColor,
      };
      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await updateProfile(payload);
      if (res.success) {
        setFormData((prev) => ({
          ...prev,
          password: '',
          confirmPassword: '',
        }));
        setSnackbar({
          open: true,
          message: payload.password
            ? 'Profile and password updated successfully.'
            : 'Profile updated successfully.',
          severity: 'success',
        });
      } else {
        const msg = res.message || 'Failed to update profile.';
        const lower = msg.toLowerCase();
        if (lower.includes('email')) {
          setErrors({ email: msg });
        } else if (lower.includes('username')) {
          setErrors({ username: msg });
        } else if (lower.includes('name')) {
          setErrors({ fullName: msg });
        } else if (lower.includes('password')) {
          setErrors({ password: msg });
        } else if (lower.includes('phone') || lower.includes('mobile')) {
          setErrors({ phoneNumber: msg });
        } else {
          setSnackbar({
            open: true,
            message: msg,
            severity: 'error',
          });
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error updating profile.';
      const lower = msg.toLowerCase();
      if (lower.includes('email')) {
        setErrors({ email: msg });
      } else if (lower.includes('username')) {
        setErrors({ username: msg });
      } else if (lower.includes('name')) {
        setErrors({ fullName: msg });
      } else if (lower.includes('password')) {
        setErrors({ password: msg });
      } else if (lower.includes('phone') || lower.includes('mobile')) {
        setErrors({ phoneNumber: msg });
      } else {
        setSnackbar({
          open: true,
          message: msg,
          severity: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
        username: profile.username || '',
        password: '',
        confirmPassword: '',
        bio: profile.bio || '',
        avatarColor: profile.avatarColor || '#1976d2',
      });
      setSnackbar({
        open: true,
        message: 'Form reset to saved details.',
        severity: 'info',
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1200, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
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
                  error={Boolean(errors.fullName)}
                  helperText={errors.fullName || ''}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  inputProps={{ style: { textTransform: 'capitalize' } }}
                  placeholder="e.g. John Doe"
                />
              </Grid>

              {/* Username */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  error={Boolean(errors.username)}
                  helperText={errors.username || ''}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="e.g. johndoe"
                />
              </Grid>

              {/* Email Address */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  value={formData.email}
                  disabled
                  helperText="Personal email cannot be changed"
                  placeholder="e.g. john@example.com"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>

              {/* Phone Number */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phoneNumber}
                  error={Boolean(errors.phoneNumber)}
                  helperText={errors.phoneNumber || ''}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  placeholder="e.g. +91 9876543210"
                />
              </Grid>

              {/* Change Password */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Change Password"
                  value={formData.password}
                  error={Boolean(errors.password)}
                  helperText={errors.password || 'Leave blank to keep current password'}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  autoComplete="new-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Confirm Password */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword || (formData.password ? 'Re-enter new password to confirm' : '')}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
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
                  label="Bio / Notes"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Add a brief description about yourself or notes for this account..."
                  sx={{
                    '& .MuiInputBase-root': {
                      minHeight: '83px',
                      alignItems: 'flex-start',
                    },
                    '& textarea': {
                      height: '83px !important',
                      minHeight: '83px !important',
                      boxSizing: 'border-box',
                      overflow: 'auto',
                    },
                  }}
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
                Reset to Saved
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
