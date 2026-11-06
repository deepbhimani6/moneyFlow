import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      xsm: 448,
      sm: 576,
      md: 768,
      lg: 1024,
      xl: 1152,
      '2xl': 1280,
    },
  },
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
        root: {
          '&.Mui-error': {
            color: '#d32f2f !important',
          },
        },
        asterisk: {
          color: '#d32f2f !important',
          fontWeight: 700,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-error': {
            color: '#d32f2f !important',
          },
        },
        asterisk: {
          color: '#d32f2f !important',
          fontWeight: 700,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d32f2f !important',
            borderWidth: '1px !important',
          },
          '&.Mui-error:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d32f2f !important',
            borderWidth: '1px !important',
          },
          '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d32f2f !important',
            borderWidth: '1px !important',
            boxShadow: 'none !important',
          },
          '&.MuiInputBase-multiline textarea': {
            minHeight: '60px',
            boxSizing: 'border-box',
          },
        },
        notchedOutline: {
          boxShadow: 'none !important',
        },
        inputMultiline: {
          minHeight: '60px',
          boxSizing: 'border-box',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          '@media (max-width: 600px)': {
            minHeight: '38px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
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
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          '@media (max-width: 600px)': {
            margin: 12,
            width: 'calc(100% - 24px)',
            maxHeight: 'calc(100% - 32px)',
            borderRadius: 16,
          },
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
