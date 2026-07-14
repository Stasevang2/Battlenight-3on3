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
  const [isLoading, setIsLoading] = useState(true);
  const [showIndividual, setShowIndividual] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredIndividual, setRegisteredIndividual] = useState<string[]>([]);

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
        }
      }));

      setTeamsMap(teams);
      setShiftsMap(shifts);
      setIndividualMap(individuals);
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
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
      await loadData();
    } catch (err) {
      console.error(err);
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
    const takenSpots = teams.reduce((sum, t) => sum + t.players.length, 0) + individuals.length;
    return maxPlayers - takenSpots;
  };

  // Gruppér events pr måned til årskalender
  const groupedByMonth = battlenights.reduce((acc, event) => {
    const date = new Date(event.date);
    const monthKey = isNaN(date.getTime())
      ? event.date
      : date.toLocaleString('da-DK', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(event);
    return acc;
  }, {} as { [key: string]: Battlenight[] });

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">KALENDER</h1>
        <div />
      </div>

      {showConfirmation && (
        <div className="confirmation-banner">
          ✅ Du er tilmeldt som individuel spiller!
        </div>
      )}

      <div className="content">

        {/* Kommende events */}
        <h2 className="section-title">📅 Kommende Battlenights</h2>

        {isLoading ? (
          <p className="loading-text">⏳ Henter events...</p>
        ) : battlenights.filter(e => e.status === 'open' || e.status === 'closed').length === 0 ? (
          <div className="no-events">
            <p>🏒 Ingen kommende Battlenights endnu</p>
            <p>Hold øje med appen - nye events annonceres her!</p>
          </div>
        ) : (
          <div className="events-list">
            {battlenights
              .filter(e => e.status === 'open' || e.status === 'closed')
              .slice(0, 3)
              .map((event) => {
                const spotsLeft = getSpotsLeft(event.id!, event.maxPlayers);
                const shifts = shiftsMap[event.id!] || [];
                const individuals = individualMap[event.id!] || [];
                const takenShifts = shifts.filter(s => s.taken).length;
                const isRegisteredIndividual = registeredIndividual.includes(event.id!) ||
                  individuals.some((i: any) => i.userId === currentUser?.userId);

                return (
                  <div key={event.id} className={`event-card ${event.status}`}>
                    <div className="event-header">
                      <span className={`event-status-badge ${event.status}`}>
                        {event.status === 'open' ? '🟢 ÅBEN' : '🔴 LUKKET'}
                      </span>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
                        <button
                          className="event-shifts-btn"
                          onClick={() => navigate('/admin')}
                        >
                          🛡️ Vagter: {takenShifts}/{shifts.length}
                        </button>
                      )}
                    </div>

                    <h3 className="event-date">{event.date}</h3>
                    <p className="event-time">⏰ {event.time}</p>
                    <p className="event-price">💰 {event.price} kr pr. spiller</p>

                    <div className="spots-container">
                      <div className="spots-bar">
                        <div
                          className="spots-fill"
                          style={{
                            width: `${((event.maxPlayers - spotsLeft) / event.maxPlayers) * 100}%`,
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

                        {event.status === 'open' && !isRegisteredIndividual && (
                          <button
                            className="join-individual-btn"
                            onClick={() => handleIndividualSignup(event.id!)}
                          >
                            + Tilmeld mig som individuel spiller
                          </button>
                        )}
                        {isRegisteredIndividual && (
                          <p className="registered-individual">
                            ✅ Du er tilmeldt som individuel spiller
                          </p>
                        )}
                      </div>
                    )}

                    {/* Admin: Tag vagt */}
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
                      {event.status === 'open' ? (
                        <button
                          className="event-btn primary"
                          onClick={() => navigate('/myteam')}
                        >
                          🏒 Tilmeld dig
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

        {/* Årskalender - kun hvis der er events */}
        {Object.keys(groupedByMonth).length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: '30px' }}>
              📆 Alle Events
            </h2>
            <div className="year-calendar">
              {Object.entries(groupedByMonth).map(([month, events]) => (
                <div key={month} className="month-card">
                  <h3 className="month-name">{month}</h3>
                  <div className="month-events">
                    {events.map(event => (
                      <span
                        key={event.id}
                        className={`month-event-badge ${event.status}`}
                      >
                        🏒 {event.date}
                      </span>
                    ))}
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