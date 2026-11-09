import { Button } from '../common';
import styles from './ReadingItem.module.css';

const SLOT_MAP = {
  morning: { label: 'Morning', className: styles.slotMorning },
  after_breakfast: { label: 'After breakfast', className: styles.slotAfterBreakfast },
  after_lunch: { label: 'After lunch', className: styles.slotAfterLunch },
  after_dinner: { label: 'After dinner', className: styles.slotAfterDinner }
};

export default function ReadingItem({
  reading,
  onEdit,
  onDelete,
  readOnly = false
}) {
  const slotInfo = SLOT_MAP[reading.time_slot] || {
    label: reading.time_slot,
    className: styles.slotMorning
  };

  return (
    <div className={styles.card} data-testid="reading-item">
      <div className={styles.leftGroup}>
        <span className={`${styles.slotBadge} ${slotInfo.className}`}>
          {slotInfo.label}
        </span>
        <div className={styles.metaGroup}>
          <span className={styles.dateText}>{reading.reading_date}</span>
        </div>
      </div>

      <div className={styles.valueGroup}>
        <span className={styles.valueNumber}>{reading.value}</span>
        <span className={styles.valueUnit}>mg/dL</span>
      </div>

      {!readOnly && (
        <div className={styles.actionsGroup}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(reading)}
            aria-label={`Edit ${slotInfo.label} reading`}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(reading)}
            aria-label={`Delete ${slotInfo.label} reading`}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
