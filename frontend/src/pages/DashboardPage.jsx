import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { dashboardService } from '../services/api';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalExpenses: 0,
    totalLoans: 0,
    totalReceived: 0,
    totalPending: 0,
    totalSplit: 0,
    totalAddBalance: 0,
    splitItemCount: 0,
    splitGroupCount: 0,
    splitPendingCount: 0,
    splitReceivedCount: 0,
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
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // 1. 2-column grid cards in requested order:
  // 1. Total Balance, 2. Total Expenses, 3. Total Loans, 4. Total Pending, 5. Total Received (col-span 2)
  const cards = [
    {
      id: 'balance',
      title: 'Total Balance',
      amount: stats.totalBalance,
      color: stats.totalBalance >= 0 ? '#1976d2' : '#d32f2f',
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 32, color: stats.totalBalance >= 0 ? '#1976d2' : '#d32f2f' }} />,
      subtitle: 'Net Available (Added + Received - Expenses - Loans)',
      gridProps: { xs: 12, sm: 6, md: 6 },
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      amount: stats.totalExpenses,
      color: '#d32f2f',
      icon: <TrendingDownIcon sx={{ fontSize: 32, color: '#d32f2f' }} />,
      subtitle: 'All recorded expenditures',
      gridProps: { xs: 12, sm: 6, md: 6 },
    },
    {
      id: 'loans',
      title: 'Total Loans',
      amount: stats.totalLoans,
      color: '#7b1fa2',
      icon: <MonetizationOnIcon sx={{ fontSize: 32, color: '#7b1fa2' }} />,
      subtitle: 'Active loans recorded',
      gridProps: { xs: 12, sm: 6, md: 6 },
    },
    {
      id: 'pending',
      title: 'Total Pending',
      amount: stats.totalPending,
      color: '#ed6c02',
      icon: <PendingActionsIcon sx={{ fontSize: 32, color: '#ed6c02' }} />,
      subtitle: 'Entries with Status: Pending',
      gridProps: { xs: 12, sm: 6, md: 6 },
    },
    {
      id: 'received',
      title: 'Total Received',
      amount: stats.totalReceived,
      color: '#2e7d32',
      icon: <TrendingUpIcon sx={{ fontSize: 32, color: '#2e7d32' }} />,
      subtitle: 'Entries with Status: Received',
      gridProps: { xs: 12, sm: 12, md: 12 }, // full column (col-span 2)
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Tooltip title="Refresh stats">
          <IconButton onClick={fetchStats} disabled={loading} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {/* 1. Main 2-Column Grid for KPI Cards */}
          {cards.map((card) => (
            <Grid item {...card.gridProps} key={card.id}>
              <Card
                sx={{
                  height: '100%',
                  p: 1.5,
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  },
                }}
              >
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {card.title}
                    </Typography>
                    {card.icon}
                  </Box>

                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: card.color,
                      mb: 0.5,
                    }}
                  >
                    ₹ {Number(card.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* 2. Total Group Split Obligations in full width & separated with count items grid */}
          <Grid item xs={12}>
            <Card
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(25, 118, 210, 0.03)',
                border: '1px solid rgba(25, 118, 210, 0.2)',
              }}
            >
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <CallSplitIcon color="primary" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Total Group Split Obligations
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Member split allocations across all shared expenses
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Count Items Grid */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        textAlign: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 0.5 }}>
                        <CallSplitIcon color="primary" sx={{ fontSize: 18 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                          Total Split Amount
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        ₹ {Number(stats.totalSplit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        textAlign: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 0.5 }}>
                        <ReceiptLongIcon color="action" sx={{ fontSize: 18 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                          Split Items Count
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {stats.splitItemCount || 0} Items
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        textAlign: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 0.5 }}>
                        <GroupIcon color="action" sx={{ fontSize: 18 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                          Active Split Groups
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {stats.splitGroupCount || 0} Groups
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
