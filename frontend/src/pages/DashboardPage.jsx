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
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { dashboardService } from '../services/api';
import { formatAmount } from '../utils/formatters';

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
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // 6 KPI Blocks:
  // 1. Total Balance: For Self (Add balance) - Total Expenses - To Receive (Split, Loan & Expense (Status: Pending)) - To Pay (Loan & Expense (Status: Paid))
  // 2. Total Expenses: For Self (Expense, Split)
  // 3. Pending Receive Loans: To Receive (Type: Loan) (Status: Pending)
  // 4. Pending Receive Expenses: To Receive (Type: Split, Expenses) (Status: Pending)
  // 5. Pending Pay Loans: To Pay (Type: Loan) (Status: Pending)
  // 6. Pending Pay Expenses: To Pay (Type: Expenses) (Status: Pending)
  const cards = [
    {
      id: 'balance',
      title: 'Total Balance',
      amount: stats.totalBalance,
      color: stats.totalBalance >= 0 ? '#1976d2' : '#d32f2f',
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 32, color: stats.totalBalance >= 0 ? '#1976d2' : '#d32f2f' }} />,
      subtitle: 'For Self (Add balance) - Total Expenses - To Receive (Split, Loan & Expense (Status: Pending)) - To Pay (Loan & Expense (Status: Paid))',
      gridProps: { xs: 12, sm: 6, md: 6, lg: 4, xl: 4, '2xl': 4 },
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      amount: stats.totalExpenses,
      color: '#d32f2f',
      icon: <TrendingDownIcon sx={{ fontSize: 32, color: '#d32f2f' }} />,
      subtitle: 'For Self (Expense, Split)',
      gridProps: { xs: 12, sm: 6, md: 6, lg: 4, xl: 4, '2xl': 4 },
    },
    {
      id: 'pending-receive-loans',
      title: 'Pending Receive Loans',
      amount: stats.pendingReceiveLoans,
      color: '#7b1fa2',
      icon: <MonetizationOnIcon sx={{ fontSize: 32, color: '#7b1fa2' }} />,
      subtitle: 'To Receive (Type: Loan) (Status: Pending)',
      gridProps: { xs: 12, sm: 6, md: 6, lg: 4, xl: 4, '2xl': 4 },
    },
    {
      id: 'pending-receive-expenses',
      title: 'Pending Receive Expenses',
      amount: stats.pendingReceiveExpenses,
      color: '#ed6c02',
      icon: <PendingActionsIcon sx={{ fontSize: 32, color: '#ed6c02' }} />,
      subtitle: 'To Receive (Type: Split, Expenses) (Status: Pending)',
      gridProps: { xs: 12, sm: 6, md: 6, lg: 4, xl: 4, '2xl': 4 },
    },
    {
      id: 'pending-pay-loans',
      title: 'Pending Pay Loans',
      amount: stats.pendingPayLoans,
      color: '#c2185b',
      icon: <ReceiptLongIcon sx={{ fontSize: 32, color: '#c2185b' }} />,
      subtitle: 'To Pay (Type: Loan) (Status: Pending)',
      gridProps: { xs: 12, sm: 6, md: 6, lg: 4, xl: 4, '2xl': 4 },
    },
    {
      id: 'pending-pay-expenses',
      title: 'Pending Pay Expenses',
      amount: stats.pendingPayExpenses,
      color: '#e65100',
      icon: <PriceCheckIcon sx={{ fontSize: 32, color: '#e65100' }} />,
      subtitle: 'To Pay (Type: Expenses) (Status: Pending)',
      gridProps: { xs: 12, sm: 6, md: 6, lg: 4, xl: 4, '2xl': 4 },
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3, '2xl': 3.5 } }}>
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
                    ₹ {formatAmount(card.amount)}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                    {card.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;
