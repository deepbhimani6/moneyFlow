import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Alert,
  CircularProgress,
  Typography,
  InputAdornment,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { memberService } from '../services/api';
import { capitalizeName, capitalizeWordsInput } from '../utils/formatters';

const InviteMemberModal = ({
  open,
  onClose,
  onMemberCreated,
  existingMembers = [],
  currentUserEmail = '',
  title = 'Invite New Member',
  createFunction = null,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    username: '',
    sendLink: true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [existingMemberInfo, setExistingMemberInfo] = useState(null);

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);

  const isExistingAppMember = Boolean(
    existingMemberInfo?.exists && !existingMemberInfo?.isAlreadyInDirectory
  );

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        fullName: '',
        phoneNumber: '',
        email: '',
        username: '',
        sendLink: true,
      });
      setErrors({});
      setError('');
      setCheckingEmail(false);
      setExistingMemberInfo(null);
    }
  }, [open]);

  // Real-time check if email belongs to an existing member of MoneyFlow
  useEffect(() => {
    if (!open) {
      setCheckingEmail(false);
      return;
    }

    const clean = (formData.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. If email is empty, immediately clear checking state and reset auto-filled data
    if (!clean) {
      setCheckingEmail(false);
      setExistingMemberInfo(null);
      setFormData((prev) => ({
        ...prev,
        fullName: '',
        phoneNumber: '',
        username: '',
      }));
      return;
    }

    // 2. If email is not yet in valid format, turn off loading spinner
    if (!emailRegex.test(clean)) {
      setCheckingEmail(false);
      setExistingMemberInfo(null);
      return;
    }

    // 3. Prevent inviting own logged-in email
    if (currentUserEmail && clean === currentUserEmail.trim().toLowerCase()) {
      setCheckingEmail(false);
      setErrors((prev) => ({ ...prev, email: 'You cannot invite your own email address.' }));
      setExistingMemberInfo(null);
      return;
    }

    // 4. Check if already in the caller's directory from props
    const isAlreadyInLocalList = existingMembers.some(
      (m) => (m.email || '').trim().toLowerCase() === clean
    );
    if (isAlreadyInLocalList) {
      setCheckingEmail(false);
      setErrors((prev) => ({ ...prev, email: 'This member is already in your members list.' }));
      setExistingMemberInfo({ exists: true, isAlreadyInDirectory: true });
      return;
    }

    let isCancelled = false;
    setCheckingEmail(true);

    const timer = setTimeout(async () => {
      try {
        const res = await memberService.checkEmail(clean);
        if (isCancelled) return;

        if (res.isOwnEmail) {
          setErrors((prev) => ({ ...prev, email: res.message || 'You cannot add your own email address.' }));
          setExistingMemberInfo(null);
        } else if (res.isAlreadyInDirectory) {
          setErrors((prev) => ({ ...prev, email: 'This member is already in your members list.' }));
          setExistingMemberInfo({ exists: true, isAlreadyInDirectory: true });
        } else if (res.exists && res.member) {
          setExistingMemberInfo({
            exists: true,
            isAlreadyInDirectory: false,
            member: res.member,
          });
          // Do not auto-fill full name, username, or phone number from the existing member
          setFormData((prev) => ({
            ...prev,
            phoneNumber: '',
            username: '',
            sendLink: false,
          }));
          setErrors((prev) => ({ ...prev, email: '' }));
        } else {
          setExistingMemberInfo(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error checking email:', err);
        }
      } finally {
        if (!isCancelled) {
          setCheckingEmail(false);
        }
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      setCheckingEmail(false);
    };
  }, [formData.email, open, currentUserEmail, existingMembers]);

  const validateEmailValue = (rawEmail) => {
    const clean = (rawEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!clean) {
      return 'Email address is required.';
    }
    if (!emailRegex.test(clean)) {
      return 'Please enter a valid email address.';
    }
    if (currentUserEmail && clean === currentUserEmail.trim().toLowerCase()) {
      return 'You cannot invite your own email address.';
    }
    const isDuplicate = existingMembers.some(
      (m) => (m.email || '').trim().toLowerCase() === clean
    );
    if (isDuplicate || existingMemberInfo?.isAlreadyInDirectory) {
      return 'This member is already in your members list.';
    }
    return '';
  };

  const handleChange = (e) => {
    let { name, value, checked, type } = e.target;
    if (name === 'fullName' && typeof value === 'string') {
      value = capitalizeWordsInput(value);
    }
    if (name === 'email') {
      // If user clears the email field, immediately reset existingMemberInfo and clean all details
      if (!value || !value.trim()) {
        setCheckingEmail(false);
        setExistingMemberInfo(null);
        setFormData((prev) => ({
          ...prev,
          email: '',
          fullName: '',
          phoneNumber: '',
          username: '',
        }));
        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
        return;
      }
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) {
      setError('');
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'fullName' && typeof value === 'string') {
      setFormData((prev) => ({
        ...prev,
        fullName: capitalizeName(value),
      }));
    } else if (name === 'email') {
      const emailErr = validateEmailValue(value);
      if (emailErr) {
        setErrors((prev) => ({ ...prev, email: emailErr }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const formattedFullName = capitalizeName(formData.fullName);
    const newErrors = {};

    if (!formattedFullName) {
      newErrors.fullName = 'Full name is required';
    }

    const emailErr = validateEmailValue(formData.email);
    if (emailErr) {
      newErrors.email = emailErr;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.fullName && fullNameRef.current) {
        fullNameRef.current.focus();
      } else if (newErrors.email && emailRef.current) {
        emailRef.current.focus();
      }
      return;
    }

    try {
      setSubmitting(true);
      const submitFn = createFunction || memberService.createMember;
      const res = await submitFn({
        fullName: formattedFullName,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim(),
        sendLink: isExistingAppMember ? false : formData.sendLink,
      });

      if (res.success) {
        onMemberCreated(
          res.data,
          isExistingAppMember ? false : formData.sendLink,
          Boolean(res.alreadyRegistered || isExistingAppMember)
        );
        onClose();
        // Reset form
        setFormData({
          fullName: '',
          phoneNumber: '',
          email: '',
          username: '',
          sendLink: true,
        });
        setErrors({});
        setExistingMemberInfo(null);
      } else {
        const msg = res.message || 'Failed to create member.';
        const lower = msg.toLowerCase();
        if (lower.includes('email')) {
          setErrors((prev) => ({ ...prev, email: msg }));
          if (emailRef.current) emailRef.current.focus();
        } else if (lower.includes('name')) {
          setErrors((prev) => ({ ...prev, fullName: msg }));
          if (fullNameRef.current) fullNameRef.current.focus();
        } else if (lower.includes('username')) {
          setErrors((prev) => ({ ...prev, username: msg }));
        } else if (lower.includes('phone') || lower.includes('mobile')) {
          setErrors((prev) => ({ ...prev, phoneNumber: msg }));
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to create member.';
      const lower = errMsg.toLowerCase();
      if (lower.includes('email')) {
        setErrors((prev) => ({ ...prev, email: errMsg }));
        if (emailRef.current) emailRef.current.focus();
      } else if (lower.includes('name')) {
        setErrors((prev) => ({ ...prev, fullName: errMsg }));
        if (fullNameRef.current) fullNameRef.current.focus();
      } else if (lower.includes('username')) {
        setErrors((prev) => ({ ...prev, username: errMsg }));
      } else if (lower.includes('phone') || lower.includes('mobile')) {
        setErrors((prev) => ({ ...prev, phoneNumber: errMsg }));
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dialogTitle = isExistingAppMember ? 'Add Member' : title;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{dialogTitle}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Alert when member is already working in this app */}
          {isExistingAppMember && (
            <Alert
              severity="info"
              icon={<CheckCircleOutlineIcon sx={{ color: '#0284c7' }} />}
              sx={{
                borderRadius: 2,
                bgcolor: '#f0f9ff',
                border: '1px solid #bae6fd',
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0369a1' }}>
                This member is already working on this app
              </Typography>
              <Typography variant="caption" sx={{ color: '#0c4a6e', display: 'block', mt: 0.5 }}>
                They already have a registered MoneyFlow account. You can add them directly to your members list without sending an invite link or password.
              </Typography>
            </Alert>
          )}

          {/* 1. Full Name */}
          <TextField
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            inputRef={fullNameRef}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            inputProps={{ style: { textTransform: 'capitalize' } }}
            fullWidth
            required
            placeholder="e.g. John Doe"
          />

          {/* 2. Phone Number - Only shown for new member invitations */}
          {!isExistingAppMember && (
            <TextField
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              error={Boolean(errors.phoneNumber)}
              helperText={errors.phoneNumber || ''}
              onChange={handleChange}
              fullWidth
              placeholder="e.g. +91 9876543210"
            />
          )}

          {/* 3. E-mail */}
          <TextField
            label="E-mail"
            name="email"
            type="email"
            value={formData.email}
            inputRef={emailRef}
            error={Boolean(errors.email)}
            helperText={
              errors.email ||
              (isExistingAppMember
                ? 'Member is already registered on this app.'
                : 'A temporary password will be sent to this email.')
            }
            onChange={handleChange}
            onBlur={handleBlur}
            fullWidth
            required
            placeholder="e.g. john@example.com"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {checkingEmail ? (
                    <CircularProgress size={18} />
                  ) : isExistingAppMember ? (
                    <CheckCircleOutlineIcon color="primary" fontSize="small" />
                  ) : null}
                </InputAdornment>
              ),
            }}
          />

          {/* 4. Username - Only shown for new member invitations */}
          {!isExistingAppMember && (
            <TextField
              label="Username (optional)"
              name="username"
              value={formData.username}
              error={Boolean(errors.username)}
              helperText={errors.username || ''}
              onChange={handleChange}
              fullWidth
              placeholder="e.g. johndoe (defaults to email username)"
            />
          )}

          {/* When member is already registered in app, hide invite options and password generation */}
          {!isExistingAppMember && (
            <>
              {/* Info Card: Automatic Random Password & Invite Link */}
              <Box
                sx={{
                  p: 1.75,
                  bgcolor: '#f8fafc',
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <VpnKeyOutlinedIcon sx={{ color: 'primary.main', fontSize: 24, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Secure Random Password
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    A strong, secure password is automatically generated according to password validation standards and included in the invitation email.
                  </Typography>
                </Box>
              </Box>

              {/* Checkbox Send Link */}
              <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="sendLink"
                      checked={formData.sendLink}
                      onChange={handleChange}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Send invite email immediately
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Member will receive an invitation email with their temporary password and app access link.
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || checkingEmail || Boolean(errors.email)}
            startIcon={
              submitting ? (
                <CircularProgress size={18} />
              ) : isExistingAppMember ? (
                <PersonAddIcon />
              ) : formData.sendLink ? (
                <SendIcon />
              ) : (
                <PersonAddIcon />
              )
            }
          >
            {submitting
              ? 'Saving...'
              : isExistingAppMember
              ? 'Add Member'
              : formData.sendLink
              ? 'Add & Send Invite'
              : 'Save Member'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InviteMemberModal;
