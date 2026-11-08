import { useAuth } from '../../context';
import { Button } from '../common';
import styles from './Navbar.module.css';

function BrandIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      <path d="M9 13h2l1-2 2 4 1-2h2" />
    </svg>
  );
}

export default function Navbar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isDoctor = user.role === 'doctor';

  return (
    <nav className={styles.navbar} aria-label="Main Navigation">
      <div
        className={styles.brandGroup}
        onClick={() => onTabChange(isDoctor ? 'doctor' : 'dashboard')}
        role="button"
        tabIndex={0}
      >
        <div className={styles.brandLogo} aria-hidden="true">
          <BrandIcon />
        </div>
        <h1 className={styles.brandTitle}>Sweety</h1>
      </div>

      <div className={styles.navLinks}>
        {!isDoctor && (
          <>
            <button
              type="button"
              className={`${styles.navButton} ${activeTab === 'dashboard' ? styles.navButtonActive : ''}`}
              onClick={() => onTabChange('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${activeTab === 'reports' ? styles.navButtonActive : ''}`}
              onClick={() => onTabChange('reports')}
            >
              Reports & Trends
            </button>
          </>
        )}

        {isDoctor && (
          <button
            type="button"
            className={`${styles.navButton} ${activeTab === 'doctor' ? styles.navButtonActive : ''}`}
            onClick={() => onTabChange('doctor')}
          >
            Assigned Patients
          </button>
        )}
      </div>

      <div className={styles.userGroup}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span
            className={`${styles.roleBadge} ${
              isDoctor ? styles.roleDoctor : styles.rolePatient
            }`}
          >
            {user.role || 'patient'}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
