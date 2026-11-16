import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AuthContext } from './AuthContext';
import * as authService from '../services/authService';
import { SESSION_EXPIRED_EVENT } from '../services/apiClient';
import { removeLegacyMockData } from '../services/session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  // Reject late bootstrap responses after login/logout or another validation.
  const generation = useRef(0);
  const channel = useRef(null);

  const refreshSession = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const fresh = await authService.fetchCurrentUser();
      if (version === generation.current) setUser(fresh);
    } catch (failure) {
      if (version === generation.current) {
        setUser(null);
        if (failure.status !== 401) setError(failure.message);
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => {
    generation.current += 1;
    setUser(null);
    setError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    removeLegacyMockData();
    // BroadcastChannel synchronizes tabs without writing auth data to storage.
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('artikly-auth');
      channel.current.onmessage = (event) => {
        if (event.data === 'logout') clearUser();
        else refreshSession();
      };
    }
    const expired = () => { setUser(null); setLoading(false); };
    // Hide retained DOM before BFCache snapshots; unhide after restoring and
    // force a fresh session check before protected children render.
    const leaving = () => { document.documentElement.style.visibility = 'hidden'; };
    const shown = (event) => {
      if (event.persisted) flushSync(() => { refreshSession(); });
      document.documentElement.style.visibility = '';
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    window.addEventListener('pagehide', leaving);
    window.addEventListener('pageshow', shown);
    // Schedule bootstrap from an external callback; initial state already loads.
    const bootstrap = window.setTimeout(refreshSession, 0);
    return () => {
      window.clearTimeout(bootstrap);
      generation.current += 1;
      channel.current?.close();
      channel.current = null;
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
      window.removeEventListener('pagehide', leaving);
      window.removeEventListener('pageshow', shown);
    };
  }, [refreshSession, clearUser]);

  const login = useCallback(async (credentials) => {
    const fresh = await authService.login(credentials);
    generation.current += 1;
    setUser(fresh);
    setLoading(false);
    setError('');
    channel.current?.postMessage('refresh');
    return fresh;
  }, []);
  const register = useCallback((details) => authService.register(details), []);
  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
      clearUser();
      channel.current?.postMessage('logout');
    } finally { setLoggingOut(false); }
  }, [clearUser]);
  const updateProfile = useCallback(async (details) => {
    const fresh = await authService.updateProfile(details);
    setUser(fresh);
    channel.current?.postMessage('refresh');
    return fresh;
  }, []);
  const changePassword = useCallback(async (details) => {
    await authService.changePassword(details);
    clearUser();
    channel.current?.postMessage('logout');
  }, [clearUser]);

  const value = useMemo(() => ({ user, loading, error, loggingOut, refreshSession,
    isAuthenticated: Boolean(user), login, register, logout, updateProfile, changePassword }),
    [user, loading, error, loggingOut, refreshSession, login, register, logout, updateProfile, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
