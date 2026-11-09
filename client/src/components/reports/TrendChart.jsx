import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { LoadingSpinner, EmptyState } from '../common';
import styles from './TrendChart.module.css';

const SLOT_LABELS = {
  morning: 'Morning',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner'
};

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const slotLabel = SLOT_LABELS[data.time_slot] || data.time_slot;
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipDate}>{data.reading_date}</p>
        <p className={styles.tooltipSlot}>{slotLabel}</p>
        <p className={styles.tooltipValue}>
          {data.value} <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}>mg/dL</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function TrendChart({
  readings = [],
  month,
  onMonthChange,
  isLoading = false
}) {
  const hasData = readings && readings.length > 0;

  // Format chart data with display labels
  const chartData = readings.map((r, index) => ({
    ...r,
    index,
    shortDate: r.reading_date ? r.reading_date.slice(5) : '' // MM-DD
  }));

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.titleGroup}>
          <h3 className={styles.chartTitle}>Monthly Glucose Trend</h3>
          <span className={styles.chartSubtitle}>
            Recorded blood glucose values (mg/dL) across calendar month
          </span>
        </div>

        {onMonthChange && (
          <input
            type="month"
            className={styles.monthSelect}
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            aria-label="Select month for trend chart"
          />
        )}
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <LoadingSpinner size="md" variant="primary" label="Loading trend chart..." />
          <span>Loading monthly trend...</span>
        </div>
      ) : !hasData ? (
        <div className={styles.emptyContainer}>
          <EmptyState
            title="No trend data recorded"
            description={`No blood glucose readings logged for ${month}.`}
          />
        </div>
      ) : (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="shortDate"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                domain={[40, 'auto']}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                unit=" mg/dL"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                name="Glucose"
                stroke="#0d9488"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#0d9488', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
