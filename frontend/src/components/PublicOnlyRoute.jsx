import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isFromMail =
    searchParams.get('from') === 'mail' ||
    searchParams.get('source') === 'mail' ||
    searchParams.get('mail') === 'true' ||
    searchParams.get('invited') === 'true' ||
    searchParams.get('invite') === 'true';

  useEffect(() => {
    // If opening from an email (invite or notification), force logging out any existing session so verification with email & password is required
    if (isFromMail && isAuthenticated) {
      logout();
    }
  }, [isFromMail, isAuthenticated, logout]);

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

  // When link is opened from email, allow showing login page directly even if previously logged in
  if (isFromMail) {
    return children;
  }

  if (isAuthenticated) {
    const origin = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={origin} replace />;
  }

  return children;
};

export default PublicOnlyRoute;
