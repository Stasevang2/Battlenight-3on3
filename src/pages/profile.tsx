import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/profile.css';

const mockUser = {
  firstName: 'Alexander',
  userId: 'ALEX17',
  club: 'Rungsted Hockey',
  birthYear: 2012,
  playerNumber: 17,
  balance: 75,
  role: 'player',
  contact: {
    phone: '12345678',
    snap: 'alexander_snap',
    email: 'alexander@email.dk',
  },
  stats: {
    attended: 12,
    officialWins: 8,
    officialLosses: 4,
  },
};

const mockBalanceHistory = [
  { id: 1, type: 'deposit', description: 'MobilePay indbetaling', amount: 100, date: '10. Jan 2025' },
  { id: 2, type: 'deduct', description: 'Battlenight deltagelse', amount: -25, date: '11. Jan 2025' },
  { id: 3, type: 'deposit', description: 'MobilePay indbetaling', amount: 50, date: '3. Jan 2025' },
  { id: 4, type: 'penalty', description: 'No-show straf', amount: -12, date: '4. Jan 2025' },
  { id: 5, type: 'deduct', description: 'Battlenight deltagelse', amount: -25, date: '28. Dec 2024' },
  { id: 6, type: 'deposit', description: 'MobilePay indbetaling', amount: 100, date: '20. Dec 2024' },
];

const mockFoodOrders = [
  { event: '18. Jan 2025', items: 'Hotdog x2, Vand x1', total: 60 },
  { event: '11. Jan 2025', items: 'Sodavand x2', total: 30 },
];

function Profile() {
  const navigate = useNavigate();
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const [showFoodOrders, setShowFoodOrders] = useState(false);
  const [contact, setContact] = useState(mockUser.contact);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">MIN PROFIL</h1>
        <div />
      </div>

      <div className="content">

        {/* Profil kort med User ID */}
        <div className="profile-card">
          <div className="profile-avatar">
            <span className="avatar-number">#{mockUser.playerNumber}</span>
          </div>
          <h2 className="profile-name">{mockUser.firstName}</h2>
          <div className="profile-user-id">
            <span>🪪 Bruger ID: </span>
            <strong>{mockUser.userId}</strong>
          </div>
          <p className="profile-club">{mockUser.club}</p>
          <p className="profile-year">Årgang {mockUser.birthYear}</p>
          <div className="mobilepay-hint">
            <p>💳 Brug dit Bruger ID <strong>{mockUser.userId}</strong> som besked ved MobilePay indbetaling</p>
          </div>
        </div>

        {/* Saldo */}
        <div className="balance-card">
          <div className="balance-info">
            <h3 className="balance-title">💰 Min Saldo</h3>
            <span className={`balance-amount ${mockUser.balance < 0 ? 'negative' : 'positive'}`}>
              {mockUser.balance} kr
            </span>
          </div>

          {mockUser.balance < 0 && (
            <div className="balance-warning">
              <p>⚠️ Du har negativ saldo</p>
              <p>Indbetal via MobilePay med dit Bruger ID <strong>{mockUser.userId}</strong> som besked</p>
              <p className="warning-note">⏰ Der kan gå 1-2 hverdage inden betalingen registreres</p>
            </div>
          )}

          {/* Saldo historik toggle */}
          <button
            className="history-toggle"
            onClick={() => setShowBalanceHistory(!showBalanceHistory)}
          >
            📋 Se alle bevægelser {showBalanceHistory ? '▲' : '▼'}
          </button>

          {showBalanceHistory && (
            <div className="balance-history-list">
              {mockBalanceHistory.map(item => (
                <div key={item.id} className={`history-row ${item.amount > 0 ? 'positive' : item.type === 'penalty' ? 'penalty' : 'negative'}`}>
                  <div className="history-info">
                    <span className="history-desc">{item.description}</span>
                    <span className="history-date">{item.date}</span>
                  </div>
                  <span className="history-amount">
                    {item.amount > 0 ? '+' : ''}{item.amount} kr
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistik */}
        <div className="stats-card">
          <h3 className="card-title">📊 Min Statistik</h3>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-number">{mockUser.stats.attended}</span>
              <span className="stat-label">Deltagelser</span>
            </div>
            <div className="stat-item official">
              <span className="stat-number">{mockUser.stats.officialWins}</span>
              <span className="stat-label">Officielle Sejre</span>
            </div>
            <div className="stat-item official">
              <span className="stat-number">{mockUser.stats.officialLosses}</span>
              <span className="stat-label">Officielle Nederlag</span>
            </div>
          </div>
          <p className="stats-note">⚔️ Sejre og nederlag er kun fra officielle udfordringskampe</p>
        </div>

        {/* Mad & Drikke bestillinger */}
        <div className="food-orders-card">
          <div className="card-header-row">
            <h3 className="card-title">🍔 Mine Bestillinger</h3>
            <button className="view-all-btn" onClick={() => navigate('/food')}>
              Se menu →
            </button>
          </div>
          <button
            className="history-toggle"
            onClick={() => setShowFoodOrders(!showFoodOrders)}
          >
            📋 Se bestillingshistorik {showFoodOrders ? '▲' : '▼'}
          </button>
          {showFoodOrders && (
            <div className="food-orders-list">
              {mockFoodOrders.map((order, index) => (
                <div key={index} className="food-order-row">
                  <div>
                    <p className="order-event">🏒 {order.event}</p>
                    <p className="order-items">{order.items}</p>
                  </div>
                  <span className="order-total">{order.total} kr</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kontaktinfo */}
        <div className="contact-card">
          <h3 className="card-title">📱 Kontaktinfo</h3>
          <p className="contact-subtitle">Denne info kan ses af andre spillere og admins</p>

          <div className="contact-fields">
            <div className="contact-field">
              <label>
                📞 Telefon
                <span className="field-required"> · Anbefalet</span>
              </label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                placeholder="Dit telefonnummer"
              />
              <span className="field-hint">💡 Gør det nemt for andre at kontakte dig</span>
            </div>

            <div className="contact-field">
              <label>
                👻 Snapchat
                <span className="field-optional"> · Valgfrit</span>
              </label>
              <input
                type="text"
                value={contact.snap}
                onChange={(e) => setContact({ ...contact, snap: e.target.value })}
                placeholder="Dit Snapchat navn"
              />
            </div>

            <div className="contact-field">
              <label>
                📧 Email
                <span className="field-optional"> · Valgfrit</span>
              </label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                placeholder="Din email"
              />
            </div>
          </div>

          {saved && (
            <div className="save-confirmation">✅ Dine oplysninger er gemt!</div>
          )}
          <button className="save-btn" onClick={handleSave}>
            💾 Gem ændringer
          </button>
        </div>

        {/* Log ud */}
        <button className="logout-btn" onClick={() => navigate('/')}>
          🚪 Log ud
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

export default Profile;