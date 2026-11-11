import { useState } from 'react';

// Small reusable hook for controlled forms.
// - values:  current field values, keyed by the input's `name`
// - touched: fields the user has left at least once (used to show errors on blur)
export function useFormState(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function setFieldValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return { values, setValues, touched, handleChange, handleBlur, setFieldValue };
}
