import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  AppBar,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GetAppIcon from '@mui/icons-material/GetApp';
import theme from './theme';
import Sidebar from './components/Sidebar';
import OnlineDetector from './components/OnlineDetector';
import HeaderProfileMenu from './components/HeaderProfileMenu';
import NotificationBell from './components/NotificationBell';
import MobileBottomNav from './components/MobileBottomNav';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Main App Pages
import DashboardPage from './pages/DashboardPage';
import ForSelfPage from './pages/ForSelfPage';
import ToReceivePage from './pages/ToReceivePage';
import ToPayPage from './pages/ToPayPage';
import MembersPage from './pages/MembersPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';

const drawerWidth = 240;

function MainAppLayout() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const navigate = useNavigate();

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Sidebar (Desktop permanent drawer) */}
      <Sidebar />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          overflowX: 'hidden',
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
            {/* Logo on responsive (where page name used to be) */}
            <Box
              onClick={() => navigate('/dashboard')}
              sx={{
                display: { xs: 'flex', lg: 'none' },
                alignItems: 'center',
                gap: 1.25,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(25, 118, 210, 0.28)',
                  flexShrink: 0,
                }}
              >
                <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  fontSize: '1.15rem',
                  color: '#1e293b',
                }}
              >
                MoneyFlow
              </Typography>
            </Box>

            {/* Desktop spacer: page title removed on all pages */}
            <Box sx={{ display: { xs: 'none', lg: 'block' } }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

              {/* Notification Bell */}
              <NotificationBell />

              {/* Header Right Profile Icon & Menu */}
              <HeaderProfileMenu />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Active Screen Routes */}
        <Box sx={{ flexGrow: 1, pb: { xs: 9, lg: 2 } }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/for-self" element={<ForSelfPage />} />
            <Route path="/to-receive" element={<ToReceivePage />} />
            <Route path="/entries" element={<Navigate to="/to-receive" replace />} />
            <Route path="/to-pay" element={<ToPayPage />} />
            <Route path="/borrowed" element={<Navigate to="/to-pay" replace />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Box>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <ProfileProvider>
          <CssBaseline />

          {/* Online only alert indicator */}
          <OnlineDetector />

          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={<Navigate to="/register" replace />}
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPasswordPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicOnlyRoute>
                  <ResetPasswordPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                <PublicOnlyRoute>
                  <ResetPasswordPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainAppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
