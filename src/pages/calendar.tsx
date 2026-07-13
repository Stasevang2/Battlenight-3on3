import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/calendar.css';

const mockUpcomingEvents = [
  {
    id: 1,
    date: 'Lørdag d. 18. Januar 2025',
    time: '17:00 - 20:00',
    spotsLeft: 8,
    totalSpots: 36,
    status: 'open',
    shifts: 2,
    shiftsTaken: 1,
    individualPlayers: [
      { id: 10, firstName: 'Mathias', club: 'Rungsted', playerNumber: 4, birthYear: 2012 },
      { id: 11, firstName: 'Jonas', club: 'Herlev', playerNumber: 15, birthYear: 2013 },
    ],
  },
  {
    id: 2,
    date: 'Lørdag d. 25. Januar 2025',
    time: '17:00 - 20:00',
    spotsLeft: 36,
    totalSpots: 36,
    status: 'open',
    shifts: 2,
    shiftsTaken: 0,
    individualPlayers: [],
  },
  {
    id: 3,
    date: 'Lørdag d. 1. Februar 2025',
    time: '17:00 - 20:00',
    spotsLeft: 0,
    totalSpots: 36,
    status: 'full',
    shifts: 2,
    shiftsTaken: 2,
    individualPlayers: [],
  },
];

const mockYearEvents = [
  { month: 'Januar', events: ['18. Jan', '25. Jan'] },
  { month: 'Februar', events: ['1. Feb', '8. Feb', '22. Feb'] },
  { month: 'Marts', events: ['1. Mar', '15. Mar', '29. Mar'] },
  { month: 'April', events: ['5. Apr', '26. Apr'] },
  { month: 'Maj', events: ['10. Maj', '24. Maj'] },
];

function Calendar() {
  const navigate = useNavigate();
  const [showIndividual, setShowIndividual] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredIndividual, setRegisteredIndividual] = useState(false);

  const handleIndividualSignup = () => {
    setRegisteredIndividual(true);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">KALENDER</h1>
        <div />
      </div>

      {showConfirmation && (
        <div className="confirmation-banner">
          ✅ Du er tilmeldt som individuel spiller! Du modtager en bekræftelse.
        </div>
      )}

      <div className="content">

        {/* Næste 3 events */}
        <h2 className="section-title">📅 Kommende Battlenights</h2>
        <div className="events-list">
          {mockUpcomingEvents.map((event) => (
            <div key={event.id} className={`event-card ${event.status}`}>
              <div className="event-header">
                <span className={`event-status-badge ${event.status}`}>
                  {event.status === 'open' ? '🟢 ÅBEN' : '🔴 FULDT'}
                </span>
                <button
                  className="event-shifts-btn"
                  onClick={() => navigate('/admin')}
                >
                  🛡️ Vagter: {event.shiftsTaken}/{event.shifts}
                </button>
              </div>

              <h3 className="event-date">{event.date}</h3>
              <p className="event-time">⏰ {event.time}</p>

              <div className="spots-container">
                <div className="spots-bar">
                  <div
                    className="spots-fill"
                    style={{
                      width: `${((event.totalSpots - event.spotsLeft) / event.totalSpots) * 100}%`,
                    }}
                  />
                </div>
                <p className="spots-text">
                  {event.totalSpots - event.spotsLeft} / {event.totalSpots} spillere tilmeldt
                </p>
              </div>

              {/* Individuelle spillere */}
              <button
                className="individual-toggle"
                onClick={() => setShowIndividual(showIndividual === event.id ? null : event.id)}
              >
                🏒 Individuelle spillere ({event.individualPlayers.length})
                {showIndividual === event.id ? ' ▲' : ' ▼'}
              </button>

              {showIndividual === event.id && (
                <div className="individual-players-list">
                  {event.individualPlayers.length > 0 ? (
                    event.individualPlayers.map(player => (
                      <div key={player.id} className="individual-player">
                        <span>#{player.playerNumber} {player.firstName}</span>
                        <span className="player-details">{player.club} · {player.birthYear}</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-individual">Ingen individuelle spillere endnu</p>
                  )}

                  {event.status === 'open' && !registeredIndividual && (
                    <button className="join-individual-btn" onClick={handleIndividualSignup}>
                      + Tilmeld mig som individuel spiller
                    </button>
                  )}
                  {registeredIndividual && (
                    <p className="registered-individual">✅ Du er tilmeldt som individuel spiller</p>
                  )}
                </div>
              )}

              <div className="event-actions">
                {event.status === 'open' ? (
                  <button className="event-btn primary" onClick={() => navigate('/myteam')}>
                    👥 Tilmeld hold
                  </button>
                ) : (
                  <button className="event-btn disabled" disabled>
                    🔴 Fuldt booket
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Årskalender */}
        <h2 className="section-title" style={{ marginTop: '30px' }}>📆 Årskalender 2025</h2>
        <p className="calendar-note">Alle planlagte Battlenights for 2025</p>
        <div className="year-calendar">
          {mockYearEvents.map(month => (
            <div key={month.month} className="month-card">
              <h3 className="month-name">{month.month}</h3>
              <div className="month-events">
                {month.events.map(event => (
                  <span key={event} className="month-event-badge">
                    🏒 {event}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
      <BottomNav />
    </div>
  );
}

export default Calendar;