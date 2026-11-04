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
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const drawerWidth = 240;

const menuItems = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'entries', path: '/entries', label: 'Entries', icon: <ReceiptLongIcon /> },
  { id: 'to-pay', path: '/to-pay', label: 'To Pay', icon: <PaymentIcon /> },
  { id: 'members', path: '/members', label: 'Members', icon: <PeopleAltIcon /> },
];

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
        onClick={() => {
          navigate('/dashboard');
          if (onMobileClose) onMobileClose();
        }}
      >
        <AccountBalanceWalletIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
          MoneyFlow
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 2 }}>
        {menuItems.map((item) => {
          const isActive = currentPath === item.path || (item.path === '/dashboard' && currentPath === '/');
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
