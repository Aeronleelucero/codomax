import { useCallback, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import * as authService from '../services/authService';

// Holds the logged-in user for the whole app.
// Components read it through the useAuth() hook.
export function AuthProvider({ children }) {
  // Read the saved session once, synchronously, so a page refresh keeps the
  // user logged in without briefly showing the login page.
  const [user, setUser] = useState(() => authService.getCurrentUser());

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
