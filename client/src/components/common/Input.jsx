import { useId } from 'react';
import styles from './Input.module.css';

/**
 * Reusable accessible input component.
 *
 * @param {object} props
 * @param {string} [props.id] - Element ID (auto-generated if omitted)
 * @param {string} [props.label] - Accessible label text
 * @param {string} [props.type='text'] - Input type (text, number, email, password, date, etc.)
 * @param {string} [props.placeholder] - Input placeholder
 * @param {string} [props.error] - Error message (sets aria-invalid and error styling)
 * @param {string} [props.helperText] - Hint text displayed below input when no error
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.required=false] - Required indicator and attribute
 * @param {string} [props.className=''] - Container class name
 */
function Input({
  id: customId,
  label,
  type = 'text',
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  value,
  onChange,
  ...rest
}) {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const hasError = Boolean(error);
  const describedBy = hasError ? errorId : helperText ? helperId : undefined;

  const containerClasses = [
    styles.container,
    hasError ? styles.hasError : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <div className={styles.labelWrapper}>
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && (
              <span className={styles.requiredIndicator} aria-hidden="true">
                *
              </span>
            )}
          </label>
        </div>
      )}

      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={value}
          onChange={onChange}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={styles.input}
          {...rest}
        />
      </div>

      {hasError && (
        <p id={errorId} role="alert" className={`${styles.message} ${styles.errorText}`}>
          {error}
        </p>
      )}

      {!hasError && helperText && (
        <p id={helperId} className={`${styles.message} ${styles.helperText}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}

export default Input;
