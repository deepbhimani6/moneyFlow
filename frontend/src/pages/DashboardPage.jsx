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
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CallSplitIcon from '@mui/icons-material/CallSplit';
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

  const cards = [
    {
      title: 'Total Balance',
      amount: stats.totalBalance,
      color: stats.totalBalance >= 0 ? '#1976d2' : '#d32f2f',
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 32, color: stats.totalBalance >= 0 ? '#1976d2' : '#d32f2f' }} />,
      subtitle: 'Net Available (Added + Received - Expenses - Loans)',
    },
    {
      title: 'Total Received',
      amount: stats.totalReceived,
      color: '#2e7d32',
      icon: <TrendingUpIcon sx={{ fontSize: 32, color: '#2e7d32' }} />,
      subtitle: 'Entries with Status: Received',
    },
    {
      title: 'Total Pending',
      amount: stats.totalPending,
      color: '#ed6c02',
      icon: <PendingActionsIcon sx={{ fontSize: 32, color: '#ed6c02' }} />,
      subtitle: 'Entries with Status: Pending',
    },
    {
      title: 'Total Expenses',
      amount: stats.totalExpenses,
      color: '#d32f2f',
      icon: <TrendingDownIcon sx={{ fontSize: 32, color: '#d32f2f' }} />,
      subtitle: 'All recorded expenditures',
    },
    {
      title: 'Total Loans',
      amount: stats.totalLoans,
      color: '#7b1fa2',
      icon: <MonetizationOnIcon sx={{ fontSize: 32, color: '#7b1fa2' }} />,
      subtitle: 'Active loans recorded',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
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
        <Grid container spacing={3}>
          {cards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  p: 1.5,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  },
                }}
              >
                <CardContent>
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

          {/* Additional Quick Stats Card for Group Splits */}
          <Grid item xs={12} sm={6} md={8}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(25, 118, 210, 0.04)', borderColor: 'rgba(25, 118, 210, 0.2)', display: 'flex', alignItems: 'center' }}>
              <CardContent sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CallSplitIcon color="primary" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Total Group Split Obligations
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Member split allocations across all shared expenses
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ₹ {Number(stats.totalSplit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
