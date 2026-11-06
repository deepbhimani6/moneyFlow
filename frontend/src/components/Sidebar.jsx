import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const baseMenuItems = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'for-self', path: '/for-self', label: 'For Self', icon: <AccountCircleIcon /> },
  { id: 'to-receive', path: '/to-receive', label: 'To Receive', icon: <CallReceivedIcon /> },
  { id: 'to-pay', path: '/to-pay', label: 'To Pay', icon: <PaymentIcon /> },
  { id: 'members', path: '/members', label: 'Members', icon: <PeopleAltIcon /> },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { profile } = useProfile();
  const { user } = useAuth();

  const currentEmail = (profile?.email || user?.email || '').toLowerCase().trim();
  const isAdmin = currentEmail === 'deepbhimani6@gmail.com' || profile?.role === 'Admin' || user?.role === 'Admin';

  const menuItems = [
    ...baseMenuItems,
    ...(isAdmin ? [{ id: 'users', path: '/users', label: 'Users', icon: <ManageAccountsIcon /> }] : []),
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          height: { xs: 56, sm: 64 },
          minHeight: { xs: 56, sm: 64 },
          boxSizing: 'border-box',
          px: 2.5,
          py: { xs: '9px', sm: '13px' },
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.28)',
            flexShrink: 0,
          }}
        >
          <AccountBalanceWalletIcon sx={{ fontSize: 22 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
          MoneyFlow
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#e2e8f0' }} />

      <List sx={{ px: 1.5, py: 2 }}>
        {menuItems.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path === '/dashboard' && currentPath === '/') ||
            (item.path === '/to-receive' && currentPath === '/entries');
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  if (onMobileClose) onMobileClose();
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 2,
                  border: isActive ? '1.5px solid #1976d2' : '1.5px solid transparent',
                  backgroundColor: isActive ? 'rgba(25, 118, 210, 0.08) !important' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'primary.main' : 'text.primary',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { lg: drawerWidth },
        flexShrink: { lg: 0 },
        display: { xs: 'none', lg: 'block' },
      }}
      aria-label="navigation tabs"
    >
      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: '1px solid #e2e8f0',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
