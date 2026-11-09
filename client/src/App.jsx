import { useState } from 'react';
import { AuthProvider, useAuth } from './context';
import Navbar from './components/layout/Navbar';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ReportsPage from './pages/reports/ReportsPage';
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage';
import { LoadingSpinner } from './components/common';
import styles from './App.module.css';

function MainApp() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'reports' | 'doctor'

  if (loading) {
    return (
      <div className={styles.fullPageLoader}>
        <LoadingSpinner size="lg" variant="primary" label="Restoring session..." />
        <span style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Restoring Sweety session...
        </span>
      </div>
    );
  }

  // Unauthenticated view: Login or Register
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateToSignup={() => setAuthView('register')} />;
  }

  // Doctor user view
  if (user.role === 'doctor') {
    return (
      <div className={styles.appContainer}>
        <Navbar activeTab="doctor" onTabChange={() => setActiveTab('doctor')} />
        <DoctorDashboardPage />
      </div>
    );
  }

  // Patient user view
  return (
    <div className={styles.appContainer}>
      <Navbar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      {activeTab === 'dashboard' ? (
        <DashboardPage onNavigateToReports={() => setActiveTab('reports')} />
      ) : (
        <ReportsPage onNavigateToDashboard={() => setActiveTab('dashboard')} />
      )}
    </div>
  );
}

export { MainApp };
export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
