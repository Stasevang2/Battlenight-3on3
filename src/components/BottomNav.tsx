import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/bottomnav.css';

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="bottom-nav">
      <button
        className={`nav-btn ${isActive('/dashboard') ? 'active' : ''}`}
        onClick={() => navigate('/dashboard')}
      >
        <span>🏠</span>
        <span>Hjem</span>
      </button>
      <button
        className={`nav-btn ${isActive('/calendar') ? 'active' : ''}`}
        onClick={() => navigate('/calendar')}
      >
        <span>📅</span>
        <span>Events</span>
      </button>
      <button
        className={`nav-btn ${isActive('/messages') ? 'active' : ''}`}
        onClick={() => navigate('/messages')}
      >
        <span>💬</span>
        <span>Beskeder</span>
      </button>
      <button
        className={`nav-btn ${isActive('/profile') ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <span>👤</span>
        <span>Profil</span>
      </button>
    </div>
  );
}

export default BottomNav;