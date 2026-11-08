import { useState } from 'react';
import { Button, Input, Alert } from '../common';
import styles from './ReadingForm.module.css';

const TIME_SLOTS = [
  { key: 'morning', label: 'Morning' },
  { key: 'after_breakfast', label: 'After breakfast' },
  { key: 'after_lunch', label: 'After lunch' },
  { key: 'after_dinner', label: 'After dinner' }
];

/**
 * Get current calendar date string in YYYY-MM-DD.
 */
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Form for adding or editing blood glucose readings.
 * Enforces exact assignment validation rules and messages.
 *
 * @param {object} props
 * @param {object|null} [props.initialData] - Data if editing existing reading
 * @param {Function} props.onSave - Callback receiving reading payload
 * @param {Function} props.onCancel - Callback when cancelled or closed
 * @param {boolean} [props.isLoading] - Save loading indicator
 * @param {string|null} [props.serverError] - Backend validation error
 */
export default function ReadingForm({
  initialData = null,
  onSave,
  onCancel,
  isLoading = false,
  serverError = null
}) {
  const isEditing = Boolean(initialData?.id);
  const today = getTodayDateString();

  const [readingDate, setReadingDate] = useState(
    initialData?.reading_date || initialData?.readingDate || today
  );
  const [timeSlot, setTimeSlot] = useState(
    initialData?.time_slot || initialData?.timeSlot || 'morning'
  );
  const [value, setValue] = useState(
    initialData?.value !== undefined ? String(initialData.value) : ''
  );
  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errors = {};

    // 1. Missing value check
    if (value === undefined || value === null || value.trim() === '') {
      errors.value = 'Please enter a glucose value.';
    } else {
      // 2. Integer and 40-600 range check
      const trimmed = value.trim();
      const num = Number(trimmed);
      if (!/^\d+$/.test(trimmed) || !Number.isInteger(num) || num < 40 || num > 600) {
        errors.value = 'Value must be between 40 and 600 mg/dl.';
      }
    }

    // 3. Date checks
    if (!readingDate) {
      errors.readingDate = 'Please select a date.';
    } else if (readingDate > today) {
      errors.readingDate = 'Date cannot be in the future.';
    }

    // 4. Time slot check
    if (!timeSlot || !TIME_SLOTS.some((s) => s.key === timeSlot)) {
      errors.timeSlot = 'Please select a valid time slot.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    onSave({
      reading_date: readingDate,
      time_slot: timeSlot,
      value: parseInt(value.trim(), 10)
    });
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEditing ? 'Edit Glucose Reading' : 'Log Blood Glucose Reading'}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {serverError && (
            <Alert variant="error" title="Validation Error">
              {serverError}
            </Alert>
          )}

          {/* Date Picker */}
          <Input
            id="reading-date"
            label="Reading Date"
            type="date"
            name="readingDate"
            max={today}
            value={readingDate}
            onChange={(e) => {
              setReadingDate(e.target.value);
              if (validationErrors.readingDate) {
                setValidationErrors((prev) => ({ ...prev, readingDate: undefined }));
              }
            }}
            error={validationErrors.readingDate}
            required
            disabled={isLoading}
          />

          {/* Time Slot Picker */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Time Slot <span className={styles.required}>*</span>
            </label>
            <div className={styles.slotGrid} role="radiogroup" aria-label="Time Slot">
              {TIME_SLOTS.map((slot) => {
                const isSelected = timeSlot === slot.key;
                return (
                  <button
                    key={slot.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`${styles.slotButton} ${
                      isSelected ? styles.slotButtonSelected : ''
                    }`}
                    onClick={() => {
                      setTimeSlot(slot.key);
                      if (validationErrors.timeSlot) {
                        setValidationErrors((prev) => ({ ...prev, timeSlot: undefined }));
                      }
                    }}
                    disabled={isLoading}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
            {validationErrors.timeSlot && (
              <span className={styles.errorText}>{validationErrors.timeSlot}</span>
            )}
          </div>

          {/* Glucose Value Input */}
          <Input
            id="glucose-value"
            label="Blood Glucose Level (mg/dL)"
            type="number"
            name="value"
            placeholder="e.g. 110"
            helperText="Standard range: 40 to 600 mg/dL"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (validationErrors.value) {
                setValidationErrors((prev) => ({ ...prev, value: undefined }));
              }
            }}
            error={validationErrors.value}
            required
            disabled={isLoading}
          />

          {/* Actions */}
          <div className={styles.actions}>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
            >
              {isEditing ? 'Save Changes' : 'Save Reading'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
