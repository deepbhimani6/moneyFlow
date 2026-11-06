import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/api';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

const EMPTY_PROFILE = {
  fullName: '',
  email: '',
  phoneNumber: '',
  username: '',
  bio: '',
  avatarColor: '#1976d2',
};

export const ProfileProvider = ({ children }) => {
  const auth = useAuth();
  const authUser = auth?.user;
  const updateCurrentUser = auth?.updateCurrentUser;

  const [profile, setProfile] = useState(() => {
    if (authUser) return authUser;
    try {
      const cached = localStorage.getItem('moneyflow_profile');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync profile when auth user updates or account switches
  useEffect(() => {
    if (authUser) {
      setProfile((prev) => {
        // If switched to a different user, replace with authUser
        if (
          !prev ||
          (authUser._id && prev._id && prev._id !== authUser._id) ||
          (authUser.email && prev.email && prev.email.toLowerCase() !== (prev.email || '').toLowerCase())
        ) {
          return authUser;
        }
        return { ...prev, ...authUser };
      });
    } else {
      setProfile(null);
      localStorage.removeItem('moneyflow_profile');
    }
  }, [authUser]);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('moneyflow_token');
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const res = await profileService.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        localStorage.setItem('moneyflow_profile', JSON.stringify(res.data));
        if (updateCurrentUser) {
          updateCurrentUser(res.data);
        }
      }
    } catch (err) {
      console.warn('Error loading profile from API:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [updateCurrentUser]);

  const updateProfile = useCallback(async (updatedData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await profileService.updateProfile(updatedData);
      if (res.success && res.data) {
        setProfile(res.data);
        localStorage.setItem('moneyflow_profile', JSON.stringify(res.data));
        if (updateCurrentUser) {
          updateCurrentUser(res.data);
        }
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message || 'Failed to update profile' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Network error updating profile';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [updateCurrentUser]);

  useEffect(() => {
    if (auth?.isAuthenticated && authUser) {
      fetchProfile();
    }
  }, [fetchProfile, auth?.isAuthenticated, authUser?._id, authUser?.email]);

  // Derive initials from fullName
  const getInitials = (name) => {
    if (!name) return 'MF';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const effectiveProfile = profile || authUser || EMPTY_PROFILE;
  const initials = getInitials(effectiveProfile?.fullName);

  return (
    <ProfileContext.Provider
      value={{
        profile: effectiveProfile,
        initials,
        loading,
        error,
        fetchProfile,
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
