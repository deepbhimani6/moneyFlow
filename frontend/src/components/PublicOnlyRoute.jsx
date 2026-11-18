import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();
  const initialCheckRef = useRef(true);

  // If opening from email with a pre-existing session in storage, clear it ONCE on initial mount only
  useEffect(() => {
    if (initialCheckRef.current) {
      initialCheckRef.current = false;
      const searchParams = new URLSearchParams(location.search);
      const isFromMail =
        searchParams.get('from') === 'mail' ||
        searchParams.get('source') === 'mail' ||
        searchParams.get('mail') === 'true' ||
        searchParams.get('invited') === 'true' ||
        searchParams.get('invite') === 'true';

      if (isFromMail && localStorage.getItem('moneyflow_token')) {
        logout();
      }
    }
  }, []); // Run ONCE on mount, NEVER when isAuthenticated changes after login

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={36} thickness={4} />
      </Box>
    );
  }

  // Once authenticated (or upon successful login), immediately redirect to dashboard or original target
  if (isAuthenticated) {
    const origin =
      location.state?.from?.pathname && location.state.from.pathname !== '/login'
        ? location.state.from.pathname
        : '/dashboard';
    return <Navigate to={origin} replace />;
  }

  return children;
};

export default PublicOnlyRoute;
