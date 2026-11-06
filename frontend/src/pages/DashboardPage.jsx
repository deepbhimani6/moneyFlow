import React, { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, CircularProgress, Paper, Stack } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { dashboardService } from "../services/api";
import { formatAmount } from "../utils/formatters";

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalExpenses: 0,
    pendingReceiveLoans: 0,
    pendingReceiveExpenses: 0,
    pendingReceiveTotal: 0,
    pendingPayLoans: 0,
    pendingPayExpenses: 0,
    toPayPaid: 0,
    totalAddBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const metricCards = [
    {
      id: "expenses",
      title: "Total Expenses",
      amount: stats.totalExpenses,
      color: "#d32f2f",
      bg: "rgba(211, 47, 47, 0.08)",
      icon: <TrendingDownIcon sx={{ fontSize: 24, color: "#d32f2f" }} />,
    },
    {
      id: "pending-receive-expenses",
      title: "Receive Expenses",
      amount: stats.pendingReceiveExpenses,
      color: "#ed6c02",
      bg: "rgba(237, 108, 2, 0.08)",
      icon: <PendingActionsIcon sx={{ fontSize: 24, color: "#ed6c02" }} />,
    },
    {
      id: "pending-receive-loans",
      title: "Receive Loans",
      amount: stats.pendingReceiveLoans,
      color: "#7b1fa2",
      bg: "rgba(123, 31, 162, 0.08)",
      icon: <MonetizationOnIcon sx={{ fontSize: 24, color: "#7b1fa2" }} />,
    },
    {
      id: "pending-pay-expenses",
      title: "Pay Expenses",
      amount: stats.pendingPayExpenses,
      color: "#e65100",
      bg: "rgba(230, 81, 0, 0.08)",
      icon: <PriceCheckIcon sx={{ fontSize: 24, color: "#e65100" }} />,
    },
    {
      id: "pending-pay-loans",
      title: "Pay Loans",
      amount: stats.pendingPayLoans,
      color: "#c2185b",
      bg: "rgba(194, 24, 91, 0.08)",
      icon: <ReceiptLongIcon sx={{ fontSize: 24, color: "#c2185b" }} />,
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1200, mx: "auto", width: "100%", boxSizing: "border-box" }}>
      {/* Top Header */}
      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: "1.25rem", sm: "1.5rem" }, color: "#0f172a" }}>
          Dashboard
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={36} />
        </Box>
      ) : (
        <Stack spacing={{ xs: 2, sm: 2.5 }} sx={{ width: "100%", boxSizing: "border-box" }}>
          {/* 1. Hero Total Balance Card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.25, sm: 3 },
              borderRadius: { xs: 3, sm: 4 },
              background: "linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)",
              color: "#ffffff",
              boxShadow: "0 8px 24px -4px rgba(25, 118, 210, 0.35)",
              position: "relative",
              overflow: "hidden",
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.85, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.78rem" }}>
                  Total Balance
                </Typography>
                <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 20, color: "#ffffff" }} />
                </Box>
              </Box>

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "2rem", sm: "2.5rem", md: "2.75rem" },
                  letterSpacing: "-0.5px",
                  mb: 0,
                }}
              >
                ₹ {formatAmount(stats.totalBalance)}
              </Typography>
            </Box>
          </Paper>

          {/* 2. Responsive Metric Cards Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, 1fr)",
                xsm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: { xs: 1.5, sm: 2 },
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {metricCards.map((card) => (
              <Card
                key={card.id}
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease",
                  bgcolor: "#ffffff",
                  boxSizing: "border-box",
                  "&:hover": {
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, pb: { xs: "14px !important", sm: "16px !important" } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Box
                      sx={{
                        width: { xs: 32, sm: 36 },
                        height: { xs: 32, sm: 36 },
                        borderRadius: 2,
                        bgcolor: card.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "#64748b",
                        fontSize: { xs: "0.74rem", sm: "0.82rem" },
                        lineHeight: 1.2,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {card.title}
                    </Typography>
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      color: card.color,
                      fontSize: { xs: "1.15rem", sm: "1.35rem" },
                      mt: 0.5,
                    }}
                  >
                    ₹ {formatAmount(card.amount)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default DashboardPage;
