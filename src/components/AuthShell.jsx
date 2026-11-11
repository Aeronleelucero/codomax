import Icon from './Icon';
import './AuthShell.css';

const HIGHLIGHTS = [
  'Write in a distraction-free editor',
  'Save drafts and publish when you are ready',
  'Manage every post from one dashboard',
];

// Shared two-column frame for the Login and Register pages.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <div className="container auth__inner">
        <aside className="auth__brand" aria-hidden="true">
          <p className="auth__quote">
            “The best way to learn something is to <em>write</em> about it.”
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
