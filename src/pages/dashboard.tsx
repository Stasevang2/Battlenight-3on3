import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  getBattlenights,
  getTeamsForBattlenight,
  getIndividualSignups,
  getUserEventStatus,
} from '../services/battlenightService';
import type { Battlenight, Team } from '../services/battlenightService';
import '../styles/dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, pendingInvites, unreadNotifications } = useAuth();
  const [nextBattlenight, setNextBattlenight] = useState<Battlenight | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [userStatus, setUserStatus] = useState<{
    status: 'team' | 'individual' | 'waitlist' | 'none';
    teamName?: string;
    teamId?: string;
  }>({ status: 'none' });
  const [isLoading, setIsLoading] = useState(true);
  const [showTeamList, setShowTeamList] = useState(false);

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

        const [eventTeams, eventIndividuals, status] = await Promise.all([
          getTeamsForBattlenight(next.id!),
          getIndividualSignups(next.id!),
          getUserEventStatus(next.id!, currentUser!.userId),
        ]);

        setTeams(eventTeams);
        setIndividuals(eventIndividuals);
        setUserStatus(status);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  if (!currentUser) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const acceptedTeams = teams.filter(t =>
    t.players.some(p => p.status === 'accepted')
  );

  return (
    <div className="dashboard-container">

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <img
            src="/logo.png"
            alt="3on3 Battlenight"
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
            <div className="battlenight-header-row">
              <div className="battlenight-status open">ÅBEN FOR TILMELDING</div>
              {/* Din status badge */}
              {userStatus.status === 'team' && (
                <div className="user-event-status team">✅ På hold</div>
              )}
              {userStatus.status === 'individual' && (
                <div className="user-event-status individual">🏒 Individuel</div>
              )}
              {userStatus.status === 'waitlist' && (
                <div className="user-event-status waitlist">⏳ Venteliste</div>
              )}
            </div>

            <h3 className="battlenight-date">{formatDate(nextBattlenight.date)}</h3>
            <p className="battlenight-time">⏰ {nextBattlenight.time}</p>
            <p className="battlenight-price">💰 {nextBattlenight.price} kr pr. spiller</p>

            {/* Din tilmeldingsstatus detaljer */}
            {userStatus.status === 'team' && userStatus.teamName && (
              <div className="user-status-detail team">
                <p>👥 Du er tilmeldt som del af <strong>{userStatus.teamName}</strong></p>
                <button className="status-action-btn" onClick={() => navigate('/myteam')}>
                  Se dit hold →
                </button>
              </div>
            )}

            {userStatus.status === 'waitlist' && userStatus.teamName && (
              <div className="user-status-detail waitlist">
                <p>⏳ Du er på venteliste til <strong>{userStatus.teamName}</strong></p>
                <p className="status-note">Holdlederen kontakter dig hvis der bliver plads</p>
              </div>
            )}

            {userStatus.status === 'individual' && (
              <div className="user-status-detail individual">
                <p>🏒 Du er tilmeldt som individuel spiller</p>
                <p className="status-note">Find et hold på dagen eller accepter en invitation</p>
              </div>
            )}

            {userStatus.status === 'none' && (
              <div className="join-options">
                <button className="join-btn" onClick={() => navigate('/myteam')}>
                  🏒 Tilmeld dig nu
                </button>
              </div>
            )}

            {/* Antal pladser */}
            <div className="spots-container">
              <div className="spots-bar">
                <div
                  className="spots-fill"
                  style={{
                    width: `${Math.min((teams.reduce((sum, t) => sum + t.players.filter(p => p.status === 'accepted').length, 0) + individuals.length) / nextBattlenight.maxPlayers * 100, 100)}%`
                  }}
                />
              </div>
              <p className="spots-text">
                {teams.reduce((sum, t) => sum + t.players.filter(p => p.status === 'accepted').length, 0) + individuals.length} / {nextBattlenight.maxPlayers} spillere tilmeldt
              </p>
            </div>

            {/* Hold & Spiller oversigt toggle */}
            <button
              className="show-teams-btn"
              onClick={() => setShowTeamList(!showTeamList)}
            >
              👥 Se tilmeldte hold og spillere {showTeamList ? '▲' : '▼'}
            </button>

            {showTeamList && (
              <div className="teams-overview">
                {/* Hold liste */}
                {acceptedTeams.length > 0 && (
                  <div className="teams-overview-section">
                    <h4 className="teams-overview-title">🏒 Hold ({acceptedTeams.length})</h4>
                    {acceptedTeams.map(team => {
                      const acceptedPlayers = team.players.filter(p => p.status === 'accepted');
                      return (
                        <div
                          key={team.id}
                          className="team-overview-card"
                          onClick={() => navigate(`/messages?teamId=${team.id}`)}
                        >
                          <div className="team-overview-info">
                            <p className="team-overview-name">{team.teamName}</p>
                            <p className="team-overview-players">
                              {acceptedPlayers.map(p => p.firstName).join(', ')}
                            </p>
                            <span className={`team-overview-equipment ${team.equipment}`}>
                              {team.equipment === 'full' ? '🏒 Fuldt' : '🧤 Basis'}
                            </span>
                          </div>
                          <div className="team-overview-actions">
                            <button
                              className="contact-team-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/messages?teamId=${team.id}`);
                              }}
                            >
                              💬
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Individuelle spillere */}
                {individuals.length > 0 && (
                  <div className="teams-overview-section">
                    <h4 className="teams-overview-title">🏒 Individuelle spillere ({individuals.length})</h4>
                    <div className="individuals-list">
                      {(individuals as any[]).map((player: any) => (
                        <div key={player.id} className="individual-overview-card">
                          <span className="individual-name">{player.userName}</span>
                          <button
                            className="contact-individual-btn"
                            onClick={() => navigate('/messages')}
                          >
                            💬 Skriv
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {acceptedTeams.length === 0 && individuals.length === 0 && (
                  <p className="no-teams-yet">Ingen tilmeldte endnu - vær den første! 🏒</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="no-battlenight">
            <p>🏒 Ingen kommende Battlenights endnu</p>
            <p>Hold øje med appen!</p>
          </div>
        )}
      </div>

      {/* Statistik */}
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
            <span className="menu-icon-wrapper">
              <span className="menu-icon">👥</span>
              {pendingInvites > 0 && (
                <span className="menu-badge">{pendingInvites}</span>
              )}
            </span>
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

          <button className="menu-card" onClick={() => navigate('/profile')}>
            <span className="menu-icon-wrapper">
              <span className="menu-icon">👤</span>
              {unreadNotifications > 0 && (
                <span className="menu-badge">{unreadNotifications}</span>
              )}
            </span>
            <span className="menu-label">Profil</span>
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