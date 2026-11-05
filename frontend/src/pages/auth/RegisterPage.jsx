import React, { useState, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Link,
  Divider,
  Grid,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { capitalizeName, capitalizeWordsInput } from '../../utils/formatters';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'fullName' && typeof value === 'string') {
      value = capitalizeWordsInput(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
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

    if (!formattedFullName) {
      newErrors.fullName = 'Full name is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.fullName && fullNameRef.current) fullNameRef.current.focus();
      else if (newErrors.email && emailRef.current) emailRef.current.focus();
      else if (newErrors.password && passwordRef.current) passwordRef.current.focus();
      else if (newErrors.confirmPassword && confirmPasswordRef.current) confirmPasswordRef.current.focus();
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await register({
        fullName: formattedFullName,
        email: formData.email.trim(),
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
      });

      if (res.success) {
        setSuccessMsg('Account created successfully.');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      } else {
        const msg = res.message || 'Registration failed.';
        setError(msg);
        if (msg.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: msg }));
        }
      }
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      setError(msg);
      if (msg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create an Account"
      subtitle="Join MoneyFlow to easily manage and track personal finances"
      maxWidth={620}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2.5}>
          {/* 1. Full Name */}
          <Grid item xs={12}>
            <TextField
              label="Full Name"
              name="fullName"
              placeholder="e.g. John Doe"
              value={formData.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
              inputProps={{ style: { textTransform: 'capitalize' } }}
              inputRef={fullNameRef}
              error={Boolean(errors.fullName)}
              helperText={errors.fullName || ''}
              fullWidth
              required
              disabled={loading}
            />
          </Grid>

          {/* 2. E-mail */}
          <Grid item xs={12}>
            <TextField
              label="E-mail"
              name="email"
              type="email"
              placeholder="e.g. john@example.com"
              value={formData.email}
              onChange={handleChange}
              inputRef={emailRef}
              error={Boolean(errors.email)}
              helperText={errors.email || ''}
              fullWidth
              required
              disabled={loading}
            />
          </Grid>

          {/* 3. Username */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Username"
              name="username"
              placeholder="e.g. johndoe"
              value={formData.username}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
          </Grid>

          {/* 4. Phone Number */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              name="phoneNumber"
              placeholder="e.g. +91 9876543210"
              value={formData.phoneNumber}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
          </Grid>

          {/* 5. Password */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              inputRef={passwordRef}
              error={Boolean(errors.password)}
              helperText={errors.password || ''}
              fullWidth
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* 6. Confirm Password */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              inputRef={confirmPasswordRef}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword || ''}
              fullWidth
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      size="small"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <HowToRegIcon />}
          sx={{
            mt: 3.5,
            py: 1.3,
            fontSize: '1rem',
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
          }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
            ALREADY REGISTERED?
          </Typography>
        </Divider>

        {/* Back to Sign In */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Already have an account?{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default RegisterPage;
