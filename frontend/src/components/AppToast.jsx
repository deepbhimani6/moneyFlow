import React from 'react';
import { Snackbar, Alert } from '@mui/material';

/**
 * Standardized bottom-left toast notification preserving MUI severity color themes.
 */
const AppToast = ({
  open,
  message,
  severity = 'success',
  onClose,
  autoHideDuration = 4000,
}) => (
  <Snackbar
    open={open}
    autoHideDuration={autoHideDuration}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
  >
    <Alert severity={severity} sx={{ width: '100%' }}>
      {message}
    </Alert>
  </Snackbar>
);

export default AppToast;
