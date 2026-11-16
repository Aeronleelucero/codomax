import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Button from './Button';
import { ErrorState, LoadingState } from './PageState';
import { useAuth } from '../hooks/useAuth';

// Wraps Login and Register. Someone who is already logged in has no reason
// to see these pages, so they are sent to the Dashboard (or the page they
// originally asked for).
export default function GuestRoute() {
  const { isAuthenticated, loading, error, refreshSession } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Checking your session…" />;
  if (error) return <ErrorState actions={<Button onClick={refreshSession}>Try again</Button>}>{error}</ErrorState>;

  if (isAuthenticated) {
    const from = location.state?.from;
    const to = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard';
    return <Navigate to={to} replace />;
  }

  return <Outlet />;
}
