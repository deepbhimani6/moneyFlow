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
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LogoutIcon from '@mui/icons-material/Logout';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'for-self', path: '/for-self', label: 'For Self', icon: <AccountCircleIcon /> },
  { id: 'to-receive', path: '/to-receive', label: 'To Receive', icon: <CallReceivedIcon /> },
  { id: 'to-pay', path: '/to-pay', label: 'To Pay', icon: <PaymentIcon /> },
  { id: 'members', path: '/members', label: 'Members', icon: <PeopleAltIcon /> },
];

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { profile, initials } = useProfile();
  const { logout } = useAuth();

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
        onClick={() => {
          navigate('/dashboard');
          if (onMobileClose) onMobileClose();
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
            flexShrink: 0,
          }}
        >
          <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
          MoneyFlow
        </Typography>
      </Box>

      <Divider />

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

      {/* User Profile Mini Footer */}
      <Box sx={{ mt: 'auto', p: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ListItemButton
          selected={currentPath === '/profile'}
          onClick={() => {
            navigate('/profile');
            if (onMobileClose) onMobileClose();
          }}
          sx={{
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexGrow: 1,
            overflow: 'hidden',
            border: currentPath === '/profile' ? '1.5px solid #1976d2' : '1.5px solid transparent',
            backgroundColor: currentPath === '/profile' ? 'rgba(25, 118, 210, 0.08) !important' : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          <Avatar
            alt={profile?.fullName || 'User'}
            sx={{
              width: 36,
              height: 36,
              bgcolor: profile?.avatarColor || 'primary.main',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
              {profile?.fullName || 'Deep Bhimani'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem' }} noWrap>
              {profile?.role || 'Admin'}
            </Typography>
          </Box>
        </ListItemButton>

        <Tooltip title="Sign Out">
          <IconButton
            size="small"
            aria-label="Sign out"
            onClick={() => {
              logout();
              if (onMobileClose) onMobileClose();
              navigate('/login', { replace: true });
            }}
            sx={{
              color: 'text.secondary',
              p: 1,
              '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.08)' },
            }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="navigation tabs"
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
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
