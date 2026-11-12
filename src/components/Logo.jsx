import { Link } from 'react-router-dom';
import './Logo.css';

// The Artikly monogram: an "A" whose crossbar is drawn as the two curved
// pages of an open book. The same shapes are used in public/favicon.svg.
export function LogoMark({ className = '' }) {
  return (
    <svg className={`logo__mark ${className}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect className="logo__tile" width="32" height="32" rx="9" />
      <path className="logo__a" d="M9 24.5 16 7.5l7 17" />
      <path className="logo__pages" d="M11.2 19.4c1.7-1.2 3.3-1.2 4.8 0 1.5-1.2 3.1-1.2 4.8 0" />
    </svg>
  );
}

// tone="light" is used on dark (navy) backgrounds, tone="dark" on light ones.
export default function Logo({ tone = 'light', onClick }) {
  return (
    <Link to="/" className={`logo logo--${tone}`} onClick={onClick} aria-label="Artikly home">
      <LogoMark />
      <span className="logo__text">Artikly</span>
    </Link>
  );
}
