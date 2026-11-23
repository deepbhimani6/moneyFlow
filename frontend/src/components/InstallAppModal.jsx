import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';

const InstallAppModal = ({ open, onClose }) => {
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

  const isIOS =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, fontWeight: 700 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GetAppIcon sx={{ fontSize: 22 }} />
        </Box>
        Install MoneyFlow App
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
        {isStandalone ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              App Already Installed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MoneyFlow is already installed and running on your device. You can access it directly from your home screen or app drawer anytime.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Install MoneyFlow on your phone or computer for instant access, offline mode, and a fast native app experience.
            </Typography>

            {isIOS && (
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <IosShareIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    iOS / Safari:
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  1. Tap the <strong>Share</strong> button at the bottom of Safari.<br />
                  2. Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.<br />
                  3. Tap <strong>&quot;Add&quot;</strong> in the top right corner.
                </Typography>
              </Box>
            )}

            {isAndroid && (
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MoreVertIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Android / Chrome:
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  1. Tap the three dots menu <strong>(⋮)</strong> in Chrome.<br />
                  2. Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.<br />
                  3. Confirm to add the MoneyFlow icon to your home screen.
                </Typography>
              </Box>
            )}

            {!isIOS && !isAndroid && (
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LaptopMacIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Desktop (Chrome / Edge / Brave):
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  Click the <strong>Install icon (⊕)</strong> on the right side of your browser&apos;s address bar, or open the browser menu and select <strong>&quot;Install MoneyFlow&quot;</strong>.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ textTransform: 'none', borderRadius: 2 }}>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstallAppModal;
