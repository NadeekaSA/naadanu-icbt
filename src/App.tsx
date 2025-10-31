import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import AdminDashboard from './components/admin/AdminDashboard';
import ParticipantDashboard from './components/participant/ParticipantDashboard';

type View = 'landing' | 'login' | 'register';

function AppContent() {
  const [view, setView] = useState<View>('landing');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    if (user.role === 'admin') {
      return <AdminDashboard />;
    } else if (user.role === 'participant') {
      return <ParticipantDashboard />;
    }
  }

  if (view === 'login') {
    return <LoginPage />;
  }

  if (view === 'register') {
    return <RegistrationPage onBackToLogin={() => setView('login')} />;
  }

  return (
    <LandingPage
      onLogin={() => setView('login')}
      onRegister={() => setView('register')}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
