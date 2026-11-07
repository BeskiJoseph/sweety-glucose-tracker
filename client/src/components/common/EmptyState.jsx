import styles from './EmptyState.module.css';

/**
 * Default empty state icon (healthcare / blood drop / clipboard motif).
 */
function DefaultEmptyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21.5c4.142 0 7.5-3.358 7.5-7.5 0-3.5-5.5-10.5-7.5-12.5C10 3.5 4.5 10.5 4.5 14c0 4.142 3.358 7.5 7.5 7.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v6M9 14h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Reusable empty state component for lists, dashboard cards, and tables.
 *
 * @param {object} props
 * @param {string} props.title - Primary empty-state headline
 * @param {string} [props.description] - Helpful description or guidance
 * @param {React.ReactNode} [props.icon] - Optional custom icon
 * @param {React.ReactNode} [props.action] - Optional call to action button/link
 * @param {string} [props.className=''] - Additional class name
 */
function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
  ...rest
}) {
  const containerClasses = [styles.emptyState, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} {...rest}>
      <div className={styles.iconWrapper}>
        {icon !== undefined ? icon : <DefaultEmptyIcon />}
      </div>

      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

export default EmptyState;
