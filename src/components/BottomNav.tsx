import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToConversations, getTotalUnreadCount } from '../services/messageService';
import '../styles/bottomnav.css';

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToConversations(currentUser.userId, (conversations) => {
      const count = getTotalUnreadCount(conversations, currentUser.userId);
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [currentUser]);

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
        <span className="nav-icon-wrapper">
          💬
          {unreadCount > 0 && (
            <span className="nav-unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </span>
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