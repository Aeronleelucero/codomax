import Icon from './Icon';

// Shared building blocks for "loading", "error" and "nothing here" states,
// so every page handles unexpected situations the same way.

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="page-state" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon = 'file', title, children, actions }) {
  return (
    <div className="page-state">
      <div className="page-state__icon">
        <Icon name={icon} size={26} />
      </div>
      <h2 className="page-state__title">{title}</h2>
      {children && <p className="page-state__text">{children}</p>}
      {actions && <div className="page-state__actions">{actions}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', children, actions }) {
  return (
    <div className="page-state" role="alert">
      <div className="page-state__icon">
        <Icon name="alert" size={26} />
      </div>
      <h2 className="page-state__title">{title}</h2>
      <p className="page-state__text">
        {children ?? 'We could not load this content. Please try again.'}
      </p>
      {actions && <div className="page-state__actions">{actions}</div>}
    </div>
  );
}
