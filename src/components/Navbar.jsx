import { startTransition, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import Button from './Button';
import Icon from './Icon';
import Logo from './Logo';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever a link inside it is used.
  const closeMenu = () => setMenuOpen(false);

  function handleLogout() {
    closeMenu();
    // Same transition as the navigation so the current page never re-renders
    // without a user before Home appears (see DashboardLayout).
    startTransition(() => {
      navigate('/');
      logout();
    });
    showToast('You have been logged out.', 'info');
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') closeMenu();
  }

  const navLinkClass = ({ isActive }) => `navbar__link ${isActive ? 'is-active' : ''}`;

  return (
    <header className="navbar" onKeyDown={handleKeyDown}>
      <div className="container navbar__inner">
        <Logo tone="light" onClick={closeMenu} />

        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>

        <div id="primary-menu" className={`navbar__menu ${menuOpen ? 'is-open' : ''}`}>
          <nav aria-label="Primary">
            <ul className="navbar__links">
              <li>
                <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>
                  Home
                </NavLink>
              </li>
              <li>
                <Link to="/#latest" className="navbar__link" onClick={closeMenu}>
                  Articles
                </Link>
              </li>
              {user && (
                <>
                  <li>
                    <NavLink to="/dashboard" className={navLinkClass} onClick={closeMenu}>
                      Dashboard
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/create-blog" className={navLinkClass} onClick={closeMenu}>
                      Write
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </nav>

          <div className="navbar__actions">
            {user ? (
              <>
                <span className="navbar__user">
                  <Avatar name={user.name} size="sm" />
                  <span className="navbar__user-name">{user.name}</span>
                </span>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  <Icon name="logout" size={16} />
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button to="/login" variant="outline-light" size="sm" onClick={closeMenu}>
                  Log in
                </Button>
                <Button to="/register" variant="primary" size="sm" onClick={closeMenu}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
