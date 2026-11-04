import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    success: {
      main: '#2e7d32',
    },
    warning: {
      main: '#ed6c02',
    },
    error: {
      main: '#d32f2f',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.MuiFormLabel-asterisk, .MuiInputLabel-asterisk': {
          color: '#d32f2f !important',
          fontWeight: 700,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        asterisk: {
          color: '#d32f2f !important',
          fontWeight: 700,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        asterisk: {
          color: '#d32f2f !important',
          fontWeight: 700,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        maxWidth: 'sm',
        fullWidth: true,
      },
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.MuiInputBase-multiline textarea': {
            minHeight: '60px',
            boxSizing: 'border-box',
          },
        },
        inputMultiline: {
          minHeight: '60px',
          boxSizing: 'border-box',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        inputMultiline: {
          minHeight: '60px',
          boxSizing: 'border-box',
        },
      },
    },
  },
});

export default theme;
