import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Button from './Button';
import { ErrorState, LoadingState } from './PageState';
import { useAuth } from '../hooks/useAuth';

// Wraps routes that require a logged-in user. Visitors are sent to /login,
// and the page they wanted is remembered so they return there after login.
export default function ProtectedRoute() {
  const { isAuthenticated, loading, loggingOut, error, refreshSession } = useAuth();
  const location = useLocation();

  if (loading || loggingOut) return <LoadingState label="Checking your session…" />;
  if (error) return <ErrorState actions={<Button onClick={refreshSession}>Try again</Button>}>{error}</ErrorState>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
