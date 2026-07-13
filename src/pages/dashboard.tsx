import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/dashboard.css';

const mockUser = {
  firstName: 'Alexander',
  userId: 'ALEX17',
  club: 'Rungsted Hockey',
  balance: 75,
  playerNumber: 17,
  birthYear: 2012,
  role: 'superadmin',
};

const mockBattlenight = {
  date: 'Lørdag d. 18. Januar 2025',
  time: '17:00 - 20:00',
  spotsLeft: 8,
  totalSpots: 36,
  status: 'open',
};

const mockStats = {
  attended: 12,
  wins: 8,
  losses: 4,
  rank: 3,
};

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <img
            src="https://www.rungstedhockey.dk/images/rungsted-hockey-logo.png"
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
          <div className="user-id-badge">🪪 {mockUser.userId}</div>
          <div className="balance-badge" onClick={() => navigate('/profile')}>
            💰 {mockUser.balance} kr
          </div>
          <div className="user-badge">👤 {mockUser.firstName}</div>
        </div>
      </div>

      {/* Næste Battlenight kort */}
      <div className="section">
        <h2 className="section-title">🏒 Næste Battlenight</h2>
        <div className="battlenight-card">
          <div className="battlenight-status open">ÅBEN FOR TILMELDING</div>
          <h3 className="battlenight-date">{mockBattlenight.date}</h3>
          <p className="battlenight-time">⏰ {mockBattlenight.time}</p>
          <div className="spots-container">
            <div className="spots-bar">
              <div
                className="spots-fill"
                style={{ width: `${((mockBattlenight.totalSpots - mockBattlenight.spotsLeft) / mockBattlenight.totalSpots) * 100}%` }}
              />
            </div>
            <p className="spots-text">
              {mockBattlenight.totalSpots - mockBattlenight.spotsLeft} / {mockBattlenight.totalSpots} spillere tilmeldt
            </p>
          </div>

          {/* Tilmeldings knapper */}
          <div className="join-options">
            <button className="join-btn" onClick={() => navigate('/myteam')}>
              👥 Tilmeld med hold
            </button>
            <button className="join-btn-secondary" onClick={() => navigate('/calendar')}>
              🏒 Tilmeld som individuel
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="section">
        <h2 className="section-title">📊 Min Statistik</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{mockStats.attended}</span>
            <span className="stat-label">Deltagelser</span>
          </div>
          <div className="stat-card official">
            <span className="stat-number">{mockStats.wins}</span>
            <span className="stat-label">Officielle Sejre</span>
          </div>
          <div className="stat-card official">
            <span className="stat-number">{mockStats.losses}</span>
            <span className="stat-label">Officielle Nederlag</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">#{mockStats.rank}</span>
            <span className="stat-label">Rangliste</span>
          </div>
        </div>
        <p className="stats-note">⚔️ Sejre og nederlag er kun fra officielle udfordringskampe</p>
      </div>

      {/* Navigation Menu */}
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
          {(mockUser.role === 'admin' || mockUser.role === 'superadmin') && (
            <button className="menu-card admin" onClick={() => navigate('/admin')}>
              <span className="menu-icon">🛡️</span>
              <span className="menu-label">Admin</span>
            </button>
          )}
          {mockUser.role === 'superadmin' && (
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