import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isFromMail =
    searchParams.get('from') === 'mail' ||
    searchParams.get('source') === 'mail' ||
    searchParams.get('mail') === 'true' ||
    searchParams.get('invited') === 'true' ||
    searchParams.get('invite') === 'true';

  if (isFromMail) {
    if (localStorage.getItem('moneyflow_token')) {
      logout();
    }
    const emailParam = searchParams.get('email');
    const invitedParam = searchParams.get('invited');
    const params = new URLSearchParams();
    params.set('from', 'mail');
    if (invitedParam) params.set('invited', invitedParam);
    if (emailParam) params.set('email', emailParam);
    return <Navigate to={`/login?${params.toString()}`} replace />;
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(25, 118, 210, 0.3)',
              flexShrink: 0,
            }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            MoneyFlow
          </Typography>
        </Box>
        <CircularProgress size={32} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Loading your session...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
