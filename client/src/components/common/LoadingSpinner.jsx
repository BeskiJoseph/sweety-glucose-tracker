import styles from './LoadingSpinner.module.css';

/**
 * Reusable accessible loading spinner.
 *
 * @param {object} props
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Spinner dimensions
 * @param {'primary' | 'secondary' | 'white' | 'current'} [props.variant='primary'] - Color variant
 * @param {string} [props.label='Loading...'] - Accessible text for screen readers
 * @param {string} [props.className=''] - Additional CSS classes
 */
function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  className = '',
  ...rest
}) {
  const spinnerClasses = [
    styles.spinner,
    styles[size] || styles.md,
    styles[variant] || styles.primary,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      role="status"
      aria-live="polite"
      className={spinnerClasses}
      {...rest}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        width="100%"
        height="100%"
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2.5C6.75329 2.5 2.5 6.75329 2.5 12"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export default LoadingSpinner;
