import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
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
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');

  const initialToken = paramToken || queryToken || '';

  const { verifyResetToken, resetPassword } = useAuth();

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [verifying, setVerifying] = useState(Boolean(initialToken));
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const tokenRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Auto-verify token on mount if provided in URL
  useEffect(() => {
    let isMounted = true;

    if (initialToken) {
      const verify = async () => {
        try {
          setVerifying(true);
          setError('');
          const res = await verifyResetToken(initialToken);
          if (isMounted) {
            if (res.success) {
              setTokenValid(true);
              setUserEmail(res.email || '');
            } else {
              setTokenValid(false);
              setError(res.message || 'Password reset link is invalid or has expired.');
            }
          }
        } catch (err) {
          if (isMounted) {
            setTokenValid(false);
            setError(err.message || 'Failed to verify reset token.');
          }
        } finally {
          if (isMounted) setVerifying(false);
        }
      };

      verify();
    }

    return () => {
      isMounted = false;
    };
  }, [initialToken, verifyResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newErrors = {};
    const activeToken = token.trim();

    if (!activeToken) {
      newErrors.token = 'Reset token is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.token && tokenRef.current) tokenRef.current.focus();
      else if (newErrors.newPassword && newPasswordRef.current) newPasswordRef.current.focus();
      else if (newErrors.confirmPassword && confirmPasswordRef.current) confirmPasswordRef.current.focus();
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await resetPassword(activeToken, newPassword);

      if (res.success) {
        setSuccessMsg('Your password has been reset successfully! Redirecting to sign in...');
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Password reset successfully! Please sign in with your new password.' },
            replace: true,
          });
        }, 1500);
      } else {
        setError(res.message || 'Failed to reset password. The link or token may have expired.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create New Password"
      subtitle={userEmail ? `Resetting password for ${userEmail}` : 'Enter your new credentials below'}
      maxWidth={620}
    >
      {verifying && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1.5 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Verifying reset link...
          </Typography>
        </Box>
      )}

      {!verifying && (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert
              icon={<CheckCircleIcon fontSize="inherit" />}
              severity="success"
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              {successMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Token field (only if not already verified or no initial token provided) */}
            {(!initialToken || !tokenValid) && (
              <TextField
                fullWidth
                label="Reset Token"
                name="token"
                placeholder="Paste token or code from reset email"
                value={token}
                onChange={(e) => {
                  setError('');
                  if (errors.token) setErrors((prev) => ({ ...prev, token: '' }));
                  setToken(e.target.value);
                }}
                inputRef={tokenRef}
                error={Boolean(errors.token)}
                helperText={errors.token || ''}
                required
                disabled={loading}
                sx={{ mb: 2.5 }}
              />
            )}

            {/* New Password */}
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="New Password"
              name="newPassword"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => {
                setError('');
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                setNewPassword(e.target.value);
              }}
              inputRef={newPasswordRef}
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword || ''}
              required
              disabled={loading}
              sx={{ mb: 2.5 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle new password visibility"
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

            {/* Confirm New Password */}
            <TextField
              fullWidth
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm New Password"
              name="confirmPassword"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => {
                setError('');
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                setConfirmPassword(e.target.value);
              }}
              inputRef={confirmPasswordRef}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword || ''}
              required
              disabled={loading}
              sx={{ mb: 3 }}
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

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
              sx={{
                py: 1.3,
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              }}
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </Button>
          </Box>
        </>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Back to Login */}
      <Box sx={{ textAlign: 'center' }}>
        <Link
          component={RouterLink}
          to="/login"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontWeight: 600,
            color: 'primary.main',
            textDecoration: 'none',
            fontSize: '0.9rem',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ArrowBackIcon fontSize="small" /> Back to Sign In
        </Link>
      </Box>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
