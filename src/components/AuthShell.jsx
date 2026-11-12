import Icon from './Icon';
import { LogoMark } from './Logo';
import './AuthShell.css';

const HIGHLIGHTS = [
  'Write in a calm, distraction-free editor',
  'Save drafts and publish when you are ready',
  'Manage every article from your Creator Dashboard',
];

// Shared two-column frame for the Login and Register pages.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <div className="container auth__inner">
        <aside className="auth__brand" aria-hidden="true">
          <LogoMark className="auth__mark" />
          <p className="auth__quote">
            Every idea deserves a <em>story</em>.
          </p>
          <ul className="auth__highlights">
            {HIGHLIGHTS.map((item) => (
              <li key={item}>
                <span className="auth__check">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <section className="auth__card">
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
          {footer && <p className="auth__footer">{footer}</p>}
        </section>
      </div>
    </div>
  );
}
