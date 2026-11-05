import React, { useState, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [devToken, setDevToken] = useState('');

  const emailRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (emailRef.current) emailRef.current.focus();
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await forgotPassword(email.trim());

      if (res.success) {
        setSentSuccess(true);
        setSentEmail(email.trim());
        if (res.resetToken) {
          setDevToken(res.resetToken);
        }
      } else {
        setError(res.message || 'Unable to process reset request.');
      }
    } catch (err) {
      setError(err.message || 'Unable to process reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email to receive password reset instructions"
      maxWidth={620}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {sentSuccess ? (
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'success.light',
              color: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 36 }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Check Your Email
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            We've sent a 6-digit password reset code to{' '}
            <strong style={{ color: '#0f172a' }}>{sentEmail}</strong>. Please check your inbox and spam folder.
          </Typography>

          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate('/reset-password')}
            sx={{
              py: 1.2,
              fontWeight: 700,
              mb: 2,
              borderRadius: 2,
            }}
          >
            Enter Reset Code & Set Password
          </Button>

          <Button
            variant="text"
            fullWidth
            onClick={() => {
              setSentSuccess(false);
              setEmail('');
              setErrors({});
            }}
            sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
          >
            Did not receive email? Try again
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
            Don't worry! Enter the email address associated with your MoneyFlow account, and we will send you a secure link to reset your password.
          </Typography>

          {/* Email Address */}
          <TextField
            fullWidth
            type="email"
            label="E-mail"
            name="email"
            placeholder="e.g. john@example.com"
            value={email}
            onChange={(e) => {
              setError('');
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              setEmail(e.target.value);
            }}
            inputRef={emailRef}
            error={Boolean(errors.email)}
            helperText={errors.email || ''}
            autoComplete="email"
            autoFocus
            required
            disabled={loading}
            sx={{ mb: 3 }}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            sx={{
              py: 1.3,
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            }}
          >
            {loading ? 'Sending Instructions...' : 'Send Reset Link'}
          </Button>
        </Box>
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

export default ForgotPasswordPage;
