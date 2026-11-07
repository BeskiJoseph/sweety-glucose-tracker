import LoadingSpinner from './LoadingSpinner';
import styles from './Button.module.css';

/**
 * Reusable accessible button component.
 *
 * @param {object} props
 * @param {'primary' | 'secondary' | 'outline' | 'danger'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {'button' | 'submit' | 'reset'} [props.type='button']
 * @param {boolean} [props.fullWidth=false]
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  fullWidth = false,
  icon = null,
  className = '',
  onClick,
  ...rest
}) {
  const isButtonDisabled = Boolean(disabled || loading);

  const buttonClasses = [
    styles.button,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    loading ? styles.loading : '',
    isButtonDisabled ? styles.disabled : '',
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Determine spinner color based on button variant
  const spinnerVariant =
    variant === 'primary' || variant === 'danger'
      ? 'white'
      : variant === 'secondary'
      ? 'secondary'
      : 'primary';

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={isButtonDisabled ? undefined : onClick}
      {...rest}
      disabled={isButtonDisabled}
      aria-disabled={isButtonDisabled}
      aria-busy={loading}
    >
      {loading && (
        <LoadingSpinner
          size={size === 'lg' ? 'md' : 'sm'}
          variant={spinnerVariant}
          label="Processing..."
        />
      )}
      {!loading && icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export default Button;
