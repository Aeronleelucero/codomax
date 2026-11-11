import { createContext } from 'react';

// The context object lives in its own file so that AuthProvider.jsx only
// exports a component (required for Vite's Fast Refresh to work reliably).
export const AuthContext = createContext(null);
