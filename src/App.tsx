import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import MyTeam from './pages/myteam';
import Calendar from './pages/calendar';
import Profile from './pages/profile';
import Messages from './pages/messages';
import Leaderboard from './pages/leaderboard';
import Rules from './pages/rules';
import Food from './pages/food';
import AdminPanel from './pages/adminpanel';
import SuperAdminPanel from './pages/superadminpanel';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0a1628 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}>
        <img
          src="/logo.png"
          alt="3on3 Battlenight"
          style={{
            width: '150px',
            height: '150px',
            objectFit: 'contain',
            borderRadius: '50%',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.9rem',
          letterSpacing: '2px',
        }}>
          INDLÆSER...
        </p>
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/myteam" element={
          <ProtectedRoute><MyTeam /></ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute><Calendar /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute><Messages /></ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute><Leaderboard /></ProtectedRoute>
        } />
        <Route path="/rules" element={
          <ProtectedRoute><Rules /></ProtectedRoute>
        } />
        <Route path="/food" element={
          <ProtectedRoute><Food /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><AdminPanel /></ProtectedRoute>
        } />
        <Route path="/superadmin" element={
          <ProtectedRoute><SuperAdminPanel /></ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;