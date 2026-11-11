import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Wraps Login and Register. Someone who is already logged in has no reason
// to see these pages, so they are sent to the Dashboard (or the page they
// originally asked for).
export default function GuestRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/dashboard'} replace />;
  }

  return <Outlet />;
}
