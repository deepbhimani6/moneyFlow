import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Link,
  Divider,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    rememberMe: true,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(location.state?.message || '');
  const [successMsg, setSuccessMsg] = useState('');

  const identifierRef = useRef(null);
  const passwordRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newErrors = {};
    if (!formData.identifier || !formData.identifier.trim()) {
      newErrors.identifier = 'Email or username is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.identifier && identifierRef.current) {
        identifierRef.current.focus();
      } else if (newErrors.password && passwordRef.current) {
        passwordRef.current.focus();
      }
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await login(formData.identifier.trim(), formData.password);

      if (res.success) {
        setSuccessMsg('Signed in successfully! Redirecting...');
        const origin = location.state?.from?.pathname || '/dashboard';
        setTimeout(() => {
          navigate(origin, { replace: true });
        }, 400);
      } else {
        setError(res.message || 'Invalid email/username or password. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your MoneyFlow account to continue"
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
        {/* Email or Username */}
        <TextField
          fullWidth
          label="Email or Username"
          name="identifier"
          placeholder="e.g. john@example.com or johndoe"
          value={formData.identifier}
          onChange={handleChange}
          inputRef={identifierRef}
          error={Boolean(errors.identifier)}
          helperText={errors.identifier || ''}
          autoComplete="username"
          autoFocus
          required
          disabled={loading}
          sx={{ mb: 2.5 }}
        />

        {/* Password */}
        <TextField
          fullWidth
          type={showPassword ? 'text' : 'password'}
          label="Password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          inputRef={passwordRef}
          error={Boolean(errors.password)}
          helperText={errors.password || ''}
          autoComplete="current-password"
          required
          disabled={loading}
          sx={{ mb: 1.5 }}
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

        {/* Remember Me & Forgot Password Row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2.5,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                Remember me
              </Typography>
            }
          />

          <Link
            component={RouterLink}
            to="/forgot-password"
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Forgot password?
          </Link>
        </Box>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
          sx={{
            py: 1.3,
            fontSize: '1rem',
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
          }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
            OR
          </Typography>
        </Divider>

        {/* Register / Sign Up Link */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Don't have an account yet?{' '}
            <Link
              component={RouterLink}
              to="/register"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Sign Up
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default LoginPage;
