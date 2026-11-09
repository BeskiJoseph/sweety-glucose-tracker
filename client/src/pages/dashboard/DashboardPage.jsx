import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context';
import { readingsApi, reportsApi } from '../../services/api';
import { Button, LoadingSpinner, EmptyState, Alert } from '../../components/common';
import ReadingForm from '../../components/readings/ReadingForm';
import ReadingItem from '../../components/readings/ReadingItem';
import Pagination from '../../components/readings/Pagination';
import styles from './DashboardPage.module.css';

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DashboardPage({ onNavigateToReports }) {
  const { user } = useAuth();
  const today = getTodayString();

  // State
  const [todayReadings, setTodayReadings] = useState([]);
  const [historyReadings, setHistoryReadings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingToday, setIsLoadingToday] = useState(true);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formServerError, setFormServerError] = useState(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState(null);

  // Load today's readings
  const loadTodayReadings = useCallback(async () => {
    try {
      setIsLoadingToday(true);
      const res = await reportsApi.getReports(today);
      if (res?.success && res.data?.daily?.readings) {
        setTodayReadings(res.data.daily.readings);
      } else {
        setTodayReadings([]);
      }
    } catch {
      setTodayReadings([]);
    } finally {
      setIsLoadingToday(false);
    }
  }, [today]);

  // Load paginated history
  const loadHistory = useCallback(async (targetPage = 1) => {
    try {
      setIsLoadingHistory(true);
      const res = await readingsApi.getAll({ page: targetPage, limit: 10 });
      if (res?.success) {
        setHistoryReadings(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch {
      setHistoryReadings([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadTodayReadings();
    loadHistory(1);
  }, [loadTodayReadings, loadHistory]);

  const handleOpenAdd = () => {
    setEditingReading(null);
    setFormServerError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (reading) => {
    setEditingReading(reading);
    setFormServerError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingReading(null);
    setFormServerError(null);
  };

  const handleSaveReading = async (payload) => {
    setIsSaving(true);
    setFormServerError(null);
    try {
      if (editingReading?.id) {
        await readingsApi.update(editingReading.id, payload);
        setFeedback({
          variant: 'success',
          title: 'Reading Updated',
          message: 'Blood glucose reading successfully updated.'
        });
      } else {
        await readingsApi.create(payload);
        setFeedback({
          variant: 'success',
          title: 'Reading Saved',
          message: 'Blood glucose reading successfully logged.'
        });
      }
      handleCloseForm();
      await Promise.all([loadTodayReadings(), loadHistory(pagination.page)]);
    } catch (err) {
      setFormServerError(err.message || 'Failed to save reading. Please check your entries.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReading = async (reading) => {
    if (!window.confirm(`Are you sure you want to delete this ${reading.time_slot} reading?`)) {
      return;
    }

    try {
      await readingsApi.delete(reading.id);
      setFeedback({
        variant: 'success',
        title: 'Reading Deleted',
        message: 'The blood glucose reading was deleted successfully.'
      });

      // If this was the only item on the current page (and not page 1), move back one page
      const newPage =
        historyReadings.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await Promise.all([loadTodayReadings(), loadHistory(newPage)]);
    } catch (err) {
      setFeedback({
        variant: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Could not delete reading. Please try again.'
      });
    }
  };

  const todayCount = todayReadings.length;
  const isMaxDaily = todayCount >= 4;

  return (
    <main className={styles.page}>
      {/* Welcome Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcomeTitle}>Welcome back, {user?.name}</h1>
          <p className={styles.subtitle}>
            Monitor your blood glucose entries, review daily milestones, and track metabolic health.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="primary" onClick={handleOpenAdd}>
            + Log Reading
          </Button>
          {onNavigateToReports && (
            <Button variant="outline" onClick={onNavigateToReports}>
              View Reports
            </Button>
          )}
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <Alert
          variant={feedback.variant}
          title={feedback.title}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Today's Readings Section */}
      <section className={styles.todaySection} aria-labelledby="today-heading">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 id="today-heading" className={styles.sectionTitle}>
              Today&apos;s Readings
            </h2>
            <span
              className={`${styles.countBadge} ${
                isMaxDaily ? styles.countBadgeComplete : ''
              }`}
            >
              {todayCount} of 4 logged
            </span>
          </div>

          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            {today}
          </span>
        </div>

        {isLoadingToday ? (
          <div className={styles.loadingWrapper}>
            <LoadingSpinner size="md" variant="primary" label="Loading today's readings" />
            <span>Loading today&apos;s entries...</span>
          </div>
        ) : todayReadings.length === 0 ? (
          <EmptyState
            title="No readings recorded today"
            description="Log your morning, post-breakfast, post-lunch, or post-dinner readings to stay on track."
            action={
              <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                Log First Reading
              </Button>
            }
          />
        ) : (
          <div className={styles.todayList}>
            {todayReadings.map((reading) => (
              <ReadingItem
                key={reading.id}
                reading={reading}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteReading}
              />
            ))}
          </div>
        )}
      </section>

      {/* All Reading History with Pagination */}
      <section className={styles.historySection} aria-labelledby="history-heading">
        <div className={styles.sectionHeader}>
          <h2 id="history-heading" className={styles.sectionTitle}>
            Reading History
          </h2>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            Reverse chronological log
          </span>
        </div>

        {isLoadingHistory ? (
          <div className={styles.loadingWrapper}>
            <LoadingSpinner size="md" variant="primary" label="Loading history" />
            <span>Loading readings history...</span>
          </div>
        ) : historyReadings.length === 0 ? (
          <EmptyState
            title="No history recorded yet"
            description="Your past blood glucose measurements will appear here once you start logging."
          />
        ) : (
          <>
            <div className={styles.historyList}>
              {historyReadings.map((reading) => (
                <ReadingItem
                  key={reading.id}
                  reading={reading}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteReading}
                />
              ))}
            </div>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              isLoading={isLoadingHistory}
              onPageChange={(newPage) => loadHistory(newPage)}
            />
          </>
        )}
      </section>

      {/* Add / Edit Reading Modal */}
      {isFormOpen && (
        <ReadingForm
          key={editingReading?.id || 'new'}
          initialData={editingReading}
          onSave={handleSaveReading}
          onCancel={handleCloseForm}
          isLoading={isSaving}
          serverError={formServerError}
        />
      )}
    </main>
  );
}
