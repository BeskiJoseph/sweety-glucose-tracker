import { useState } from 'react';
import { Card, Input, Button, Alert } from '../../components/common';
import styles from './LoginPage.module.css';

/**
 * Sweety Brand Logo Icon (Blood-drop healthcare motif).
 */
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

/**
 * Eye icon for showing password.
 */
function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Eye-off icon for hiding password.
 */
function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Professional healthcare Login Page for Sweety Blood Glucose Tracker.
 *
 * @param {object} props
 * @param {Function} [props.onNavigateToSignup] - Optional navigation handler
 * @param {Function} [props.onForgotPassword] - Optional forgot password handler
 */
function LoginPage({ onNavigateToSignup, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  const validate = () => {
    const newErrors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address (e.g. name@example.com)';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusNotice(null);

    const isValid = validate();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    // Demonstrate the button loading state; no backend credentials sent
    setTimeout(() => {
      setIsSubmitting(false);
      setStatusNotice({
        variant: 'info',
        title: 'Client validation passed',
        message:
          'Backend authentication will be integrated in the upcoming task. No network requests or mock logins were executed.',
      });
    }, 700);
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      setStatusNotice({
        variant: 'info',
        title: 'Password recovery',
        message: 'Password reset flow will be enabled with authentication services.',
      });
    }
  };

  const handleSignupClick = (e) => {
    e.preventDefault();
    if (onNavigateToSignup) {
      onNavigateToSignup();
    } else {
      setStatusNotice({
        variant: 'info',
        title: 'Account registration',
        message: 'The registration page will be connected in subsequent navigation setup.',
      });
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.authCard}>
        {/* Sweety Brand Header & Healthcare Intro */}
        <div className={styles.brandHeader}>
          <div className={styles.logoIcon} aria-hidden="true">
            <BrandLogo />
          </div>
          <h1 className={styles.brandName}>Sweety</h1>
          <p className={styles.brandTagline}>
            Track your daily blood glucose readings, monitor trends, and support your metabolic wellness.
          </p>
        </div>

        <Card elevation="raised" padding="lg">
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {statusNotice && (
              <div className={styles.notice}>
                <Alert
                  variant={statusNotice.variant}
                  title={statusNotice.title}
                  onClose={() => setStatusNotice(null)}
                >
                  {statusNotice.message}
                </Alert>
              </div>
            )}

            {/* Email Field */}
            <Input
              id="login-email"
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              error={errors.email}
              required
              disabled={isSubmitting}
            />

            {/* Password Field with Show/Hide Toggle */}
            <Input
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={errors.password}
              required
              disabled={isSubmitting}
              suffix={
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            {/* Remember Me & Forgot Password */}
            <div className={styles.formOptions}>
              <label htmlFor="login-remember" className={styles.checkboxLabel}>
                <input
                  id="login-remember"
                  type="checkbox"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className={styles.checkbox}
                />
                <span>Remember this device</span>
              </label>

              <a
                href="#forgot-password"
                onClick={handleForgotPasswordClick}
                className={styles.forgotLink}
              >
                Forgot password?
              </a>
            </div>

            {/* Login Action Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          {/* Link to Signup */}
          <p className={styles.footerText}>
            Don&apos;t have an account?{' '}
            <a
              href="#signup"
              onClick={handleSignupClick}
              className={styles.signupLink}
            >
              Create account
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
