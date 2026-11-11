import { useEffect, useId, useRef } from 'react';
import Button from './Button';
import Icon from './Icon';
import './ConfirmDialog.css';

// Accessible confirmation modal built on the native <dialog> element.
// showModal() gives us a focus trap, the Escape key and a backdrop for free.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  // Sync the `open` prop with the browser's dialog API.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus the safe choice first so Enter never deletes by accident.
      cancelButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleCancel(event) {
    // The Escape key fires a "cancel" event; let React state stay in control.
    event.preventDefault();
    if (!loading) onCancel();
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current && !loading) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="confirm-dialog__panel">
        <div className={`confirm-dialog__icon confirm-dialog__icon--${variant}`}>
          <Icon name={variant === 'danger' ? 'trash' : 'alert'} size={22} />
        </div>
        <h2 id={titleId} className="confirm-dialog__title">
          {title}
        </h2>
        <div id={messageId} className="confirm-dialog__message">
          {message}
        </div>
        <div className="confirm-dialog__actions">
          <Button ref={cancelButtonRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'dark'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
