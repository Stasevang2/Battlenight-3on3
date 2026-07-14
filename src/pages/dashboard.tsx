import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { getBattlenights, getTeamsForBattlenight } from '../services/battlenightService';
import type { Battlenight } from '../services/battlenightService';
import '../styles/dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [nextBattlenight, setNextBattlenight] = useState<Battlenight | null>(null);
  const [spotsLeft, setSpotsLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      const events = await getBattlenights();
      const openEvents = events.filter(e => e.status === 'open');
      if (openEvents.length > 0) {
        const next = openEvents[0];
        setNextBattlenight(next);

        // Hent antal tilmeldte
        const teams = await getTeamsForBattlenight(next.id!);
        const takenSpots = teams.reduce((sum, t) => sum + t.players.length, 0);
        setSpotsLeft(next.maxPlayers - takenSpots);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  if (!currentUser) return null;

  return (
    <div className="dashboard-container">

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <img
            src="https://www.holdsport.dk/media/W1siZiIsIjIwMTkvMDYvMDcvN3lyM3Fnd201aF9yaWtsb2dvXzIwMC5wbmciXSxbInAiLCJ0aHVtYiIsIjM1MHgzNTAiXV0=?sha=7ce18b110b83be29"
            alt="Rungsted Hockey"
            className="header-logo"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <h1 className="header-title">BATTLENIGHT</h1>
            <p className="header-subtitle">3 on 3</p>
          </div>
        </div>
        <div className="header-right">
          <div className="user-id-badge">🪪 {currentUser.userId}</div>
          <div className="balance-badge" onClick={() => navigate('/profile')}>
            💰 {currentUser.balance || 0} kr
          </div>
          <div className="user-badge">👤 {currentUser.firstName}</div>
        </div>
      </div>

      {/* Næste Battlenight */}
      <div className="section">
        <h2 className="section-title">🏒 Næste Battlenight</h2>
        {isLoading ? (
          <p className="loading-text">⏳ Henter events...</p>
        ) : nextBattlenight ? (
          <div className="battlenight-card">
            <div className="battlenight-status open">ÅBEN FOR TILMELDING</div>
            <h3 className="battlenight-date">{nextBattlenight.date}</h3>
            <p className="battlenight-time">⏰ {nextBattlenight.time}</p>
            <p className="battlenight-price">💰 {nextBattlenight.price} kr pr. spiller</p>

            {/* Pladser */}
            <div className="spots-container">
              <div className="spots-bar">
                <div
                  className="spots-fill"
                  style={{
                    width: `${((nextBattlenight.maxPlayers - spotsLeft) / nextBattlenight.maxPlayers) * 100}%`
                  }}
                />
              </div>
              <p className="spots-text">
                {nextBattlenight.maxPlayers - spotsLeft} / {nextBattlenight.maxPlayers} spillere tilmeldt
              </p>
            </div>

            <div className="join-options">
              <button className="join-btn" onClick={() => navigate('/myteam')}>
                🏒 Tilmeld dig
              </button>
              <button className="join-btn-secondary" onClick={() => navigate('/calendar')}>
                📅 Se alle events
              </button>
            </div>
          </div>
        ) : (
          <div className="no-battlenight">
            <p>🏒 Ingen kommende Battlenights endnu</p>
            <p>Hold øje med appen!</p>
          </div>
        )}
      </div>

      {/* Statistik - viser 0 indtil rigtige data */}
      <div className="section">
        <h2 className="section-title">📊 Min Statistik</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">0</span>
            <span className="stat-label">Deltagelser</span>
          </div>
          <div className="stat-card official">
            <span className="stat-number">0</span>
            <span className="stat-label">Officielle Sejre</span>
          </div>
          <div className="stat-card official">
            <span className="stat-number">0</span>
            <span className="stat-label">Officielle Nederlag</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">-</span>
            <span className="stat-label">Rangliste</span>
          </div>
        </div>
        <p className="stats-note">⚔️ Sejre og nederlag er kun fra officielle udfordringskampe</p>
      </div>

      {/* Menu */}
      <div className="section">
        <h2 className="section-title">🎮 Menu</h2>
        <div className="menu-grid">
          <button className="menu-card" onClick={() => navigate('/myteam')}>
            <span className="menu-icon">👥</span>
            <span className="menu-label">Mit Hold</span>
          </button>
          <button className="menu-card" onClick={() => navigate('/calendar')}>
            <span className="menu-icon">📅</span>
            <span className="menu-label">Kalender</span>
          </button>
          <button className="menu-card" onClick={() => navigate('/messages')}>
            <span className="menu-icon">💬</span>
            <span className="menu-label">Beskeder</span>
          </button>
          <button className="menu-card" onClick={() => navigate('/leaderboard')}>
            <span className="menu-icon">🏆</span>
            <span className="menu-label">Rangliste</span>
          </button>
          <button className="menu-card" onClick={() => navigate('/food')}>
            <span className="menu-icon">🍔</span>
            <span className="menu-label">Mad & Drikke</span>
          </button>
          <button className="menu-card" onClick={() => navigate('/rules')}>
            <span className="menu-icon">📋</span>
            <span className="menu-label">Regler</span>
          </button>
          {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
            <button className="menu-card admin" onClick={() => navigate('/admin')}>
              <span className="menu-icon">🛡️</span>
              <span className="menu-label">Admin</span>
            </button>
          )}
          {currentUser.role === 'superadmin' && (
            <button className="menu-card superadmin" onClick={() => navigate('/superadmin')}>
              <span className="menu-icon">⚙️</span>
              <span className="menu-label">Super Admin</span>
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default Dashboard;