import { Button } from '../common';
import styles from './Pagination.module.css';

export default function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  isLoading = false
}) {
  if (total === 0) return null;

  return (
    <div className={styles.pagination} aria-label="Pagination Navigation">
      <div className={styles.info}>
        Showing Page <span className={styles.pageNumber}>{page}</span> of{' '}
        <span className={styles.pageNumber}>{totalPages}</span> ({total} total readings)
      </div>

      <div className={styles.controls}>
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous Page"
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next Page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
