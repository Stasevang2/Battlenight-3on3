import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/myteam.css';

const mockAvailablePlayers = [
  { id: 4, firstName: 'Lucas', club: 'Rungsted', playerNumber: 5, birthYear: 2012, userId: 'LUCA5' },
  { id: 5, firstName: 'Noah', club: 'Herlev', playerNumber: 11, birthYear: 2013, userId: 'NOAH11' },
  { id: 6, firstName: 'Emil', club: 'Rungsted', playerNumber: 7, birthYear: 2011, userId: 'EMIL7' },
];

const mockTeam = {
  name: 'Ice Kings',
  leader: 'Alexander Ingels',
  leaderId: 1,
  equipment: 'full',
  registeredForEvent: true,
  players: [
    { id: 1, firstName: 'Alexander', club: 'Rungsted', playerNumber: 17, birthYear: 2012, userId: 'ALEX17' },
    { id: 2, firstName: 'Magnus', club: 'Rungsted', playerNumber: 9, birthYear: 2012, userId: 'MAGN9' },
    { id: 3, firstName: 'Oliver', club: 'Herlev', playerNumber: 23, birthYear: 2011, userId: 'OLIV23' },
  ],
};

function MyTeam() {
  const navigate = useNavigate();
  const [hasTeam, setHasTeam] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [equipment, setEquipment] = useState(mockTeam.equipment);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [teamName, setTeamName] = useState(mockTeam.name);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAbsenceConfirm, setShowAbsenceConfirm] = useState(false);

  const handleRegister = () => {
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  const handleAbsence = () => {
    setShowAbsenceConfirm(true);
    setTimeout(() => setShowAbsenceConfirm(false), 3000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">MIT HOLD</h1>
        <div />
      </div>

      {/* Bekræftelse besked */}
      {showConfirmation && (
        <div className="confirmation-banner">
          ✅ Dit hold er tilmeldt! Du modtager en bekræftelse på beskeder.
        </div>
      )}

      {showAbsenceConfirm && (
        <div className="absence-banner">
          ⚠️ Afbud registreret. Dine medspillere er notificeret.
        </div>
      )}

      {!hasTeam && !isCreating ? (
        <div className="content">
          {/* Ingen hold endnu */}
          <div className="no-team-card">
            <p className="no-team-icon">🏒</p>
            <h2>Du er ikke på et hold endnu</h2>
            <p>Opret dit eget hold eller tilmeld dig som individuel spiller</p>
            <button className="action-btn primary" onClick={() => setIsCreating(true)}>
              👥 Opret hold
            </button>
            <button className="action-btn secondary" onClick={() => navigate('/calendar')}>
              🏒 Tilmeld som individuel spiller
            </button>
          </div>
        </div>

      ) : isCreating ? (
        <div className="content">
          {/* Opret hold flow */}
          <div className="create-team-card">
            <h2 className="card-title">🏒 Opret dit hold</h2>
            <p className="help-text">💡 Holdnavn er valgfrit - ellers bruges dit navn som holdnavn</p>

            <div className="input-group">
              <label>Holdnavn (valgfrit)</label>
              <input
                type="text"
                placeholder="fx Ice Kings"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="team-input"
              />
            </div>

            <div className="equipment-section">
              <h3 className="equipment-title">⚙️ Vælg udstyrsniveau</h3>
              <p className="help-text">⚠️ Alle spillere på holdet SKAL have samme udstyrsniveau</p>
              <div className="equipment-toggle">
                <button
                  className={`equipment-btn ${equipment === 'full' ? 'active' : ''}`}
                  onClick={() => setEquipment('full')}
                >
                  🏒 Fuldt udstyr
                  <span className="equipment-desc">Alle beskyttere, hjelm, handsker, stav</span>
                </button>
                <button
                  className={`equipment-btn ${equipment === 'basic' ? 'active' : ''}`}
                  onClick={() => setEquipment('basic')}
                >
                  🧤 Basis udstyr
                  <span className="equipment-desc">Kun stav, handsker og hjelm</span>
                </button>
              </div>
            </div>

            <h3 className="section-subtitle">👥 Tilføj spillere</h3>
            <p className="help-text">💡 Du kan søge efter spillere der allerede er oprettet i appen</p>

            <div className="available-players">
              {mockAvailablePlayers.map(player => (
                <div key={player.id} className="available-player-card">
                  <div className="player-info">
                    <span className="player-name">{player.firstName}</span>
                    <span className="player-details">#{player.playerNumber} · {player.club} · {player.userId}</span>
                  </div>
                  <button className="add-player-btn-small">+ Tilføj</button>
                </div>
              ))}
            </div>

            <div className="invite-section">
              <h3 className="section-subtitle">📱 Inviter via SMS</h3>
              <p className="help-text">💡 Send et link til spillere der ikke har appen endnu</p>
              <div className="invite-row">
                <input type="tel" placeholder="Telefonnummer" className="team-input" />
                <button className="invite-btn">Send link</button>
              </div>
              <p className="invite-note">⏳ SMS invite kommer i næste version</p>
            </div>

            <div className="create-team-actions">
              <button className="action-btn primary" onClick={() => { setHasTeam(true); setIsCreating(false); }}>
                ✅ Opret hold
              </button>
              <button className="action-btn danger" onClick={() => setIsCreating(false)}>
                ✕ Annuller
              </button>
            </div>
          </div>
        </div>

      ) : (
        <div className="content">
          {/* Hold kort */}
          <div className="team-card">
            <div className="team-header">
              <h2 className="team-name">🏒 {mockTeam.name}</h2>
              <span className="team-leader-badge">👑 Holdleder</span>
            </div>
            <p className="team-leader-name">👤 {mockTeam.leader}</p>

            {mockTeam.registeredForEvent && (
              <div className="event-status-row">
                <span className="registered-badge">✅ Tilmeldt - 18. Januar 2025</span>
              </div>
            )}

            {/* Udstyr valg */}
            <div className="equipment-section">
              <h3 className="equipment-title">⚙️ Udstyrsniveau</h3>
              <p className="help-text">⚠️ Alle spillere på holdet SKAL have samme udstyrsniveau - admin kontrollerer dette ved ankomst</p>
              <div className="equipment-toggle">
                <button
                  className={`equipment-btn ${equipment === 'full' ? 'active' : ''}`}
                  onClick={() => setEquipment('full')}
                >
                  🏒 Fuldt udstyr
                  <span className="equipment-desc">Alle beskyttere, hjelm, handsker, stav</span>
                </button>
                <button
                  className={`equipment-btn ${equipment === 'basic' ? 'active' : ''}`}
                  onClick={() => setEquipment('basic')}
                >
                  🧤 Basis udstyr
                  <span className="equipment-desc">Kun stav, handsker og hjelm</span>
                </button>
              </div>
            </div>
          </div>

          {/* Spillere */}
          <div className="section">
            <h2 className="section-title">👥 Spillere ({mockTeam.players.length}/3)</h2>
            <p className="help-text">💡 Et hold skal bestå af præcis 3 spillere for at kunne tilmelde sig</p>
            <div className="players-list">
              {mockTeam.players.map((player, index) => (
                <div key={player.id} className="player-card">
                  <div className="player-number">#{player.playerNumber}</div>
                  <div className="player-info">
                    <p className="player-name">
                      {player.firstName}
                      {index === 0 && <span className="leader-tag"> 👑</span>}
                    </p>
                    <p className="player-details">{player.club} · Årgang {player.birthYear} · {player.userId}</p>
                  </div>
                  {index !== 0 && (
                    <button className="remove-btn">✕</button>
                  )}
                </div>
              ))}
            </div>

            {mockTeam.players.length < 3 && (
              <button className="add-player-btn" onClick={() => setShowAddPlayer(!showAddPlayer)}>
                + Tilføj spiller
              </button>
            )}

            {showAddPlayer && (
              <div className="add-player-dropdown">
                <p className="help-text">Vælg en spiller fra listen eller søg:</p>
                {mockAvailablePlayers.map(player => (
                  <div key={player.id} className="available-player-card">
                    <div className="player-info">
                      <span className="player-name">{player.firstName}</span>
                      <span className="player-details">#{player.playerNumber} · {player.club}</span>
                    </div>
                    <button className="add-player-btn-small">+ Tilføj</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Handlinger */}
          <div className="section">
            {!mockTeam.registeredForEvent ? (
              <button className="action-btn primary" onClick={handleRegister}>
                🏒 Tilmeld til næste Battlenight
              </button>
            ) : (
              <div className="already-registered">
                <p>✅ Holdet er tilmeldt til næste Battlenight</p>
              </div>
            )}
            <button className="action-btn danger" onClick={handleAbsence}>
              ⚠️ Meld afbud
            </button>
            <p className="absence-note">
              ℹ️ Ved afbud notificeres dine medspillere automatisk. Afbud efter deadline medfører 50% strafgebyr.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default MyTeam;