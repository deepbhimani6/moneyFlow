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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const location = useLocation();

  // Dynamically determine current active page title from URL
  const getPageTitle = () => {
    if (location.pathname.startsWith('/profile')) return 'Profile';
    if (location.pathname.startsWith('/for-self')) return 'For Self';
    if (location.pathname.startsWith('/to-receive') || location.pathname.startsWith('/entries')) return 'To Receive';
    if (location.pathname.startsWith('/to-pay') || location.pathname.startsWith('/topay')) return 'To Pay';
    if (location.pathname.startsWith('/members')) return 'Members';
    if (location.pathname.startsWith('/users')) return 'Users';
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
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { lg: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
                {getPageTitle()}
              </Typography>
            </Box>

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
