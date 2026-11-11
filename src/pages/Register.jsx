import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import AuthShell from '../components/AuthShell';
import Button from '../components/Button';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useFormState';
import {
  focusFirstError,
  hasErrors,
  PASSWORD_MIN_LENGTH,
  validateRegister,
} from '../utils/validation';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const { values, touched, handleChange, handleBlur } = useFormState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const errors = validateRegister(values);
  const visibleError = (field) => (submitted || touched[field] ? errors[field] : undefined);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFormError('');

    if (hasErrors(errors)) {
      focusFirstError(errors, 'register');
      return;
    }

    setSubmitting(true);
    try {
      await register(values);
      // Send the new user to Login with their email pre-filled.
      navigate('/login', { state: { registeredEmail: values.email.trim() } });
    } catch (error) {
      setFormError(error.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start writing and sharing what you learn."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <title>Create an account · Codomax</title>

      {formError && <Alert variant="error">{formError}</Alert>}

      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="register-fullName"
          name="fullName"
          label="Full name"
          placeholder="Alex Morgan"
          autoComplete="name"
          value={values.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={visibleError('fullName')}
          required
        />
        <FormField
          id="register-email"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={visibleError('email')}
          required
        />
        <PasswordField
          id="register-password"
          name="password"
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters, including a letter and a number.`}
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={visibleError('password')}
          required
        />
        <PasswordField
          id="register-confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={visibleError('confirmPassword')}
          required
        />
        <Button type="submit" variant="dark" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="auth__mock-note">
        Mock registration: your account is saved in this browser only. Please don’t reuse a real
        password.
      </p>
    </AuthShell>
  );
}
