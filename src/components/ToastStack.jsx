import Icon from './Icon';
import './ToastStack.css';

const ICON_BY_TYPE = { success: 'check', error: 'alert', info: 'info' };

// Renders the toast notifications created with useToast().showToast().
// aria-live makes screen readers read new toasts without moving focus.
export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`} role="status">
          <span className="toast__icon">
            <Icon name={ICON_BY_TYPE[toast.type] ?? 'info'} size={16} strokeWidth={2.5} />
          </span>
          <p className="toast__message">{toast.message}</p>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
