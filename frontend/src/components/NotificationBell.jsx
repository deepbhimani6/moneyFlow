import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  Divider,
  List,
  ListItem,
  Chip,
  Tooltip,
  Button,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { notificationService } from "../services/api";
import { formatDate, formatTime } from "../utils/formatters";

const formatRelativeTime = (createdAt, fallbackDate, fallbackTime) => {
  if (createdAt) {
    const createdDate = new Date(createdAt);
    if (!isNaN(createdDate.getTime())) {
      const diffMs = Date.now() - createdDate.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      if (diffSec < 60) return "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay === 1) return "Yesterday";
      if (diffDay < 7) return `${diffDay}d ago`;
    }
  }
  if (fallbackDate) {
    const formattedD = formatDate(fallbackDate);
    const formattedT = fallbackTime ? formatTime(fallbackTime) : "";
    return `${formattedD} ${formattedT}`.trim();
  }
  return "Recently";
};

const getNotificationIcon = (entryType) => {
  const typeLower = (entryType || "").toLowerCase();
  if (typeLower.includes("split")) {
    return {
      icon: <CallSplitIcon sx={{ fontSize: 18, color: "#1976d2" }} />,
      bg: "rgba(25, 118, 210, 0.12)",
      chipColor: "primary",
    };
  }
  if (typeLower.includes("loan")) {
    return {
      icon: <MonetizationOnIcon sx={{ fontSize: 18, color: "#9c27b0" }} />,
      bg: "rgba(156, 39, 176, 0.12)",
      chipColor: "secondary",
    };
  }
  if (typeLower.includes("balance")) {
    return {
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 18, color: "#2e7d32" }} />,
      bg: "rgba(46, 125, 50, 0.12)",
      chipColor: "success",
    };
  }
  if (typeLower.includes("expense") || typeLower.includes("to pay")) {
    return {
      icon: <TrendingDownIcon sx={{ fontSize: 18, color: "#ed6c02" }} />,
      bg: "rgba(237, 108, 2, 0.12)",
      chipColor: "warning",
    };
  }
  return {
    icon: <ReceiptLongIcon sx={{ fontSize: 18, color: "#1976d2" }} />,
    bg: "rgba(25, 118, 210, 0.12)",
    chipColor: "info",
  };
};

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState(0); // 0 = All, 1 = Unread

  const open = Boolean(anchorEl);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await notificationService.getNotifications({ limit: 50 });
      if (res && res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn("[Notification Fetch Error]:", err?.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Periodic polling every 20s
    const interval = setInterval(() => {
      fetchNotifications();
    }, 20000);

    // Refresh immediately when new entry/split is submitted in app
    const handleRefresh = () => fetchNotifications();
    window.addEventListener("moneyflow-entry-created", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("moneyflow-entry-created", handleRefresh);
    };
  }, [fetchNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(true);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      const target = notifications.find((n) => n._id === id);
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filterTab === 1 ? !n.read : true
  );

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          aria-label="Open notifications"
          aria-controls={open ? "notification-popover" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          sx={{
            width: 40,
            height: 40,
            transition: "all 0.2s ease-in-out",
            backgroundColor: open ? "rgba(25, 118, 210, 0.12)" : "rgba(25, 118, 210, 0.06)",
            border: open ? "1px solid rgba(25, 118, 210, 0.32)" : "1px solid rgba(25, 118, 210, 0.18)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            "&:hover": {
              backgroundColor: "rgba(25, 118, 210, 0.16)",
              transform: "translateY(-1px)",
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              "& .MuiBadge-badge": {
                fontWeight: 700,
                fontSize: "0.72rem",
                height: 18,
                minWidth: 18,
                padding: "0 4px",
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon sx={{ fontSize: 22, color: "#1976d2" }} />
            ) : (
              <NotificationsNoneIcon sx={{ fontSize: 22, color: "#555" }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id="notification-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          elevation: 6,
          sx: {
            width: { xs: 330, sm: 400 },
            maxWidth: "92vw",
            maxHeight: 560,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            mt: 1.2,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 1.75,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} New`}
                size="small"
                color="primary"
                sx={{
                  height: 20,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton
                  size="small"
                  onClick={handleMarkAllAsRead}
                  sx={{ color: "#1976d2", p: 0.5 }}
                >
                  <DoneAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={handleClose} sx={{ color: "#64748b", p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Filter Tabs */}
        <Box sx={{ borderBottom: "1px solid #f1f5f9", px: 2, backgroundColor: "#fff" }}>
          <Tabs
            value={filterTab}
            onChange={(_, val) => setFilterTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 38,
              "& .MuiTab-root": {
                minHeight: 38,
                fontSize: "0.82rem",
                fontWeight: 600,
                textTransform: "none",
                py: 0.5,
              },
            }}
          >
            <Tab label={`All (${notifications.length})`} />
            <Tab label={`Unread (${unreadCount})`} />
          </Tabs>
        </Box>

        {/* Notifications List */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", maxHeight: 420 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box
              sx={{
                py: 6,
                px: 3,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <NotificationsNoneIcon sx={{ fontSize: 44, color: "#cbd5e1" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#64748b" }}>
                {filterTab === 1 ? "No unread notifications" : "No notifications yet"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", maxWidth: 260 }}>
                When new split or expense entries are added in the app, you'll see details here.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredNotifications.map((notif, index) => {
                const config = getNotificationIcon(notif.entryType);
                return (
                  <React.Fragment key={notif._id || index}>
                    <ListItem
                      onClick={() => !notif.read && handleMarkAsRead(notif._id)}
                      sx={{
                        p: 1.5,
                        px: 2,
                        cursor: notif.read ? "default" : "pointer",
                        backgroundColor: notif.read ? "#ffffff" : "rgba(25, 118, 210, 0.04)",
                        transition: "background-color 0.2s ease",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                        position: "relative",
                        "&:hover": {
                          backgroundColor: notif.read
                            ? "#f8fafc"
                            : "rgba(25, 118, 210, 0.08)",
                          "& .delete-btn": { opacity: 1 },
                        },
                      }}
                    >
                      {/* Left Icon Badge */}
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: config.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          mt: 0.25,
                        }}
                      >
                        {config.icon}
                      </Box>

                      {/* Content */}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            mb: 0.25,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: notif.read ? 600 : 700,
                              color: "#1e293b",
                              fontSize: "0.86rem",
                              lineHeight: 1.3,
                            }}
                          >
                            {notif.title || "New Entry Added"}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: notif.read ? "#94a3b8" : "#1976d2",
                              fontSize: "0.72rem",
                              fontWeight: notif.read ? 400 : 600,
                              flexShrink: 0,
                            }}
                          >
                            {formatRelativeTime(notif.createdAt, notif.date, notif.time)}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{
                            color: "#475569",
                            fontSize: "0.82rem",
                            lineHeight: 1.4,
                            mb: 0.75,
                          }}
                        >
                          {notif.message}
                        </Typography>

                        {/* Highlighted Reason / "Why" Box */}
                        {notif.reason && (
                          <Box
                            sx={{
                              backgroundColor: "#f1f5f9",
                              borderLeft: "3px solid #1976d2",
                              py: 0.5,
                              px: 1,
                              borderRadius: "0 4px 4px 0",
                              mb: 0.75,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <InfoOutlinedIcon sx={{ fontSize: 14, color: "#64748b" }} />
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#334155",
                                fontWeight: 500,
                                fontSize: "0.75rem",
                                wordBreak: "break-word",
                              }}
                            >
                              <strong>Reason:</strong> {notif.reason}
                            </Typography>
                          </Box>
                        )}

                        {/* Amount & Type Badges */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {notif.amount ? (
                            <Chip
                              label={`₹${notif.amount}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                backgroundColor: "#e0f2fe",
                                color: "#0369a1",
                              }}
                            />
                          ) : null}

                          <Chip
                            label={notif.entryType || "Entry"}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              borderColor: "#e2e8f0",
                              color: "#64748b",
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Right Delete Button */}
                      <IconButton
                        size="small"
                        className="delete-btn"
                        onClick={(e) => handleDelete(notif._id, e)}
                        sx={{
                          opacity: { xs: 1, sm: 0 },
                          transition: "opacity 0.2s",
                          color: "#94a3b8",
                          p: 0.5,
                          "&:hover": { color: "#ef4444" },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                    {index < filteredNotifications.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1.25,
              px: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <Button
              size="small"
              onClick={handleClearAll}
              color="error"
              sx={{ textTransform: "none", fontSize: "0.78rem", fontWeight: 600 }}
            >
              Clear all
            </Button>
            <Button
              size="small"
              onClick={handleClose}
              sx={{ textTransform: "none", fontSize: "0.78rem" }}
            >
              Close
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;
