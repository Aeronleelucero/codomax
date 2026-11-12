import { useCallback, useMemo, useState } from 'react';
import { ToastContext } from './ToastContext';
import ToastStack from '../components/ToastStack';
import { createId } from '../utils/id';

const TOAST_DURATION_MS = 4500;

// Provides showToast(message, type) to any component. Toasts live at the root
// of the app, so they stay visible while the user is redirected between pages.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = createId('toast');
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
