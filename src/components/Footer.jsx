import { Link } from 'react-router-dom';
import Logo from './Logo';
import { CATEGORIES } from '../data/categories';
import { useAuth } from '../hooks/useAuth';
import './Footer.css';

export default function Footer() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo tone="light" />
          <p className="footer__tagline">
            Every idea deserves a story. A welcoming home for writers and curious readers.
          </p>
        </div>

        <nav className="footer__column" aria-label="Topics">
          <h2 className="footer__heading">Topics</h2>
          <ul>
            {CATEGORIES.slice(0, 4).map((category) => (
              <li key={category}>
                <Link to={`/?category=${encodeURIComponent(category)}#latest`}>{category}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer__column" aria-label="Account">
          <h2 className="footer__heading">{isAuthenticated ? 'Your space' : 'Account'}</h2>
          <ul>
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                <li>
                  <Link to="/create-blog">Write an article</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">Log in</Link>
                </li>
                <li>
                  <Link to="/register">Create an account</Link>
                </li>
              </>
            )}
            <li>
              <Link to="/">All articles</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container footer__bottom">
        <p>© {year} Artikly. Built for the Datheon Full-Stack Development Internship.</p>
        <p className="footer__note">Development build · powered by the Artikly API</p>
      </div>
    </footer>
  );
}
