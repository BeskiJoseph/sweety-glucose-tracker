import { useState } from 'react';
import { Card, Input, Button, Alert } from '../../components/common';
import { useAuth } from '../../context';
import styles from './RegisterPage.module.css';

function BrandLogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      <path d="M9 13h2l1-2 2 4 1-2h2" />
    </svg>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage({ onNavigateToLogin }) {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password
      });
      // Registration automatically signs in and updates auth context
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.authCard}>
        <div className={styles.brandHeader}>
          <div className={styles.logoIcon} aria-hidden="true">
            <BrandLogo />
          </div>
          <h1 className={styles.brandName}>Create Sweety Account</h1>
          <p className={styles.brandTagline}>
            Start tracking your blood glucose and managing your health today.
          </p>
        </div>

        <Card elevation="raised" padding="lg">
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {serverError && (
              <div className={styles.notice}>
                <Alert
                  variant="error"
                  title="Registration Error"
                  onClose={() => setServerError(null)}
                >
                  {serverError}
                </Alert>
              </div>
            )}

            <Input
              id="register-name"
              label="Full Name"
              type="text"
              name="name"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              error={errors.name}
              required
              disabled={isSubmitting}
            />

            <Input
              id="register-email"
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              required
              disabled={isSubmitting}
            />

            <Input
              id="register-password"
              label="Password"
              type="password"
              name="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
              disabled={isSubmitting}
            />

            <Input
              id="register-confirm-password"
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
              required
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          <p className={styles.footerText}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className={styles.signinLink}
            >
              Sign in
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
