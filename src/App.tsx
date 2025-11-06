import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import AdminDashboard from './components/admin/AdminDashboard';
import ParticipantDashboard from './components/participant/ParticipantDashboard';
import VotingPage from './components/VotingPage';

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

  return (
    <>
      {user ? (
        user.role === 'admin' ? <AdminDashboard /> : <ParticipantDashboard />
      ) : view === 'login' ? (
        <LoginPage />
      ) : view === 'register' ? (
        <RegistrationPage onBackToLogin={() => setView('login')} />
      ) : (
        <LandingPage
          onLogin={() => setView('login')}
          onRegister={() => setView('register')}
        />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/vote" element={<VotingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;