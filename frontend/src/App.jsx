import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GetAppIcon from '@mui/icons-material/GetApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import theme from './theme';
import Sidebar from './components/Sidebar';
import OnlineDetector from './components/OnlineDetector';
import DashboardPage from './pages/DashboardPage';
import ForSelfPage from './pages/ForSelfPage';
import ToReceivePage from './pages/ToReceivePage';
import ToPayPage from './pages/ToPayPage';
import MembersPage from './pages/MembersPage';

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const location = useLocation();

  // Dynamically determine current active page title from URL
  const getPageTitle = () => {
    if (location.pathname.startsWith('/for-self')) return 'For Self';
    if (location.pathname.startsWith('/to-receive') || location.pathname.startsWith('/entries')) return 'To Receive';
    if (location.pathname.startsWith('/to-pay') || location.pathname.startsWith('/topay')) return 'To Pay';
    if (location.pathname.startsWith('/members')) return 'Members';
    return 'Dashboard';
  };

  // Listen for PWA install prompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Online only alert indicator */}
      <OnlineDetector />

      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Navigation Sidebar with URL Route Sync */}
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Header Bar */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: 'background.paper',
              color: 'text.primary',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2, display: { sm: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
                  {getPageTitle()}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Online PWA status badge */}
                <Chip
                  icon={<CheckCircleIcon sx={{ '&&': { color: '#2e7d32', fontSize: 16 } }} />}
                  label="MongoDB Online"
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: '#a5d6a7', bgcolor: '#f1f8e9', display: { xs: 'none', sm: 'inline-flex' } }}
                />

                {/* PWA Install Button if available */}
                {installPrompt && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<GetAppIcon />}
                    onClick={handleInstallClick}
                    sx={{ textTransform: 'none' }}
                  >
                    Install PWA
                  </Button>
                )}
              </Box>
            </Toolbar>
          </AppBar>

          {/* Active Screen Routes */}
          <Box sx={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/for-self" element={<ForSelfPage />} />
              <Route path="/to-receive" element={<ToReceivePage />} />
              <Route path="/entries" element={<Navigate to="/to-receive" replace />} />
              <Route path="/to-pay" element={<ToPayPage />} />
              <Route path="/borrowed" element={<Navigate to="/to-pay" replace />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
