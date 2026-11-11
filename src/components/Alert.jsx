import Icon from './Icon';
import './Alert.css';

const ICON_BY_VARIANT = { success: 'check', error: 'alert', info: 'info', warning: 'alert' };

// Inline message box. Errors use role="alert" so screen readers announce them
// immediately; other variants use the politer role="status".
export default function Alert({ variant = 'info', title, children }) {
  return (
    <div className={`alert alert--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon name={ICON_BY_VARIANT[variant]} size={20} className="alert__icon" />
      <div>
        {title && <p className="alert__title">{title}</p>}
        <div className="alert__body">{children}</div>
      </div>
    </div>
  );
}
