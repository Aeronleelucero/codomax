import Icon from './Icon';
import './FormField.css';

// A labelled form control with optional hint, counter and error message.
// The `as` prop picks the element: "input" (default), "textarea" or "select".
// Error and hint text are linked with aria-describedby so screen readers
// announce them together with the field.
export default function FormField({
  id,
  label,
  as: Control = 'input',
  error,
  hint,
  counter,
  trailing,
  className = '',
  children,
  ...controlProps
}) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--invalid' : ''} ${className}`.trim()}>
      <div className="field__label-row">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        {counter && <span className="field__counter">{counter}</span>}
      </div>

      <div className={`field__control-wrap ${trailing ? 'field__control-wrap--trailing' : ''}`}>
        <Control
          id={id}
          className="field__control"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...controlProps}
        >
          {children}
        </Control>
        {trailing && <div className="field__trailing">{trailing}</div>}
      </div>

      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
