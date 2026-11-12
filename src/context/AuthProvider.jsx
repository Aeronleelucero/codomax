import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import * as authService from '../services/authService';
import { SESSION_EXPIRED_EVENT } from '../services/apiClient';

// Holds the logged-in user for the whole app.
// Components read it through the useAuth() hook.
export function AuthProvider({ children }) {
  // Read the saved session once, synchronously, so a page refresh keeps the
  // user logged in without briefly showing the login page.
  const [user, setUser] = useState(() => authService.getCurrentUser());

  // When any API call is rejected because the token expired or became
  // invalid, apiClient clears the session and fires this event.
  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  // On first load, confirm a stored session with the server once.
  useEffect(() => {
    if (!authService.getCurrentUser()) return;
    authService
      .fetchCurrentUser()
      .then((freshUser) => setUser(freshUser))
      .catch(() => {
        // A rejected token is handled by the event above. Network errors keep
        // the cached user so the app still works if the API is briefly down.
      });
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  // Registration creates the account but does not log in; the user is sent to
  // the Login page afterwards.
  const register = useCallback((details) => authService.register(details), []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
