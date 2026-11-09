import { useState, useEffect, useCallback } from 'react';
import { reportsApi, doctorApi } from '../../services/api';
import { Button, LoadingSpinner, EmptyState, Alert } from '../../components/common';
import ReportSummaryCard from '../../components/reports/ReportSummaryCard';
import TrendChart from '../../components/reports/TrendChart';
import ReadingItem from '../../components/readings/ReadingItem';
import styles from './ReportsPage.module.css';

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ReportsPage({
  patientId = null,
  patientName = null,
  onNavigateToDashboard = null
}) {
  const today = getTodayString();
  const currentMonth = today.slice(0, 7);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const [reportData, setReportData] = useState(null);
  const [trendReadings, setTrendReadings] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isLoadingTrend, setIsLoadingTrend] = useState(true);
  const [error, setError] = useState(null);

  // Load daily, MTD, and previous month reports
  const loadReports = useCallback(async () => {
    try {
      setIsLoadingReports(true);
      setError(null);
      // If patientId provided (doctor viewing patient), use doctor API, else reportsApi
      let res;
      if (patientId) {
        res = await doctorApi.getPatientReports(patientId, selectedDate);
      } else {
        res = await reportsApi.getReports(selectedDate);
      }

      if (res?.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Could not load report metrics.');
    } finally {
      setIsLoadingReports(false);
    }
  }, [selectedDate, patientId]);

  // Load trend readings for selected month
  const loadTrend = useCallback(async () => {
    try {
      setIsLoadingTrend(true);
      const res = await reportsApi.getTrend(selectedMonth);
      if (res?.success && res.data?.readings) {
        setTrendReadings(res.data.readings);
      } else {
        setTrendReadings([]);
      }
    } catch {
      setTrendReadings([]);
    } finally {
      setIsLoadingTrend(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!patientId) {
      loadTrend();
    }
  }, [loadTrend, patientId]);

  const daily = reportData?.daily;
  const monthToDate = reportData?.monthToDate;
  const monthly = reportData?.monthly;

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            {patientName ? `${patientName}'s Health Reports` : 'Glucose Analytics & Reports'}
          </h1>
          <p className={styles.subtitle}>
            Comprehensive daily breakdowns, month-to-date tracking, and historical metrics.
          </p>
        </div>

        {onNavigateToDashboard && (
          <Button variant="outline" size="sm" onClick={onNavigateToDashboard}>
            ← Back to Dashboard
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Report Error">
          {error}
        </Alert>
      )}

      {/* Date Filter Bar */}
      <div className={styles.filterBar}>
        <label className={styles.datePickerLabel}>
          <span>Select Report Date:</span>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Report Date"
          />
        </label>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          Aggregates auto-calculate for selected day, MTD, and previous calendar month
        </span>
      </div>

      {isLoadingReports ? (
        <div className={styles.loadingWrapper}>
          <LoadingSpinner size="lg" variant="primary" label="Loading reports" />
          <span>Calculating glucose metrics...</span>
        </div>
      ) : (
        <>
          <div className={styles.reportsGrid}>
            {/* Daily Report */}
            <div className={styles.fullWidth}>
              <ReportSummaryCard
                title="Daily Summary"
                subtitle={`Measurements recorded for ${selectedDate}`}
                count={daily?.count || 0}
                highest={daily?.highest}
                lowest={daily?.lowest}
                average={daily?.average}
              />
            </div>

            {/* Daily Breakdown of Readings */}
            <div className={styles.fullWidth}>
              <div className={styles.dayReadingsCard}>
                <h3 className={styles.dayReadingsTitle}>
                  Day Readings Breakdown ({selectedDate})
                </h3>

                {(!daily?.readings || daily.readings.length === 0) ? (
                  <EmptyState
                    title="No readings on this date"
                    description={`No blood glucose readings logged for ${selectedDate}.`}
                  />
                ) : (
                  <div className={styles.dayReadingsList}>
                    {daily.readings.map((reading) => (
                      <ReadingItem key={reading.id} reading={reading} readOnly />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Month to Date Report */}
            <ReportSummaryCard
              title="Month-to-Date (MTD)"
              subtitle={`From ${monthToDate?.startDate || ''} through ${monthToDate?.endDate || ''}`}
              count={monthToDate?.count || 0}
              highest={monthToDate?.highest}
              lowest={monthToDate?.lowest}
              average={monthToDate?.average}
            />

            {/* Previous Calendar Month Report */}
            <ReportSummaryCard
              title="Previous Month"
              subtitle={`Entire month of ${monthly?.month || ''} (${monthly?.startDate || ''} to ${monthly?.endDate || ''})`}
              count={monthly?.count || 0}
              highest={monthly?.highest}
              lowest={monthly?.lowest}
              average={monthly?.average}
            />

            {/* Monthly Trend Line Chart (Bonus 2) */}
            {!patientId && (
              <div className={styles.fullWidth}>
                <TrendChart
                  readings={trendReadings}
                  month={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  isLoading={isLoadingTrend}
                />
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
