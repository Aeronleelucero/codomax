import { Link } from 'react-router-dom';
import './Logo.css';

// tone="light" is used on dark (navy) backgrounds.
export default function Logo({ tone = 'light', onClick }) {
  return (
    <Link to="/" className={`logo logo--${tone}`} onClick={onClick} aria-label="Codomax home">
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" />
        <path d="M21.5 11.2a7 7 0 1 0 0 9.6" />
        <circle cx="23.2" cy="16" r="2" />
      </svg>
      <span className="logo__text">
        codomax<span className="logo__dot">.</span>
      </span>
    </Link>
  );
}
