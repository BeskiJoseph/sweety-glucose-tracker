import styles from './Card.module.css';

/**
 * Reusable surface container for dashboard cards, widgets, and forms.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title] - Card header title
 * @param {React.ReactNode} [props.subtitle] - Card header subtitle or description
 * @param {React.ReactNode} [props.action] - Action slot rendered in the top-right of the header
 * @param {React.ReactNode} [props.footer] - Card footer slot
 * @param {'none' | 'sm' | 'md' | 'lg'} [props.padding='md'] - Internal padding level
 * @param {'flat' | 'raised' | 'interactive'} [props.elevation='raised'] - Shadow and interactive behavior
 * @param {React.ReactNode} props.children - Main card content
 * @param {string} [props.className=''] - Additional CSS classes
 */
function Card({
  title,
  subtitle,
  action,
  footer,
  padding = 'md',
  elevation = 'raised',
  children,
  className = '',
  ...rest
}) {
  const paddingClass =
    padding === 'none'
      ? styles.paddingNone
      : padding === 'sm'
      ? styles.paddingSm
      : padding === 'lg'
      ? styles.paddingLg
      : styles.paddingMd;

  const cardClasses = [
    styles.card,
    styles[elevation] || styles.raised,
    paddingClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader = Boolean(title || subtitle || action);

  return (
    <div className={cardClasses} {...rest}>
      {hasHeader && (
        <div className={styles.header}>
          <div className={styles.headerText}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}

      <div className={styles.body}>{children}</div>

      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}

export default Card;
