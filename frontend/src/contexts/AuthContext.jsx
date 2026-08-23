// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hs_token');
    const storedUser = localStorage.getItem('hs_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }

    if (token) {
      api.get('/auth/me')
        .then(({ data }) => {
          localStorage.setItem('hs_user', JSON.stringify(data));
          setUser(data);
        })
        .catch(() => {
          // If token invalid/expired, logout
          localStorage.removeItem('hs_token');
          localStorage.removeItem('hs_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const sendLoginOtp = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login/send-otp', { email, password });
    return data;
  }, []);

  const verifyLoginOtp = useCallback(async (email, otp) => {
    const { data } = await api.post('/auth/login/verify-otp', { email, otp });
    localStorage.setItem('hs_token', data.token);
    localStorage.setItem('hs_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const resendLoginOtp = useCallback(async (email) => {
    const { data } = await api.post('/auth/login/resend-otp', { email });
    return data;
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.step === 'otp') {
      return data;
    }
    if (data.token) {
      localStorage.setItem('hs_token', data.token);
      localStorage.setItem('hs_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    }
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('hs_token', data.token);
    localStorage.setItem('hs_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const sendRegisterOtp = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register/send-otp', formData);
    return data;
  }, []);

  const verifyRegisterOtp = useCallback(async (email, otp) => {
    const { data } = await api.post('/auth/register/verify-otp', { email, otp });
    localStorage.setItem('hs_token', data.token);
    localStorage.setItem('hs_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const resendRegisterOtp = useCallback(async (email) => {
    const { data } = await api.post('/auth/register/resend-otp', { email });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hs_token');
    localStorage.removeItem('hs_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('hs_user', JSON.stringify(data));
      setUser(data);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, refreshUser,
      sendLoginOtp, verifyLoginOtp, resendLoginOtp,
      sendRegisterOtp, verifyRegisterOtp, resendRegisterOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
