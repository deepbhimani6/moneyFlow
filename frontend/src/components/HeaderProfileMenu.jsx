import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useProfile } from '../context/ProfileContext';

const HeaderProfileMenu = () => {
  const navigate = useNavigate();
  const { profile, initials } = useProfile();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path) => {
    handleClose();
    navigate(path);
  };

  return (
    <>
      <Tooltip title={`Profile - ${profile?.fullName || 'User'}`} arrow>
        <Box
          onClick={handleClick}
          role="button"
          tabIndex={0}
          aria-label="Account profile menu"
          aria-controls={open ? 'profile-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            p: 0.5,
            pr: { xs: 0.5, md: 1.5 },
            borderRadius: 3,
            transition: 'all 0.2s ease-in-out',
            border: '1px solid transparent',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderColor: 'rgba(25, 118, 210, 0.2)',
            },
            '&:focus-visible': {
              outline: '2px solid #1976d2',
            },
          }}
        >
          <Avatar
            src={profile?.avatarUrl || undefined}
            alt={profile?.fullName || 'User'}
            sx={{
              width: 36,
              height: 36,
              bgcolor: profile?.avatarColor || 'primary.main',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              border: '2px solid #ffffff',
            }}
          >
            {initials}
          </Avatar>

          {/* Name & Role on medium screens and up */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'text.primary', maxWidth: 120 }} noWrap>
              {profile?.fullName || 'Deep Bhimani'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1 }}>
              {profile?.role || 'Admin'}
            </Typography>
          </Box>

          <ArrowDropDownIcon
            sx={{
              display: { xs: 'none', md: 'block' },
              color: 'text.secondary',
              fontSize: 20,
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </Box>
      </Tooltip>

      {/* Profile Dropdown Menu */}
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 6,
          sx: {
            mt: 1.2,
            minWidth: 260,
            borderRadius: 2.5,
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          },
        }}
      >
        {/* User preview header in menu */}
        <Box
          sx={{
            p: 2,
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.06) 0%, rgba(156, 39, 176, 0.04) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
          }}
          onClick={() => handleNavigate('/profile')}
        >
          <Avatar
            src={profile?.avatarUrl || undefined}
            alt={profile?.fullName || 'User'}
            sx={{
              width: 48,
              height: 48,
              bgcolor: profile?.avatarColor || 'primary.main',
              color: '#ffffff',
              fontSize: '1.15rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              border: '2px solid #ffffff',
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {profile?.fullName || 'Deep Bhimani'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
              {profile?.email || 'deep.bhimani@shunyavkash.com'}
            </Typography>
            <Chip
              label={profile?.role || 'Admin'}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                fontWeight: 600,
                bgcolor: 'primary.main',
                color: '#fff',
                mt: 0.5,
              }}
            />
          </Box>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => handleNavigate('/profile')}
          sx={{
            py: 1.2,
            px: 2,
            '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' },
          }}
        >
          <ListItemIcon sx={{ color: 'primary.main', minWidth: 36 }}>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="My Profile"
            secondary="Manage account & profile"
            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

export default HeaderProfileMenu;
