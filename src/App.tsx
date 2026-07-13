import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/myteam" element={<MyTeam />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/food" element={<Food />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/superadmin" element={<SuperAdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;