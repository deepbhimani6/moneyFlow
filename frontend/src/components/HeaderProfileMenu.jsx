import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Divider } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";

const HeaderProfileMenu = () => {
  const navigate = useNavigate();
  const { profile, initials } = useProfile();
  const { logout } = useAuth();
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

  const handleLogout = () => {
    handleClose();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <Box
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Account profile menu"
        aria-controls={open ? "profile-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          p: 0.5,
          pr: { lg: 1.25 },
          borderRadius: "24px",
          transition: "all 0.2s ease-in-out",
          backgroundColor: open ? "rgba(25, 118, 210, 0.13)" : "rgba(25, 118, 210, 0.07)",
          border: open ? "1px solid rgba(25, 118, 210, 0.32)" : "1px solid rgba(25, 118, 210, 0.18)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.14)",
            borderColor: "rgba(25, 118, 210, 0.36)",
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.15)",
          },
          "&:focus-visible": {
            outline: "2px solid #1976d2",
          },
        }}
      >
        <Avatar
          alt={profile?.fullName || "User"}
          sx={{
            width: 36,
            height: 36,
            bgcolor: profile?.avatarColor || "primary.main",
            color: "#ffffff",
            fontSize: "0.95rem",
            fontWeight: 700,
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            border: "2px solid #ffffff",
          }}
        >
          {initials}
        </Avatar>

        {/* Name on medium screens and up */}
        <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, color: "text.primary", maxWidth: 120, textTransform: "capitalize" }} noWrap>
            {profile?.fullName || "User"}
          </Typography>
          {profile?.email && (
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem", lineHeight: 1, maxWidth: 120 }} noWrap>
              {profile.email}
            </Typography>
          )}
        </Box>

        <ArrowDropDownIcon
          sx={{
            display: { xs: "none", md: "block" },
            color: "text.secondary",
            fontSize: 20,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>

      {/* Profile Dropdown Menu */}
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 6,
          sx: {
            mt: 1.2,
            width: 260,
            borderRadius: 2.5,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            overflow: "hidden",
          },
        }}
      >
        {/* User preview header in menu */}
        <Box
          sx={{
            p: 2,
            background: "linear-gradient(135deg, rgba(25, 118, 210, 0.06) 0%, rgba(156, 39, 176, 0.04) 100%)",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Avatar
            alt={profile?.fullName || "User"}
            sx={{
              width: 44,
              height: 44,
              bgcolor: profile?.avatarColor || "primary.main",
              color: "#ffffff",
              fontSize: "1.05rem",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              border: "2px solid #ffffff",
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "capitalize" }} noWrap>
              {profile?.fullName || "User"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }} noWrap>
              {profile?.email || "user@example.com"}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => handleNavigate("/profile")}
          sx={{
            py: 1.2,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            "&:hover": { bgcolor: "rgba(25, 118, 210, 0.08)" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
            <ListItemIcon sx={{ color: "primary.main", minWidth: "auto" }}>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="My Profile" secondary="Manage account & profile" primaryTypographyProps={{ fontWeight: 600, fontSize: "0.9rem" }} secondaryTypographyProps={{ fontSize: "0.75rem" }} sx={{ m: 0 }} />
          </Box>
          <ChevronRightIcon sx={{ color: "text.secondary", fontSize: 18, ml: 1, flexShrink: 0 }} />
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={handleLogout}
          sx={{
            py: 1.2,
            px: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: "error.main",
            "&:hover": { bgcolor: "rgba(211, 47, 47, 0.08)" },
          }}
        >
          <ListItemIcon sx={{ color: "error.main", minWidth: "auto" }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 600, fontSize: "0.9rem", color: "error.main" }} sx={{ m: 0 }} />
        </MenuItem>
      </Menu>
    </>
  );
};

export default HeaderProfileMenu;
