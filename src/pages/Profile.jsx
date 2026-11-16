import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/format';
import { validateRegister } from '../utils/validation';
import './Profile.css';

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ fullName: user.name, email: user.email, currentPassword: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({ profile: {}, password: {} });
  const [failure, setFailure] = useState({});
  const profileChange = (event) => setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));
  const passwordChange = (event) => setPasswords((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function saveProfile(event) {
    event.preventDefault();
    setBusy('profile');
    setFailure({});
    setErrors({ profile: {}, password: {} });
    try {
      const fresh = await updateProfile(profile);
      setProfile({ fullName: fresh.name, email: fresh.email, currentPassword: '' });
      showToast('Your profile has been updated.');
    } catch (error) {
      setFailure({ profile: error.message });
      setErrors((current) => ({ ...current, profile: error.errors || {} }));
    } finally { setBusy(''); }
  }
  async function savePassword(event) {
    event.preventDefault();
    const validation = validateRegister({ fullName: user.name, email: user.email, ...passwords });
    if (!passwords.currentPassword) validation.currentPassword = 'Enter your current password.';
    setErrors({ profile: {}, password: validation });
    setFailure({});
    if (Object.keys(validation).length) return;
    setBusy('password');
    try {
      await changePassword(passwords);
      showToast('Password changed. Log in again with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      setFailure({ password: error.message });
      setErrors((current) => ({ ...current, password: error.errors || {} }));
    } finally { setBusy(''); }
  }

  return (
    <div className="profile-page">
      <title>Profile settings · Artikly</title>
      <header className="dashboard__header">
        <div>
          <p className="dashboard__eyebrow">Your account</p>
          <h1 className="dashboard__title">Profile settings</h1>
          <p className="dashboard__subtitle">Keep your details up to date and your account secure.</p>
        </div>
      </header>
      <div className="profile-summary">
        <Avatar name={user.name} size="lg" />
        <div><strong>{user.name}</strong><p>Member since {formatDate(user.createdAt)}</p></div>
      </div>
      <div className="profile-grid">
        <section className="profile-card" aria-labelledby="profile-heading">
          <h2 id="profile-heading">Personal information</h2>
          <p>Your initials avatar updates automatically with your name.</p>
          {failure.profile && <Alert variant="error">{failure.profile}</Alert>}
          <form onSubmit={saveProfile} noValidate>
            <FormField id="profile-fullName" name="fullName" label="Full name" autoComplete="name"
              value={profile.fullName} onChange={profileChange} error={errors.profile.fullName} maxLength={255} required />
            <FormField id="profile-email" name="email" type="email" label="Email address" autoComplete="email"
              value={profile.email} onChange={profileChange} error={errors.profile.email} maxLength={255} required />
            {profile.email.trim().toLowerCase() !== user.email && <PasswordField
              id="profile-currentPassword" name="currentPassword" label="Current password"
              hint="Required to change your email address." autoComplete="current-password"
              value={profile.currentPassword} onChange={profileChange} error={errors.profile.currentPassword} required />}
            <Button type="submit" variant="dark" loading={busy === 'profile'} disabled={Boolean(busy)}>Save profile</Button>
          </form>
        </section>
        <section className="profile-card" aria-labelledby="password-heading">
          <h2 id="password-heading">Change password</h2>
          <p>After changing your password, you’ll sign in again on all devices.</p>
          {failure.password && <Alert variant="error">{failure.password}</Alert>}
          <form onSubmit={savePassword} noValidate>
            <PasswordField id="password-currentPassword" name="currentPassword" label="Current password"
              autoComplete="current-password" value={passwords.currentPassword} onChange={passwordChange}
              error={errors.password.currentPassword} required />
            <PasswordField id="password-password" name="password" label="New password" autoComplete="new-password"
              hint="At least 8 characters, including a letter and number; at most 72 UTF-8 bytes."
              value={passwords.password} onChange={passwordChange} error={errors.password.password} required />
            <PasswordField id="password-confirmPassword" name="confirmPassword" label="Confirm new password"
              autoComplete="new-password" value={passwords.confirmPassword} onChange={passwordChange}
              error={errors.password.confirmPassword} required />
            <Button type="submit" variant="dark" loading={busy === 'password'} disabled={Boolean(busy)}>Change password</Button>
          </form>
        </section>
      </div>
    </div>
  );
}
