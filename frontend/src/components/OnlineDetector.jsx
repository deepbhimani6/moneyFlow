import React, { useState, useEffect } from 'react';
import { Alert, Box } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import AppToast from './AppToast';

const OnlineDetector = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnlineToast, setShowBackOnlineToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnlineToast(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {!isOnline && (
        <Box sx={{ width: '100%', position: 'sticky', top: 0, zIndex: 9999 }}>
          <Alert
            severity="error"
            icon={<WifiOffIcon />}
            sx={{ borderRadius: 0, fontWeight: 500 }}
          >
            <strong>No Internet Connection:</strong> MoneyFlow works online-only to sync directly with MongoDB. Actions are temporarily paused until you reconnect.
          </Alert>
        </Box>
      )}

      <AppToast
        open={showBackOnlineToast}
        onClose={() => setShowBackOnlineToast(false)}
        message="Back online. Connected to MongoDB."
        severity="success"
      />
    </>
  );
};

export default OnlineDetector;
