import { useState } from 'react';
import FormField from './FormField';
import Icon from './Icon';

// A FormField with a show/hide toggle. Each password field keeps its own
// visibility state, so "Password" and "Confirm password" toggle independently.
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  const toggle = (
    <button
      type="button"
      className="field__toggle"
      onClick={() => setVisible((v) => !v)}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      aria-controls={props.id}
    >
      <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
    </button>
  );

  return <FormField {...props} type={visible ? 'text' : 'password'} trailing={toggle} />;
}
