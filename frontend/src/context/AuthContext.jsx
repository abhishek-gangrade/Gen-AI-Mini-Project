import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('resolveai_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await authAPI.getMe();
          if (res.data?.success) {
            setUser(res.data.user);
            initSocket(res.data.user.organization?._id || res.data.user.organization);
          } else {
            logout();
          }
        } catch (err) {
          console.error('[Auth Error]:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data?.success) {
      const newToken = res.data.token;
      const newUser = res.data.user;
      localStorage.setItem('resolveai_token', newToken);
      setToken(newToken);
      setUser(newUser);
      initSocket(newUser.organization?._id || newUser.organization);
      return { success: true, user: newUser };
    }
    return { success: false, error: res.data?.error || 'Login failed' };
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    if (res.data?.success) {
      const newToken = res.data.token;
      const newUser = res.data.user;
      localStorage.setItem('resolveai_token', newToken);
      setToken(newToken);
      setUser(newUser);
      initSocket(newUser.organization?._id || newUser.organization);
      return { success: true, user: newUser };
    }
    return { success: false, error: res.data?.error || 'Registration failed' };
  };

  const logout = () => {
    localStorage.removeItem('resolveai_token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const switchDemoRole = async (roleEmail, password) => {
    return await login(roleEmail, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        role: user?.role,
        login,
        register,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
