import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('moneyflow_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('moneyflow_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Check auth status on initial application load
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const storedToken = localStorage.getItem('moneyflow_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        if (isMounted && res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('moneyflow_user', JSON.stringify(res.user));
        }
      } catch (err) {
        console.warn('[Auth Verify Error]:', err.response?.data?.message || err.message);
        // If 401 Unauthorized, token has expired or is invalid
        if (err.response?.status === 401) {
          localStorage.removeItem('moneyflow_token');
          localStorage.removeItem('moneyflow_user');
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    try {
      const res = await authService.login({ identifier, password });
      if (res.success && res.token && res.user) {
        localStorage.setItem('moneyflow_token', res.token);
        localStorage.setItem('moneyflow_user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to sign in. Please try again.';
      return { success: false, message };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const res = await authService.register(userData);
      if (res.success && res.token && res.user) {
        localStorage.setItem('moneyflow_token', res.token);
        localStorage.setItem('moneyflow_user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create account. Please try again.';
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('moneyflow_token');
    localStorage.removeItem('moneyflow_user');
    setToken(null);
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const res = await authService.forgotPassword(email);
      return res;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error processing password reset request.';
      return { success: false, message };
    }
  }, []);

  const verifyResetToken = useCallback(async (resetToken) => {
    try {
      const res = await authService.verifyResetToken(resetToken);
      return res;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Invalid or expired reset token.';
      return { success: false, message };
    }
  }, []);

  const resetPassword = useCallback(async (resetToken, newPassword) => {
    try {
      const res = await authService.resetPassword({ token: resetToken, newPassword });
      return res;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to reset password.';
      return { success: false, message };
    }
  }, []);

  const updateCurrentUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedUserData };
      localStorage.setItem('moneyflow_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        forgotPassword,
        verifyResetToken,
        resetPassword,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
