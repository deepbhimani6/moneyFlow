import React, { useRef, useCallback } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * Renders a date or time TextField with a consistent Material calendar/clock
 * symbol across mobile and desktop browsers (replacing native mobile chevrons).
 */
const DateTimeField = ({
  type = 'date',
  inputRef,
  InputProps,
  InputLabelProps,
  disabled = false,
  ...props
}) => {
  const localInputRef = useRef(null);

  const mergedInputRef = useCallback(
    (node) => {
      localInputRef.current = node;
      if (!inputRef) return;
      if (typeof inputRef === 'function') {
        inputRef(node);
      } else {
        inputRef.current = node;
      }
    },
    [inputRef]
  );

  const handleOpenPicker = () => {
    const input = localInputRef.current;
    if (!input || disabled || InputProps?.readOnly) return;

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // Fallback for browsers where showPicker is unsupported or restricted
      }
    }

    input.focus();
    input.click();
  };

  const isTime = type === 'time';
  const IconComponent = isTime ? AccessTimeIcon : CalendarTodayIcon;

  return (
    <TextField
      type={type}
      disabled={disabled}
      inputRef={mergedInputRef}
      InputLabelProps={{
        shrink: true,
        ...InputLabelProps,
      }}
      InputProps={{
        ...InputProps,
        endAdornment: InputProps?.endAdornment ?? (
          <InputAdornment position="end">
            <IconButton
              type="button"
              onClick={handleOpenPicker}
              disabled={disabled}
              edge="end"
              size="small"
              tabIndex={-1}
              aria-label={isTime ? 'Open time picker' : 'Open date picker'}
              sx={{
                color: disabled ? 'text.disabled' : '#1e293b',
                p: 0.75,
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                },
              }}
            >
              <IconComponent sx={{ fontSize: 18 }} />
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
};

export default DateTimeField;
