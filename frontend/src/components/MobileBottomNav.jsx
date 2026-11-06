import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { user } = useAuth();

  const currentEmail = (profile?.email || user?.email || '').toLowerCase().trim();
  const isAdmin = currentEmail === 'deepbhimani6@gmail.com' || profile?.role === 'Admin' || user?.role === 'Admin';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'For Self', path: '/for-self', icon: <AccountCircleIcon /> },
    { label: 'Receive', path: '/to-receive', icon: <CallReceivedIcon /> },
    { label: 'Pay', path: '/to-pay', icon: <PaymentIcon /> },
    { label: 'Members', path: '/members', icon: <PeopleAltIcon /> },
    ...(isAdmin ? [{ label: 'Users', path: '/users', icon: <ManageAccountsIcon /> }] : []),
  ];

  const getActiveIndex = () => {
    const current = location.pathname;
    const index = navItems.findIndex((item) => {
      if (item.path === '/dashboard' && current === '/') return true;
      if (item.path === '/to-receive' && current === '/entries') return true;
      if (item.path === '/to-pay' && current === '/borrowed') return true;
      if (item.path === '/members' && current.startsWith('/members')) return true;
      return item.path === current;
    });
    return index !== -1 ? index : 0;
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        display: { xs: 'block', lg: 'none' },
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <BottomNavigation
        showLabels
        value={getActiveIndex()}
        onChange={(_, newIndex) => {
          if (navItems[newIndex]) {
            navigate(navItems[newIndex].path);
          }
        }}
        sx={{
          height: 60,
          backgroundColor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            padding: '4px 1px',
            color: '#64748b',
            transition: 'all 0.15s ease',
            '&.Mui-selected': {
              color: '#1976d2',
              fontWeight: 700,
              '& .MuiSvgIcon-root': {
                transform: 'scale(1.12)',
              },
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.68rem !important',
            fontWeight: 600,
            mt: 0.25,
            whiteSpace: 'nowrap',
          },
          '& .MuiSvgIcon-root': {
            fontSize: 21,
            transition: 'transform 0.15s ease',
          },
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
