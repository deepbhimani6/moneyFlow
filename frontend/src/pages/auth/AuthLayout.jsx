import React from 'react';
import { Box, Card, CardContent, Typography, Container } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const AuthLayout = ({ children, title, subtitle, maxWidth = 620 }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        py: { xs: 4, sm: 6 },
        px: 2,
        background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f0fa 50%, #f8fafc 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background blur circles */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: { xs: 260, md: 450 },
          height: { xs: 260, md: 450 },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25, 118, 210, 0.12) 0%, rgba(25, 118, 210, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: { xs: 280, md: 480 },
          height: { xs: 280, md: 480 },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(156, 39, 176, 0.08) 0%, rgba(156, 39, 176, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <Container
        maxWidth={false}
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: { xs: '100%', sm: maxWidth, md: maxWidth },
          width: '100%',
          px: { xs: 1, sm: 2 },
        }}
      >
        {/* Brand Header */}
        <Box
          sx={{
            textAlign: 'center',
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 16px rgba(25, 118, 210, 0.28)',
              mb: 1.5,
            }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.5px',
              color: '#0f172a',
              fontSize: { xs: '1.75rem', sm: '2rem' },
            }}
          >
            MoneyFlow
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Online Expense & Split Tracker
          </Typography>
        </Box>

        {/* Auth Card Container */}
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 3,
            border: '1px solid rgba(226, 232, 240, 0.9)',
            bgcolor: 'background.paper',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
            {title && (
              <Box sx={{ mb: 3.5, textAlign: 'left' }}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    fontSize: { xs: '1.3rem', sm: '1.5rem' },
                  }}
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            )}

            {children}
          </CardContent>
        </Card>

        {/* Footer */}
        <Typography
          variant="caption"
          display="block"
          align="center"
          sx={{ color: '#94a3b8', mt: 3.5 }}
        >
          MoneyFlow © 2026 • Secure Personal Finance & Loans
        </Typography>
      </Container>
    </Box>
  );
};

export default AuthLayout;
