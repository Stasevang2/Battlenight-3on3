import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getBattlenights,
  getTeamsForBattlenight,
  getShiftsForBattlenight,
  getIndividualSignups,
  takeShift,
  updateTeam,
} from '../services/battlenightService';
import type { Battlenight, Team, Shift } from '../services/battlenightService';
import { getAllUsers } from '../services/userService';
import type { User } from '../services/userService';
import { createResult } from '../services/resultService';
import '../styles/adminpanel.css';

function AdminPanel() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'shifts' | 'teams' | 'results' | 'messages'>('shifts');
  const [battlenights, setBattlenights] = useState<Battlenight[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [broadcastTarget, setBroadcastTarget] = useState('all-event');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [registeredResults, setRegisteredResults] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadEventData(selectedEvent);
    }
  }, [selectedEvent]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [events, users] = await Promise.all([
        getBattlenights(),
        getAllUsers(),
      ]);
      setBattlenights(events);
      setAllUsers(users);
      if (events.length > 0) {
        setSelectedEvent(events[0].id!);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const loadEventData = async (eventId: string) => {
    try {
      const [t, s, i] = await Promise.all([
        getTeamsForBattlenight(eventId),
        getShiftsForBattlenight(eventId),
        getIndividualSignups(eventId),
      ]);
      setTeams(t);
      setShifts(s);
      setIndividuals(i);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTakeShift = async (shiftId: string) => {
    if (!currentUser) return;
    try {
      await takeShift(shiftId, currentUser.userId, currentUser.firstName);
      await loadEventData(selectedEvent);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkPresent = async (teamId: string, present: boolean) => {
    try {
      await updateTeam(teamId, { present });
      setTeams(prev => prev.map(t =>
        t.id === teamId ? { ...t, present } : t
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkPaid = async (teamId: string, paid: boolean) => {
    try {
      await updateTeam(teamId, { paid });
      setTeams(prev => prev.map(t =>
        t.id === teamId ? { ...t, paid } : t
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterResult = async (
    teamA: Team,
    teamB: Team,
    winner: 'teamA' | 'teamB' | 'draw'
  ) => {
    if (!currentUser || !selectedEvent) return;
    const resultKey = `${teamA.id}-${teamB.id}`;
    try {
      const selectedEventData = battlenights.find(b => b.id === selectedEvent);
      await createResult({
        battlenightId: selectedEvent,
        battlenightDate: selectedEventData?.date || '',
        teamAId: teamA.id!,
        teamAName: teamA.teamName,
        teamBId: teamB.id!,
        teamBName: teamB.teamName,
        winner,
        isOfficial: true,
        registeredBy: currentUser.userId,
      });
      setRegisteredResults(prev => [...prev, resultKey]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = () => {
    setMessageSent(true);
    setBroadcastMessage('');
    setTimeout(() => setMessageSent(false), 3000);
  };

  const selectedEventData = battlenights.find(b => b.id === selectedEvent);

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">ADMIN</h1>
        <div />
      </div>

      {/* Event vælger */}
      {battlenights.length > 0 && (
        <div className="event-selector">
          <select
            className="event-select"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            {battlenights.map(event => (
              <option key={event.id} value={event.id}>{event.date}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          🛡️ Vagter
        </button>
        <button
          className={`admin-tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          👥 Hold
        </button>
        <button
          className={`admin-tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          🏆 Resultater
        </button>
        <button
          className={`admin-tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          📢 Beskeder
        </button>
      </div>

      <div className="content">
        {isLoading ? (
          <p className="loading-text">⏳ Henter data...</p>
        ) : battlenights.length === 0 ? (
          <div className="no-events-admin">
            <p>Ingen events oprettet endnu</p>
            <p>Super Admin skal oprette et event først</p>
          </div>
        ) : (
          <>
            {/* VAGTER TAB */}
            {activeTab === 'shifts' && (
              <div>
                <h2 className="section-title">🛡️ Vagter - {selectedEventData?.date}</h2>
                <p className="help-text">Tag en vagt for at hjælpe til ved dette event</p>
                {shifts.length === 0 ? (
                  <p className="help-text">Ingen vagter oprettet for dette event</p>
                ) : (
                  <div className="shifts-list">
                    {shifts.map(shift => (
                      <div key={shift.id} className={`shift-card ${shift.taken ? 'taken' : 'available'}`}>
                        <div className="shift-info">
                          <p className="shift-date">Vagt #{shift.shiftNumber}</p>
                          <p className="shift-time">⏰ {selectedEventData?.time}</p>
                          {shift.taken && (
                            <p className="shift-taken-by">✅ Taget af: {shift.takenByName}</p>
                          )}
                        </div>
                        {!shift.taken && (
                          <button
                            className="take-shift-btn"
                            onClick={() => handleTakeShift(shift.id!)}
                          >
                            Tag vagt
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HOLD TAB */}
            {activeTab === 'teams' && (
              <div>
                <h2 className="section-title">👥 Tilmeldte Hold - {selectedEventData?.date}</h2>
                <p className="help-text">
                  {teams.length} hold · {individuals.length} individuelle spillere tilmeldt
                </p>

                <div className="teams-list">
                  {teams.map(team => (
                    <div key={team.id} className="admin-team-card">
                      <div className="admin-team-header">
                        <div>
                          <h3 className="admin-team-name">{team.teamName}</h3>
                          <p className="admin-team-details">
                            Holdleder: {team.leaderName} ·
                            Spillere: {team.players.length}/3 ·
                            Årgang: {team.players[0]?.birthYear || 'Ukendt'}
                          </p>
                        </div>
                        <span className={`equipment-badge ${team.equipment}`}>
                          {team.equipment === 'full' ? '🏒 Fuldt' : '🧤 Basic'}
                        </span>
                      </div>

                      {/* Spillere status */}
                      <div className="team-players-status">
                        {team.players.map((player, index) => (
                          <div key={index} className="player-status-row">
                            <span className="player-status-name">
                              {player.placeholderName || player.firstName}
                            </span>
                            <span className="player-status-badge">
                              {player.status === 'accepted' && '✅'}
                              {player.status === 'pending' && '⏳'}
                              {player.status === 'rejected' && '❌'}
                              {player.status === 'placeholder' && '👤'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="admin-team-actions">
                        <button
                          className={`payment-btn ${team.paid ? 'paid' : 'unpaid'}`}
                          onClick={() => handleMarkPaid(team.id!, !team.paid)}
                        >
                          {team.paid ? '✅ Betalt' : '💳 Betaling ved ankomst'}
                        </button>

                        <div className="presence-btns">
                          <button
                            className={`presence-btn present ${team.present === true ? 'active' : ''}`}
                            onClick={() => handleMarkPresent(team.id!, true)}
                          >
                            ✅ Mødt op
                          </button>
                          <button
                            className={`presence-btn absent ${team.present === false ? 'active' : ''}`}
                            onClick={() => handleMarkPresent(team.id!, false)}
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

                {/* Individuelle spillere */}
                {individuals.length > 0 && (
                  <>
                    <h2 className="section-title" style={{ marginTop: '25px' }}>
                      🏒 Individuelle Spillere ({individuals.length})
                    </h2>
                    <div className="teams-list">
                      {individuals.map((player: any) => (
                        <div key={player.id} className="admin-team-card individual">
                          <div className="admin-team-header">
                            <div>
                              <h3 className="admin-team-name">{player.userName}</h3>
                            </div>
                            <span className="individual-badge">Individuel</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* RESULTATER TAB */}
            {activeTab === 'results' && (
              <div>
                <h2 className="section-title">🏆 Registrer Resultater</h2>
                <p className="help-text">
                  Registrer vindere af dagens kampe - resultater publiceres på ranglisten
                </p>

                {teams.length < 2 ? (
                  <div className="no-events-admin">
                    <p>Minimum 2 hold skal være tilmeldt for at registrere resultater</p>
                  </div>
                ) : (
                  <div className="results-list">
                    {teams.map((teamA, indexA) =>
                      teams.slice(indexA + 1).map((teamB) => {
                        const resultKey = `${teamA.id}-${teamB.id}`;
                        const isRegistered = registeredResults.includes(resultKey);

                        return (
                          <div key={resultKey} className="result-card">
                            <div className="result-teams">
                              <span className="result-team-name">{teamA.teamName}</span>
                              <span className="vs-text">VS</span>
                              <span className="result-team-name">{teamB.teamName}</span>
                            </div>

                            {isRegistered ? (
                              <div className="result-registered">
                                ✅ Resultat registreret!
                              </div>
                            ) : (
                              <div className="result-buttons">
                                <button
                                  className="result-btn win"
                                  onClick={() => handleRegisterResult(teamA, teamB, 'teamA')}
                                >
                                  {teamA.teamName} vandt
                                </button>
                                <button
                                  className="result-btn draw"
                                  onClick={() => handleRegisterResult(teamA, teamB, 'draw')}
                                >
                                  Uafgjort
                                </button>
                                <button
                                  className="result-btn win"
                                  onClick={() => handleRegisterResult(teamA, teamB, 'teamB')}
                                >
                                  {teamB.teamName} vandt
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BESKEDER TAB */}
            {activeTab === 'messages' && (
              <div>
                <h2 className="section-title">📢 Send Besked</h2>

                {messageSent && (
                  <div className="message-sent-banner">✅ Beskeden er sendt!</div>
                )}

                <div className="broadcast-card">
                  <label className="broadcast-label">Modtagere</label>
                  <select
                    className="broadcast-select"
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                  >
                    <option value="all-event">Alle tilmeldte - {selectedEventData?.date}</option>
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
                        <option key={team.id} value={team.id}>{team.teamName}</option>
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
                      {allUsers.map(user => (
                        <option key={user.id} value={user.userId}>
                          {user.firstName} ({user.userId})
                        </option>
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
          </>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;