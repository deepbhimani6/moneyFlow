import React, { useRef, useCallback, useState, useEffect } from 'react';
import { TextField, InputAdornment, IconButton, Box } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * Renders a date or time TextField with a consistent Material calendar/clock
 * symbol and visible date placeholder across mobile and desktop browsers.
 */
const DateTimeField = ({
  type = 'date',
  value,
  defaultValue,
  placeholder,
  inputRef,
  InputProps,
  InputLabelProps,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  sx,
  disabled = false,
  ...props
}) => {
  const localInputRef = useRef(null);
  const [isEditingSegments, setIsEditingSegments] = useState(false);
  const [hasUncontrolledValue, setHasUncontrolledValue] = useState(
    () => Boolean(String(defaultValue ?? '').trim())
  );

  const isControlled = value !== undefined;
  const hasValue = isControlled
    ? Boolean(String(value ?? '').trim())
    : hasUncontrolledValue;

  useEffect(() => {
    if (hasValue) {
      setIsEditingSegments(false);
    }
  }, [hasValue]);

  const mergedInputRef = useCallback(
    (node) => {
      localInputRef.current = node;
      if (!isControlled && node) {
        setHasUncontrolledValue(Boolean(String(node.value || '').trim()));
      }
      if (!inputRef) return;
      if (typeof inputRef === 'function') {
        inputRef(node);
      } else {
        inputRef.current = node;
      }
    },
    [inputRef, isControlled]
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

  const handleChange = (e) => {
    if (!isControlled) {
      setHasUncontrolledValue(Boolean(String(e.target.value || '').trim()));
    }
    onChange?.(e);
  };

  const handleKeyDown = (e) => {
    if (
      type === 'date' &&
      !hasValue &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      /^(?:[0-9]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete)$/.test(e.key)
    ) {
      setIsEditingSegments(true);
    }
    onKeyDown?.(e);
  };

  const handleBlur = (e) => {
    setIsEditingSegments(false);
    onBlur?.(e);
  };

  const isTime = type === 'time';
  const IconComponent = isTime ? AccessTimeIcon : CalendarTodayIcon;
  const datePlaceholder = placeholder || (!isTime ? 'dd/mm/yyyy' : '');
  const showCustomPlaceholder = !isTime && !hasValue && !isEditingSegments && Boolean(datePlaceholder);

  const defaultEndAdornment = (
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
  );

  return (
    <TextField
      type={type}
      {...(isControlled ? { value } : defaultValue !== undefined ? { defaultValue } : {})}
      disabled={disabled}
      inputRef={mergedInputRef}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      InputLabelProps={{
        shrink: true,
        ...InputLabelProps,
      }}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <>
            {showCustomPlaceholder && (
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  left: '14px',
                  right: '42px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  color: disabled ? 'text.disabled' : '#64748b',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  lineHeight: 1.4375,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {datePlaceholder}
              </Box>
            )}
            {InputProps?.endAdornment ?? defaultEndAdornment}
          </>
        ),
      }}
      sx={[
        showCustomPlaceholder && {
          '& input[type="date"]': {
            color: 'transparent !important',
            WebkitTextFillColor: 'transparent !important',
            caretColor: 'transparent',
          },
          '& input[type="date"]::-webkit-datetime-edit, & input[type="date"]::-webkit-datetime-edit-fields-wrapper, & input[type="date"]::-webkit-datetime-edit-text, & input[type="date"]::-webkit-datetime-edit-month-field, & input[type="date"]::-webkit-datetime-edit-day-field, & input[type="date"]::-webkit-datetime-edit-year-field, & input[type="date"]::-webkit-date-and-time-value': {
            color: 'transparent !important',
            WebkitTextFillColor: 'transparent !important',
            opacity: '0 !important',
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    />
  );
};

export default DateTimeField;
