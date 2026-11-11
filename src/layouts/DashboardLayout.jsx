import { startTransition } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import './DashboardLayout.css';

// Authenticated area: sidebar navigation on desktop, which turns into a top
// bar with horizontal tabs on tablets and phones (see DashboardLayout.css).
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  function handleLogout() {
    // React Router runs navigation inside a transition. Running logout in the
    // same transition makes React apply both updates together; otherwise
    // ProtectedRoute would briefly see "no user" on /dashboard and redirect
    // to /login instead of Home.
    startTransition(() => {
      navigate('/');
      logout();
    });
    showToast('You have been logged out. See you soon!', 'info');
  }

  const linkClass = ({ isActive }) => `dash-nav__link ${isActive ? 'is-active' : ''}`;

  return (
    <div className="dash-layout">
      <a href="#dashboard-content" className="skip-link">
        Skip to content
      </a>

      <aside className="dash-sidebar">
        <div className="dash-sidebar__top">
          <Logo tone="light" />
          <button
            type="button"
            className="dash-sidebar__logout-icon"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <Icon name="logout" size={20} />
          </button>
        </div>

        <nav className="dash-nav" aria-label="Dashboard">
          <NavLink to="/dashboard" end className={linkClass}>
            <Icon name="grid" size={18} />
            Overview
          </NavLink>
          <NavLink to="/create-blog" className={linkClass}>
            <Icon name="plus" size={18} />
            New post
          </NavLink>
          <Link to="/" className="dash-nav__link">
            <Icon name="home" size={18} />
            View blog
          </Link>
        </nav>

        <div className="dash-sidebar__user">
          <Avatar name={user.name} size="md" />
          <div className="dash-sidebar__user-info">
            <p className="dash-sidebar__user-name">{user.name}</p>
            <p className="dash-sidebar__user-email">{user.email}</p>
          </div>
          <button type="button" className="dash-sidebar__logout" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main id="dashboard-content" className="dash-main">
        <Outlet />
      </main>
    </div>
  );
}
