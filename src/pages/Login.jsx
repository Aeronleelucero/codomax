import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import AuthShell from '../components/AuthShell';
import Button from '../components/Button';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { DEMO_CREDENTIALS } from '../data/users';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useFormState';
import { useToast } from '../hooks/useToast';
import { getFirstName } from '../utils/format';
import { focusFirstError, hasErrors, validateLogin } from '../utils/validation';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Set by ProtectedRoute (page the user wanted) or Register (new account).
  const redirectTo = location.state?.from ?? '/dashboard';
  const registeredEmail = location.state?.registeredEmail;

  const { values, setValues, touched, handleChange, handleBlur } = useFormState({
    email: registeredEmail ?? '',
    password: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Errors are derived from the current values on every render, so they
  // update as the user types. They are only shown after blur or submit.
  const errors = validateLogin(values);
  const visibleError = (field) => (submitted || touched[field] ? errors[field] : undefined);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFormError('');

    if (hasErrors(errors)) {
      focusFirstError(errors, 'login');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(values);
      showToast(`Welcome back, ${getFirstName(user.name)}! You are now logged in.`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error.message);
      setSubmitting(false);
    }
  }

  function fillDemoAccount() {
    setValues({ ...DEMO_CREDENTIALS });
    setFormError('');
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep writing and manage your articles."
      footer={
        <>
          New to Artikly? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <title>Log in · Artikly</title>

      {registeredEmail && !formError && (
        <Alert variant="success" title="Account created">
          You can now log in with your new account.
        </Alert>
      )}
      {location.state?.from && !registeredEmail && !formError && (
        <Alert variant="info">Please log in to continue to that page.</Alert>
      )}
      {formError && <Alert variant="error">{formError}</Alert>}

      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="login-email"
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
          id="login-password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={visibleError('password')}
          required
        />
        <Button type="submit" variant="dark" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <div className="demo-box">
        <span>
          Demo account: <code>{DEMO_CREDENTIALS.email}</code> / <code>{DEMO_CREDENTIALS.password}</code>
        </span>
        <Button variant="secondary" size="sm" onClick={fillDemoAccount}>
          Use demo account
        </Button>
      </div>

      <p className="auth__mock-note">
        Your password is checked by the Artikly server and stored only as a secure hash.
      </p>
    </AuthShell>
  );
}
