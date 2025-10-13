import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import UserRegistration from './pages/UserRegistration';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import CreateIncident from './pages/CreateIncident';
import EditIncident from './pages/EditIncident';
import ChatPage from './pages/Chat';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Documents from './pages/Documents';
import Templates from './pages/Templates';
import Monitoring from './pages/Monitoring';
import Reports from './pages/Reports';
import Users from './pages/Users';
import InviteAcceptance from './pages/InviteAcceptance';
import Profile from './pages/Profile';
import DeletedIncidents from './pages/DeletedIncidents';
import LoadingSpinner from './components/LoadingSpinner';
import AuthCallback from './components/AuthCallback';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<UserRegistration />} />
        <Route path="/invite/:token" element={<InviteAcceptance />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/new" element={<CreateIncident />} />
        <Route path="/incidents/:id/edit" element={<EditIncident />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={<Users />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/deleted-incidents" element={<DeletedIncidents />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
