import styles from './Alert.module.css';

/**
 * Default SVG icons for alert variants.
 */
function AlertIcon({ variant }) {
  if (variant === 'success') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707l-4.5 4.5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L8.5 10.586l3.793-3.793a1 1 0 011.414 1.414z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (variant === 'warning') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (variant === 'error') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          fill="currentColor"
        />
      </svg>
    );
  }

  // Default: info
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Reusable accessible alert banner for feedbacks, warnings, and error messages.
 *
 * @param {object} props
 * @param {'info' | 'success' | 'warning' | 'error'} [props.variant='info'] - Visual style variant
 * @param {string} [props.title] - Optional alert heading
 * @param {React.ReactNode} props.children - Alert body message
 * @param {Function} [props.onClose] - Callback when user dismisses the alert
 * @param {React.ReactNode} [props.icon] - Custom icon override
 * @param {string} [props.className=''] - Additional class name
 */
function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  icon,
  className = '',
  ...rest
}) {
  const alertClasses = [
    styles.alert,
    styles[variant] || styles.info,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div role={role} className={alertClasses} {...rest}>
      <div className={styles.iconWrapper}>
        {icon !== undefined ? icon : <AlertIcon variant={variant} />}
      </div>

      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.body}>{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          aria-label="Dismiss alert"
          className={styles.closeButton}
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Alert;
