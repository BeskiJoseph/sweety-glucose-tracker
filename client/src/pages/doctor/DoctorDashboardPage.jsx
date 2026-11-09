import { useState, useEffect } from 'react';
import { doctorApi } from '../../services/api';
import { Button, LoadingSpinner, EmptyState, Alert } from '../../components/common';
import ReportsPage from '../reports/ReportsPage';
import styles from './DoctorDashboardPage.module.css';

export default function DoctorDashboardPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        setError(null);
        const res = await doctorApi.getPatients();
        if (res?.success && res.data) {
          setPatients(res.data);
        }
      } catch (err) {
        setError(err.message || 'Could not load assigned patients.');
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  if (selectedPatient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className={styles.doctorBanner} style={{ margin: '1.5rem auto 0 auto', maxWidth: 960, width: '100%' }}>
          <div>
            <h2 className={styles.bannerTitle}>Doctor View Mode (Read-Only)</h2>
            <p className={styles.bannerText}>
              Viewing clinical blood glucose reports for assigned patient: <strong>{selectedPatient.name}</strong> ({selectedPatient.email})
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
            ← Back to Patient List
          </Button>
        </div>

        <ReportsPage
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          onNavigateToDashboard={() => setSelectedPatient(null)}
        />
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.doctorBanner}>
        <div>
          <h2 className={styles.bannerTitle}>Healthcare Professional Portal</h2>
          <p className={styles.bannerText}>
            Access and analyze blood glucose metrics for your assigned patients.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Access Notice">
          {error}
        </Alert>
      )}

      <div className={styles.patientListCard}>
        <h2 className={styles.cardTitle}>Assigned Patients</h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <LoadingSpinner size="md" variant="primary" label="Loading patients" />
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            title="No assigned patients"
            description="Patients assigned to your doctor account will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {patients.map((patient) => (
              <div key={patient.id} className={styles.patientItem}>
                <div>
                  <h3 className={styles.patientName}>{patient.name}</h3>
                  <p className={styles.patientEmail}>{patient.email}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedPatient(patient)}
                >
                  View Reports
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
