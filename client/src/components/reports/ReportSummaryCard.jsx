import styles from './ReportSummaryCard.module.css';

export default function ReportSummaryCard({
  title,
  subtitle,
  count = 0,
  highest = null,
  lowest = null,
  average = null
}) {
  return (
    <div className={styles.card} data-testid="report-summary-card">
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Total Readings</span>
          <span className={styles.metricValue}>{count}</span>
        </div>

        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Average</span>
          <span className={styles.metricValue}>
            {average !== null ? (
              <>
                {average} <span className={styles.metricUnit}>mg/dL</span>
              </>
            ) : (
              '—'
            )}
          </span>
        </div>

        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Highest</span>
          <span className={styles.metricValue}>
            {highest !== null ? (
              <>
                {highest} <span className={styles.metricUnit}>mg/dL</span>
              </>
            ) : (
              '—'
            )}
          </span>
        </div>

        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Lowest</span>
          <span className={styles.metricValue}>
            {lowest !== null ? (
              <>
                {lowest} <span className={styles.metricUnit}>mg/dL</span>
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
