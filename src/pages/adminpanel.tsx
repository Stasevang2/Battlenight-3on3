import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/adminpanel.css';

type Team = {
  id: number;
  name: string;
  leader: string;
  players: number;
  equipment: string;
  paid: boolean;
  present: boolean | null;
  birthYear: number;
  rank: number;
};

const mockShifts = [
  { id: 1, date: 'Lørdag d. 18. Januar 2025', time: '17:00 - 20:00', takenBy: 'Morten (Forælder)', taken: true },
  { id: 2, date: 'Lørdag d. 18. Januar 2025', time: '17:00 - 20:00', takenBy: null, taken: false },
  { id: 3, date: 'Lørdag d. 25. Januar 2025', time: '17:00 - 20:00', takenBy: null, taken: false },
];

const mockTeams: Team[] = [
  { id: 1, name: 'Ice Kings', leader: 'Alexander', players: 3, equipment: 'full', paid: true, present: null, birthYear: 2012, rank: 3 },
  { id: 2, name: 'Rungsted Rockets', leader: 'Magnus', players: 3, equipment: 'basic', paid: false, present: null, birthYear: 2012, rank: 2 },
  { id: 3, name: 'Puck Masters', leader: 'Oliver', players: 3, equipment: 'full', paid: true, present: null, birthYear: 2011, rank: 5 },
];

const mockIndividualPlayers = [
  { id: 10, firstName: 'Mathias', club: 'Rungsted', playerNumber: 4, birthYear: 2012, paid: false },
  { id: 11, firstName: 'Jonas', club: 'Herlev', playerNumber: 15, birthYear: 2013, paid: true },
];

const mockUsers = [
  { id: 1, firstName: 'Alexander', userId: 'ALEX17' },
  { id: 2, firstName: 'Magnus', userId: 'MAGN9' },
  { id: 3, firstName: 'Oliver', userId: 'OLIV23' },
];

function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'shifts' | 'teams' | 'messages'>('shifts');
  const [shifts, setShifts] = useState(mockShifts);
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [broadcastTarget, setBroadcastTarget] = useState('all-event');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  const takeShift = (id: number) => {
    setShifts(prev => prev.map(shift =>
      shift.id === id ? { ...shift, taken: true, takenBy: 'Dig' } : shift
    ));
  };

  const markPresent = (id: number, present: boolean) => {
    setTeams(prev => prev.map(team =>
      team.id === id ? { ...team, present } : team
    ));
  };

  const handleSendMessage = () => {
    setMessageSent(true);
    setBroadcastMessage('');
    setTimeout(() => setMessageSent(false), 3000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">ADMIN</h1>
        <div />
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>
          🛡️ Vagter
        </button>
        <button className={`admin-tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
          👥 Hold
        </button>
        <button className={`admin-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          📢 Beskeder
        </button>
      </div>

      <div className="content">

        {/* VAGTER TAB */}
        {activeTab === 'shifts' && (
          <div>
            <h2 className="section-title">🛡️ Vagter - 18. Januar 2025</h2>
            <p className="help-text">Klik "Tag vagt" for at melde dig som vagt til et event</p>
            <div className="shifts-list">
              {shifts.map(shift => (
                <div key={shift.id} className={`shift-card ${shift.taken ? 'taken' : 'available'}`}>
                  <div className="shift-info">
                    <p className="shift-date">{shift.date}</p>
                    <p className="shift-time">⏰ {shift.time}</p>
                    {shift.taken && (
                      <p className="shift-taken-by">✅ Taget af: {shift.takenBy}</p>
                    )}
                  </div>
                  {!shift.taken && (
                    <button className="take-shift-btn" onClick={() => takeShift(shift.id)}>
                      Tag vagt
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HOLD TAB */}
        {activeTab === 'teams' && (
          <div>
            <h2 className="section-title">👥 Tilmeldte Hold - 18. Januar 2025</h2>
            <div className="teams-list">
              {teams.map(team => (
                <div key={team.id} className="admin-team-card">
                  <div className="admin-team-header">
                    <div>
                      <h3 className="admin-team-name">{team.name}</h3>
                      <p className="admin-team-details">
                        Holdleder: {team.leader} · Årgang {team.birthYear} · Rangliste #{team.rank}
                      </p>
                    </div>
                    <span className={`equipment-badge ${team.equipment}`}>
                      {team.equipment === 'full' ? '🏒 Fuldt' : '🧤 Basic'}
                    </span>
                  </div>

                  <div className="admin-team-actions">
                    <button className={`payment-btn ${team.paid ? 'paid' : 'unpaid'}`}>
                      {team.paid ? '✅ Betalt' : '💳 Betaling ved ankomst'}
                    </button>

                    <div className="presence-btns">
                      <button
                        className={`presence-btn present ${team.present === true ? 'active' : ''}`}
                        onClick={() => markPresent(team.id, true)}
                      >
                        ✅ Mødt op
                      </button>
                      <button
                        className={`presence-btn absent ${team.present === false ? 'active' : ''}`}
                        onClick={() => markPresent(team.id, false)}
                      >
                        ❌ No-show
                      </button>
                    </div>

                    {team.present === true && (
                      <div className="presence-status present-status">
                        ✅ Holdet er registreret som mødt op
                      </div>
                    )}
                    {team.present === false && (
                      <div className="presence-status absent-status">
                        ❌ No-show registreret - strafgebyr pålagt
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h2 className="section-title" style={{ marginTop: '25px' }}>🏒 Individuelle Spillere</h2>
            <div className="teams-list">
              {mockIndividualPlayers.map(player => (
                <div key={player.id} className="admin-team-card individual">
                  <div className="admin-team-header">
                    <div>
                      <h3 className="admin-team-name">#{player.playerNumber} {player.firstName}</h3>
                      <p className="admin-team-details">{player.club} · Årgang {player.birthYear}</p>
                    </div>
                    <span className="individual-badge">Individuel</span>
                  </div>
                  <button className={`payment-btn ${player.paid ? 'paid' : 'unpaid'}`}>
                    {player.paid ? '✅ Betalt' : '💳 Betaling ved ankomst'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BESKEDER TAB */}
        {activeTab === 'messages' && (
          <div>
            <h2 className="section-title">📢 Send Besked</h2>

            {messageSent && (
              <div className="message-sent-banner">
                ✅ Beskeden er sendt!
              </div>
            )}

            <div className="broadcast-card">
              <label className="broadcast-label">Modtagere</label>
              <select
                className="broadcast-select"
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
              >
                <option value="all-event">Alle tilmeldte - 18. Januar</option>
                <option value="all-users">Alle brugere</option>
                <option value="team">Specifikt hold</option>
                <option value="player">Specifik spiller</option>
              </select>

              {broadcastTarget === 'team' && (
                <select
                  className="broadcast-select"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="">Vælg hold...</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))}
                </select>
              )}

              {broadcastTarget === 'player' && (
                <select
                  className="broadcast-select"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                >
                  <option value="">Vælg spiller...</option>
                  {mockUsers.map(user => (
                    <option key={user.id} value={user.userId}>{user.firstName} ({user.userId})</option>
                  ))}
                </select>
              )}

              <label className="broadcast-label">Besked</label>
              <textarea
                className="broadcast-textarea"
                placeholder="Skriv din besked her..."
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />

              <p className="broadcast-note">
                📌 Denne besked opretter en ny tråd under Admin chat for dette event
              </p>

              <button
                className="broadcast-btn"
                onClick={handleSendMessage}
                disabled={!broadcastMessage}
              >
                📢 Send Besked
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
