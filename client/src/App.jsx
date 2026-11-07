import { useState } from 'react';
import {
  Button,
  Input,
  Card,
  Alert,
  LoadingSpinner,
  EmptyState,
} from './components/common';
import styles from './App.module.css';

function App() {
  const [showAlert, setShowAlert] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <main className={styles.showcaseContainer}>
      <header className={styles.showcaseHeader}>
        <div className={styles.brandBadge}>
          <span className={styles.brandDot} aria-hidden="true" />
          <span>Sweety Design System</span>
        </div>
        <h1 className={styles.headerTitle}>Blood Glucose Tracker UI Foundation</h1>
        <p className={styles.headerSubtitle}>
          Modern, accessible, healthcare-focused UI component library built for Sweety.
        </p>
      </header>

      {/* Buttons Showcase */}
      <section className={styles.section} aria-labelledby="buttons-heading">
        <h2 id="buttons-heading" className={styles.sectionTitle}>
          Buttons
        </h2>
        <p className={styles.sectionDescription}>
          Variants (primary, secondary, outline, danger) and states (default, loading, disabled).
        </p>

        <div className={styles.row}>
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="outline">Outline Action</Button>
          <Button variant="danger">Delete Reading</Button>
        </div>

        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button
            loading={isLoading}
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 1500);
            }}
          >
            {isLoading ? 'Saving...' : 'Click to Load'}
          </Button>
          <Button disabled>Disabled Button</Button>
        </div>
      </section>

      {/* Inputs Showcase */}
      <section className={styles.section} aria-labelledby="inputs-heading">
        <h2 id="inputs-heading" className={styles.sectionTitle}>
          Form Inputs
        </h2>
        <p className={styles.sectionDescription}>
          Accessible inputs with labels, helper texts, required indicators, and validation states.
        </p>

        <div className={styles.gridTwo}>
          <Input
            id="sample-standard"
            label="Blood Glucose Level"
            placeholder="e.g. 110"
            helperText="Enter your measured value in mg/dL (e.g. 110)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input
            id="sample-error"
            label="Measured Time"
            type="time"
            error="Please enter a valid measurement timestamp"
            defaultValue="08:30"
            required
          />
          <Input
            id="sample-disabled"
            label="Patient ID (Read-only)"
            value="PT-2026-084"
            disabled
          />
          <Input
            id="sample-notes"
            label="Context Tag"
            placeholder="Before breakfast, post-meal..."
            helperText="Optional context tag for reports"
          />
        </div>
      </section>

      {/* Alerts Showcase */}
      <section className={styles.section} aria-labelledby="alerts-heading">
        <h2 id="alerts-heading" className={styles.sectionTitle}>
          Alerts & Feedback
        </h2>
        <p className={styles.sectionDescription}>
          Semantic feedback banners supporting title, body content, and accessible dismissal.
        </p>

        <div className={styles.stack}>
          {showAlert && (
            <Alert
              variant="info"
              title="Welcome to Sweety"
              onClose={() => setShowAlert(false)}
            >
              The reusable component design system is initialized with accessible contrast and healthcare tokens.
            </Alert>
          )}

          <Alert variant="success" title="Reading Saved">
            Your blood glucose reading has been successfully saved to your log.
          </Alert>

          <Alert variant="warning" title="Reminder">
            No evening reading has been recorded for today yet.
          </Alert>

          <Alert variant="error" title="Unable to Save">
            Could not save the reading due to a network connection issue. Please try again.
          </Alert>
        </div>
      </section>

      {/* Cards Showcase */}
      <section className={styles.section} aria-labelledby="cards-heading">
        <h2 id="cards-heading" className={styles.sectionTitle}>
          Surfaces & Cards
        </h2>
        <p className={styles.sectionDescription}>
          Elevated surfaces with optional titles, subtitles, top-right action slots, and footers.
        </p>

        <div className={styles.gridCards}>
          <Card
            title="Today's Overview"
            subtitle="Summary of recent entries"
            action={<Button size="sm" variant="outline">View All</Button>}
            footer={<span>Last sync: Just now</span>}
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Card container cleanly organizes healthcare metrics, charts, and summary panels.
            </p>
          </Card>

          <Card
            title="Log Entry Form"
            subtitle="Record current blood glucose"
            elevation="raised"
            padding="md"
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Standard surface container with subtle border and accessible shadow elevation.
            </p>
          </Card>
        </div>
      </section>

      {/* Spinners Showcase */}
      <section className={styles.section} aria-labelledby="spinners-heading">
        <h2 id="spinners-heading" className={styles.sectionTitle}>
          Loading Indicators
        </h2>
        <p className={styles.sectionDescription}>
          Accessible, lightweight SVG spinners for asynchronous tasks and button indicators.
        </p>

        <div className={styles.row}>
          <LoadingSpinner size="sm" variant="primary" label="Loading small" />
          <LoadingSpinner size="md" variant="primary" label="Loading medium" />
          <LoadingSpinner size="lg" variant="primary" label="Loading large" />
          <LoadingSpinner size="md" variant="secondary" label="Loading lavender" />
        </div>
      </section>

      {/* Empty State Showcase */}
      <section className={styles.section} aria-labelledby="empty-heading">
        <h2 id="empty-heading" className={styles.sectionTitle}>
          Empty State
        </h2>
        <p className={styles.sectionDescription}>
          User-friendly placeholder for empty log lists, missing data, and unconfigured views.
        </p>

        <EmptyState
          title="No glucose readings recorded yet"
          description="Log your daily blood glucose readings to view your history and track your entries over time."
          action={<Button variant="primary">Add First Reading</Button>}
        />
      </section>
    </main>
  );
}

export default App;
