import { createTheme } from '@mui/material/styles';

const baseTheme = createTheme({
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
});

const theme = createTheme(baseTheme, {
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.MuiFormLabel-asterisk, .MuiInputLabel-asterisk': {
          color: '#d32f2f !important',
          fontWeight: 700,
        },
        'input[type="date"], input[type="time"]': {
          position: 'relative',
          minHeight: '1.4375em',
          WebkitAppearance: 'none !important',
          appearance: 'none !important',
        },
        'input[type="date"]::-webkit-date-and-time-value, input[type="time"]::-webkit-date-and-time-value': {
          textAlign: 'left',
        },
        'input[type="date"]::-webkit-calendar-picker-indicator, input[type="time"]::-webkit-calendar-picker-indicator': {
          position: 'absolute',
          right: 0,
          width: '1px',
          height: '1px',
          minWidth: 0,
          minHeight: 0,
          padding: 0,
          margin: 0,
          border: 0,
          opacity: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          background: 'transparent !important',
          color: 'transparent !important',
          WebkitAppearance: 'none !important',
          appearance: 'none !important',
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
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          lineHeight: 1.5,
          color: '#64748b',
          marginTop: '4px',
          marginLeft: '14px',
          marginRight: '14px',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          [baseTheme.breakpoints.down('sm')]: {
            fontSize: '0.875rem',
            transform: 'translate(14px, 12px) scale(1)',
            '&.MuiInputLabel-shrink': {
              transform: 'translate(14px, -9px) scale(0.75)',
            },
          },
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
          [baseTheme.breakpoints.down('sm')]: {
            fontSize: '0.875rem',
            minHeight: '44px',
          },
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
        input: {
          minWidth: 0,
          '&.MuiInputBase-inputAdornedStart': {
            paddingLeft: '0 !important',
          },
          '&.MuiInputBase-inputAdornedEnd': {
            paddingRight: '0 !important',
          },
          [baseTheme.breakpoints.down('sm')]: {
            paddingTop: '12px !important',
            paddingBottom: '12px !important',
            paddingBlock: '12px !important',
            paddingLeft: '14px',
            paddingRight: '14px',
            fontSize: '0.875rem !important',
            height: '1.4375em',
            '&.MuiInputBase-inputAdornedStart': {
              paddingLeft: '0 !important',
            },
            '&.MuiInputBase-inputAdornedEnd': {
              paddingRight: '0 !important',
            },
          },
        },
        inputAdornedStart: {
          paddingLeft: '0 !important',
        },
        inputAdornedEnd: {
          paddingRight: '0 !important',
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
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          lineHeight: '1 !important',
          '& .MuiTypography-root': {
            lineHeight: '1 !important',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          [baseTheme.breakpoints.down('sm')]: {
            paddingTop: '12px !important',
            paddingBottom: '12px !important',
            paddingBlock: '12px !important',
            fontSize: '0.875rem !important',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        list: {
          paddingTop: '4px',
          paddingBottom: '4px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: '36px !important',
          paddingTop: '6px !important',
          paddingBottom: '6px !important',
          paddingLeft: '14px !important',
          paddingRight: '14px !important',
          fontSize: '0.875rem !important',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiAutocomplete-listbox': {
            padding: '4px 0',
          },
        },
        listbox: {
          padding: '4px 0',
          '& .MuiAutocomplete-option': {
            minHeight: '36px !important',
            paddingTop: '6px !important',
            paddingBottom: '6px !important',
            paddingLeft: '14px !important',
            paddingRight: '14px !important',
            fontSize: '0.875rem !important',
          },
        },
        option: {
          minHeight: '36px !important',
          paddingTop: '6px !important',
          paddingBottom: '6px !important',
          paddingLeft: '14px !important',
          paddingRight: '14px !important',
          fontSize: '0.875rem !important',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        sizeSmall: {
          fontSize: '0.75rem',
          padding: '4px 10px',
          minHeight: '28px',
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
    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
      },
    },
    MuiDialog: {
      defaultProps: {
        maxWidth: 'sm',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          [baseTheme.breakpoints.down('sm')]: {
            '& .MuiDialog-container': {
              height: '100% !important',
              width: '100% !important',
            },
          },
        },
        paper: {
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100% - 64px)',
          overflow: 'hidden',
          '& > form': {
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            height: '100%',
          },
          [baseTheme.breakpoints.down('sm')]: {
            margin: '0 !important',
            width: '100% !important',
            maxWidth: '100% !important',
            height: '100% !important',
            maxHeight: '100% !important',
            borderRadius: '0 !important',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            '& > form': {
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
            },
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          flex: '0 0 auto',
          [baseTheme.breakpoints.down('sm')]: {
            padding: '14px 16px !important',
            fontSize: '1.1rem !important',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          flex: '1 1 auto',
          overflowY: 'auto',
          minHeight: 0,
          [baseTheme.breakpoints.down('sm')]: {
            padding: '16px !important',
            flex: '1 1 auto',
            overflowY: 'auto',
            minHeight: 0,
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          flex: '0 0 auto',
          [baseTheme.breakpoints.down('sm')]: {
            padding: '12px 16px !important',
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
