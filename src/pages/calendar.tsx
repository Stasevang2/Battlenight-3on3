import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  getBattlenights,
  getTeamsForBattlenight,
  getIndividualSignups,
  signupIndividual,
  getShiftsForBattlenight,
  takeShift,
  getUserEventStatus,
} from '../services/battlenightService';
import type { Battlenight, Team, Shift } from '../services/battlenightService';
import '../styles/calendar.css';

function Calendar() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [battlenights, setBattlenights] = useState<Battlenight[]>([]);
  const [teamsMap, setTeamsMap] = useState<{ [key: string]: Team[] }>({});
  const [shiftsMap, setShiftsMap] = useState<{ [key: string]: Shift[] }>({});
  const [individualMap, setIndividualMap] = useState<{ [key: string]: any[] }>({});
  const [userStatusMap, setUserStatusMap] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showIndividual, setShowIndividual] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [registeredIndividual, setRegisteredIndividual] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const events = await getBattlenights();
      setBattlenights(events);

      const teams: { [key: string]: Team[] } = {};
      const shifts: { [key: string]: Shift[] } = {};
      const individuals: { [key: string]: any[] } = {};
      const statusMap: { [key: string]: string } = {};

      await Promise.all(events.map(async (event) => {
        if (event.id) {
          const [t, s, i] = await Promise.all([
            getTeamsForBattlenight(event.id),
            getShiftsForBattlenight(event.id),
            getIndividualSignups(event.id),
          ]);
          teams[event.id] = t;
          shifts[event.id] = s;
          individuals[event.id] = i;

          if (currentUser) {
            const status = await getUserEventStatus(event.id, currentUser.userId);
            statusMap[event.id] = status.status;
          }
        }
      }));

      setTeamsMap(teams);
      setShiftsMap(shifts);
      setIndividualMap(individuals);
      setUserStatusMap(statusMap);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleIndividualSignup = async (battlenightId: string) => {
    if (!currentUser) return;
    try {
      await signupIndividual(battlenightId, currentUser.userId, currentUser.firstName);
      setRegisteredIndividual(prev => [...prev, battlenightId]);
      setConfirmationText('✅ Du er tilmeldt som individuel spiller!');
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
      await loadData();
    } catch (err: any) {
      setConfirmationText(err.message || 'Der skete en fejl');
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    }
  };

  const handleTakeShift = async (shiftId: string) => {
    if (!currentUser) return;
    try {
      await takeShift(shiftId, currentUser.userId, currentUser.firstName);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getSpotsLeft = (battlenightId: string, maxPlayers: number) => {
    const teams = teamsMap[battlenightId] || [];
    const individuals = individualMap[battlenightId] || [];
    const takenSpots = teams.reduce((sum, t) =>
      sum + t.players.filter(p => p.status === 'accepted').length, 0
    ) + individuals.length;
    return maxPlayers - takenSpots;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const groupedByMonth = battlenights.reduce((acc, event) => {
    const date = new Date(event.date);
    const monthKey = isNaN(date.getTime())
      ? event.date
      : date.toLocaleString('da-DK', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(event);
    return acc;
  }, {} as { [key: string]: Battlenight[] });

  const upcomingEvents = battlenights
    .filter(e => e.status === 'open' || e.status === 'closed')
    .slice(0, 3);

  const allFutureEvents = battlenights.filter(e => e.status !== 'completed');

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">KALENDER</h1>
        <div />
      </div>

      {showConfirmation && (
        <div className={`confirmation-banner ${confirmationText.startsWith('✅') ? 'success' : 'error'}`}>
          {confirmationText}
        </div>
      )}

      <div className="content">
        <h2 className="section-title">📅 Kommende Battlenights</h2>

        {isLoading ? (
          <p className="loading-text">⏳ Henter events...</p>
        ) : upcomingEvents.length === 0 ? (
          <div className="no-events">
            <p>🏒 Ingen kommende Battlenights endnu</p>
            <p>Hold øje med appen!</p>
          </div>
        ) : (
          <div className="events-list">
            {upcomingEvents.map((event) => {
              const spotsLeft = getSpotsLeft(event.id!, event.maxPlayers);
              const shifts = shiftsMap[event.id!] || [];
              const individuals = individualMap[event.id!] || [];
              const takenShifts = shifts.filter(s => s.taken).length;
              const isRegisteredIndividual = registeredIndividual.includes(event.id!) ||
                individuals.some((i: any) => i.userId === currentUser?.userId);
              const myStatus = userStatusMap[event.id!];

              return (
                <div key={event.id} className={`event-card ${event.status}`}>
                  <div className="event-header">
                    <div className="event-header-left">
                      <span className={`event-status-badge ${event.status}`}>
                        {event.status === 'open' ? '🟢 ÅBEN' : '🔴 LUKKET'}
                      </span>
                      {/* Din status */}
                      {myStatus === 'team' && <span className="my-status-badge team">✅ På hold</span>}
                      {myStatus === 'individual' && <span className="my-status-badge individual">🏒 Individuel</span>}
                      {myStatus === 'waitlist' && <span className="my-status-badge waitlist">⏳ Venteliste</span>}
                    </div>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
                      <button className="event-shifts-btn" onClick={() => navigate('/admin')}>
                        🛡️ {takenShifts}/{shifts.length}
                      </button>
                    )}
                  </div>

                  <h3 className="event-date">{formatDate(event.date)}</h3>
                  <p className="event-time">⏰ {event.time}</p>
                  <p className="event-price">💰 {event.price} kr pr. spiller</p>

                  <div className="spots-container">
                    <div className="spots-bar">
                      <div
                        className="spots-fill"
                        style={{
                          width: `${Math.min(((event.maxPlayers - spotsLeft) / event.maxPlayers) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="spots-text">
                      {event.maxPlayers - spotsLeft} / {event.maxPlayers} spillere tilmeldt
                    </p>
                  </div>

                  {/* Individuelle spillere */}
                  <button
                    className="individual-toggle"
                    onClick={() => setShowIndividual(showIndividual === event.id ? null : event.id!)}
                  >
                    🏒 Individuelle spillere ({individuals.length})
                    {showIndividual === event.id ? ' ▲' : ' ▼'}
                  </button>

                  {showIndividual === event.id && (
                    <div className="individual-players-list">
                      {individuals.length > 0 ? (
                        individuals.map((player: any) => (
                          <div key={player.id} className="individual-player">
                            <span>{player.userName}</span>
                          </div>
                        ))
                      ) : (
                        <p className="no-individual">Ingen individuelle spillere endnu</p>
                      )}

                      {event.status === 'open' && !isRegisteredIndividual && myStatus !== 'team' && (
                        <button
                          className="join-individual-btn"
                          onClick={() => handleIndividualSignup(event.id!)}
                        >
                          + Tilmeld mig som individuel spiller
                        </button>
                      )}
                      {isRegisteredIndividual && (
                        <p className="registered-individual">✅ Du er tilmeldt som individuel spiller</p>
                      )}
                    </div>
                  )}

                  {/* Admin vagter */}
                  {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') &&
                    shifts.some(s => !s.taken) && (
                      <div className="shift-section">
                        <h4 className="shift-title">🛡️ Ledige vagter</h4>
                        {shifts.filter(s => !s.taken).map(shift => (
                          <button
                            key={shift.id}
                            className="take-shift-inline-btn"
                            onClick={() => handleTakeShift(shift.id!)}
                          >
                            Tag vagt #{shift.shiftNumber}
                          </button>
                        ))}
                      </div>
                    )}

                  <div className="event-actions">
                    {event.status === 'open' && myStatus !== 'team' ? (
                      <button className="event-btn primary" onClick={() => navigate('/myteam')}>
                        🏒 Tilmeld dig
                      </button>
                    ) : event.status === 'open' && myStatus === 'team' ? (
                      <button className="event-btn success" onClick={() => navigate('/myteam')}>
                        ✅ Se dit hold
                      </button>
                    ) : (
                      <button className="event-btn disabled" disabled>
                        🔴 Lukket for tilmelding
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Årskalender med grøn/rød cirkel */}
        {allFutureEvents.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: '30px' }}>📆 Alle Events</h2>
            <p className="calendar-note">
              🟢 = Tilmeldt &nbsp;🔴 = Ikke tilmeldt &nbsp; Klik for at tilmelde dig
            </p>
            <div className="year-calendar">
              {Object.entries(groupedByMonth).map(([month, events]) => (
                <div key={month} className="month-card">
                  <h3 className="month-name">{month}</h3>
                  <div className="month-events">
                    {events.map(event => {
                      const myStatus = userStatusMap[event.id!];
                      const isSignedUp = myStatus === 'team' || myStatus === 'individual' || myStatus === 'waitlist';
                      const isSelected = selectedEvent === event.id;

                      return (
                        <div key={event.id}>
                          <button
                            className={`month-event-badge ${event.status} ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedEvent(isSelected ? null : event.id!)}
                          >
                            {isSignedUp ? '🟢' : '🔴'} {new Date(event.date).toLocaleDateString('da-DK', {
                              day: 'numeric', month: 'short'
                            })}
                          </button>

                          {isSelected && (
                            <div className="month-event-expanded">
                              <h4>{formatDate(event.date)}</h4>
                              <p>⏰ {event.time}</p>
                              <p>💰 {event.price} kr pr. spiller</p>
                              <p>👥 {event.maxPlayers - getSpotsLeft(event.id!, event.maxPlayers)}/{event.maxPlayers} tilmeldt</p>

                              {/* Din status */}
                              {myStatus === 'team' && (
                                <p className="expanded-status team">✅ Du er tilmeldt på hold</p>
                              )}
                              {myStatus === 'individual' && (
                                <p className="expanded-status individual">🏒 Du er tilmeldt som individuel</p>
                              )}
                              {myStatus === 'waitlist' && (
                                <p className="expanded-status waitlist">⏳ Du er på venteliste</p>
                              )}

                              {event.status === 'open' && !isSignedUp && (
                                <div className="month-event-actions">
                                  <button
                                    className="month-signup-btn"
                                    onClick={() => navigate('/myteam')}
                                  >
                                    👥 Tilmeld hold
                                  </button>
                                  <button
                                    className="month-individual-btn"
                                    onClick={() => handleIndividualSignup(event.id!)}
                                  >
                                    🏒 Individuel
                                  </button>
                                </div>
                              )}
                              {isSignedUp && (
                                <button
                                  className="month-signup-btn"
                                  onClick={() => navigate('/myteam')}
                                >
                                  👀 Se tilmelding
                                </button>
                              )}
                              {event.status !== 'open' && (
                                <p className="month-closed">🔴 Lukket for tilmelding</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default Calendar;