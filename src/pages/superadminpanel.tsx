import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/superadminpanel.css';

const mockUsers = [
  { id: 1, userId: 'ALEX17', firstName: 'Alexander', club: 'Rungsted', playerNumber: 17, birthYear: 2012, balance: 75, role: 'player', password: 'alex123' },
  { id: 2, userId: 'MAGN9', firstName: 'Magnus', club: 'Rungsted', playerNumber: 9, birthYear: 2012, balance: 50, role: 'player', password: 'mag123' },
  { id: 3, userId: 'MORT0', firstName: 'Morten', club: '-', playerNumber: 0, birthYear: 1985, balance: 200, role: 'admin', password: 'admin123' },
  { id: 4, userId: 'OLIV23', firstName: 'Oliver', club: 'Herlev', playerNumber: 23, birthYear: 2011, balance: -25, role: 'player', password: 'oli123' },
];

const mockBattlenights = [
  { id: 1, date: 'Lørdag d. 18. Januar 2025', time: '17:00 - 20:00', maxShifts: 2, price: 25, status: 'open' },
  { id: 2, date: 'Lørdag d. 25. Januar 2025', time: '17:00 - 20:00', maxShifts: 2, price: 25, status: 'open' },
];

const mockMenuItems = [
  { id: 1, category: 'Mad', name: 'Hotdog', price: 25, emoji: '🌭', available: true },
  { id: 2, category: 'Mad', name: 'Pølse i brød', price: 20, emoji: '🌭', available: true },
  { id: 3, category: 'Drikke', name: 'Vand', price: 10, emoji: '💧', available: true },
  { id: 4, category: 'Drikke', name: 'Sodavand', price: 15, emoji: '🥤', available: true },
];

type User = {
  id: number;
  userId: string;
  firstName: string;
  club: string;
  playerNumber: number;
  birthYear: number;
  balance: number;
  role: string;
  password: string;
};

type MenuItem = {
  id: number;
  category: string;
  name: string;
  price: number;
  emoji: string;
  available: boolean;
};

function SuperAdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'events' | 'users' | 'settings' | 'menu'>('events');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [price, setPrice] = useState(25);
  const [notifyHours, setNotifyHours] = useState({ first: 48, second: 6 });
  const [leaderboardActive, setLeaderboardActive] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<{ [key: number]: string }>({});
  const [showPassword, setShowPassword] = useState<{ [key: number]: boolean }>({});
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', emoji: '🍽️', category: 'Mad' });

  // Balance funktioner
  const addBalance = (userId: number, amount: number) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? {
        ...user,
        balance: user.balance + amount
      } : user
    ));
  };

  const subtractBalance = (userId: number, amount: number) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? {
        ...user,
        balance: user.balance - amount
      } : user
    ));
  };

  const applyCustomAmount = (userId: number, type: 'add' | 'subtract') => {
    const amount = Number(customAmount[userId]);
    if (!amount || amount <= 0) return;
    if (type === 'add') {
      addBalance(userId, amount);
    } else {
      subtractBalance(userId, amount);
    }
    setCustomAmount(prev => ({ ...prev, [userId]: '' }));
  };

  // Reset password
  const resetPassword = (userId: number) => {
    const newPassword = Math.random().toString(36).slice(-6);
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, password: newPassword } : user
    ));
    alert(`Nyt password: ${newPassword}`);
  };

  // Tilføj menu item
  const addMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price) return;
    setMenuItems(prev => [...prev, {
      id: prev.length + 1,
      category: newMenuItem.category,
      name: newMenuItem.name,
      price: Number(newMenuItem.price),
      emoji: newMenuItem.emoji,
      available: true,
    }]);
    setNewMenuItem({ name: '', price: '', emoji: '🍽️', category: 'Mad' });
  };

  // Slet menu item
  const deleteMenuItem = (id: number) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  };

  // Toggle menu item tilgængelighed
  const toggleMenuItem = (id: number) => {
    setMenuItems(prev => prev.map(item =>
      item.id === id ? { ...item, available: !item.available } : item
    ));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">SUPER ADMIN</h1>
        <div />
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>📅 Events</button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Brugere</button>
        <button className={`admin-tab ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>🍔 Menu</button>
        <button className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ Indstillinger</button>
      </div>

      <div className="content">

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div>
            <div className="sa-header-row">
              <h2 className="section-title">📅 Battlenights</h2>
              <button className="add-btn">+ Opret ny</button>
            </div>
            <div className="events-list">
              {mockBattlenights.map(event => (
                <div key={event.id} className="sa-event-card">
                  <div className="sa-event-header">
                    <h3 className="sa-event-date">{event.date}</h3>
                    <button className="delete-btn">🗑️</button>
                  </div>
                  <p className="sa-event-time">⏰ {event.time}</p>
                  <div className="sa-event-details">
                    <div className="sa-detail">
                      <label>Vagter</label>
                      <input type="number" defaultValue={event.maxShifts} className="sa-input" />
                    </div>
                    <div className="sa-detail">
                      <label>Pris (kr)</label>
                      <input type="number" defaultValue={event.price} className="sa-input" />
                    </div>
                  </div>
                  <button className="save-event-btn">💾 Gem ændringer</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRUGERE TAB */}
        {activeTab === 'users' && (
          <div>
            <h2 className="section-title">👥 Alle Brugere</h2>

            {/* MobilePay info */}
            <div className="mobilepay-info">
              <h3>📱 MobilePay Info til spillere</h3>
              <p>Spillere indbetaler til <strong>MobilePay boks #XXXXX</strong> med deres <strong>Bruger ID</strong> som besked.</p>
              <p>⏰ Der kan gå <strong>1-2 hverdage</strong> inden betalingen registreres i appen.</p>
            </div>

            <div className="users-list">
              {users.map(user => (
                <div key={user.id} className="sa-user-card">
                  {/* User header */}
                  <div className="sa-user-header" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                    <div>
                      <div className="sa-user-id-row">
                        <span className="sa-user-id">🪪 {user.userId}</span>
                        <span className={`role-badge ${user.role}`}>
                          {user.role === 'admin' ? '🛡️ Admin' : user.role === 'superadmin' ? '⚙️ Super Admin' : '👤 Spiller'}
                        </span>
                      </div>
                      <p className="sa-user-name">{user.firstName} #{user.playerNumber}</p>
                      <p className="sa-user-details">{user.club} · Årgang {user.birthYear}</p>
                    </div>
                    <div className="sa-user-balance-preview">
                      <span className={`balance-text ${user.balance < 0 ? 'negative' : 'positive'}`}>
                        {user.balance} kr
                      </span>
                      <span className="expand-arrow">{expandedUser === user.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded user details */}
                  {expandedUser === user.id && (
                    <div className="sa-user-expanded">

                      {/* Password sektion */}
                      <div className="sa-section">
                        <h4>🔑 Password</h4>
                        <div className="password-row">
                          <input
                            type={showPassword[user.id] ? 'text' : 'password'}
                            value={user.password}
                            className="sa-input"
                            readOnly={editingUser !== user.id}
                            onChange={(e) => {
                              if (editingUser === user.id) {
                                setUsers(prev => prev.map(u =>
                                  u.id === user.id ? { ...u, password: e.target.value } : u
                                ));
                              }
                            }}
                          />
                          <button
                            className="icon-btn"
                            onClick={() => setShowPassword(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                          >
                            {showPassword[user.id] ? '🙈' : '👁️'}
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => resetPassword(user.id)}
                          >
                            🔄
                          </button>
                        </div>
                      </div>

                      {/* Rediger bruger data */}
                      <div className="sa-section">
                        <div className="sa-section-header">
                          <h4>✏️ Brugerdata</h4>
                          <button
                            className="edit-btn"
                            onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                          >
                            {editingUser === user.id ? '💾 Gem' : '✏️ Rediger'}
                          </button>
                        </div>
                        <div className="edit-fields">
                          <div className="edit-field">
                            <label>Fornavn</label>
                            <input
                              type="text"
                              value={user.firstName}
                              className="sa-input"
                              readOnly={editingUser !== user.id}
                              onChange={(e) => setUsers(prev => prev.map(u =>
                                u.id === user.id ? { ...u, firstName: e.target.value } : u
                              ))}
                            />
                          </div>
                          <div className="edit-field">
                            <label>Klub</label>
                            <input
                              type="text"
                              value={user.club}
                              className="sa-input"
                              readOnly={editingUser !== user.id}
                              onChange={(e) => setUsers(prev => prev.map(u =>
                                u.id === user.id ? { ...u, club: e.target.value } : u
                              ))}
                            />
                          </div>
                          <div className="edit-field">
                            <label>Spillernummer</label>
                            <input
                              type="number"
                              value={user.playerNumber}
                              className="sa-input"
                              readOnly={editingUser !== user.id}
                              onChange={(e) => setUsers(prev => prev.map(u =>
                                u.id === user.id ? { ...u, playerNumber: Number(e.target.value) } : u
                              ))}
                            />
                          </div>
                          <div className="edit-field">
                            <label>Rolle</label>
                            <select
                              value={user.role}
                              className="sa-input"
                              disabled={editingUser !== user.id}
                              onChange={(e) => setUsers(prev => prev.map(u =>
                                u.id === user.id ? { ...u, role: e.target.value } : u
                              ))}
                            >
                              <option value="player">👤 Spiller</option>
                              <option value="admin">🛡️ Admin</option>
                              <option value="superadmin">⚙️ Super Admin</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Saldo sektion */}
                      <div className="sa-section">
                        <h4>💰 Saldo: <span className={user.balance < 0 ? 'negative' : 'positive'}>{user.balance} kr</span></h4>

                        {/* Hurtige knapper */}
                        <div className="balance-quick-btns">
                          <button className="balance-btn add" onClick={() => addBalance(user.id, 25)}>+25</button>
                          <button className="balance-btn add" onClick={() => addBalance(user.id, 50)}>+50</button>
                          <button className="balance-btn add" onClick={() => addBalance(user.id, 100)}>+100</button>
                          <button className="balance-btn subtract" onClick={() => subtractBalance(user.id, 25)}>-25</button>
                          <button className="balance-btn subtract" onClick={() => subtractBalance(user.id, 50)}>-50</button>
                          <button className="balance-btn subtract" onClick={() => subtractBalance(user.id, 100)}>-100</button>
                        </div>

                        {/* Vilkårligt beløb */}
                        <div className="custom-amount-row">
                          <input
                            type="number"
                            placeholder="Indtast beløb..."
                            value={customAmount[user.id] || ''}
                            onChange={(e) => setCustomAmount(prev => ({ ...prev, [user.id]: e.target.value }))}
                            className="sa-input"
                          />
                          <button className="balance-btn add" onClick={() => applyCustomAmount(user.id, 'add')}>+ Tilføj</button>
                          <button className="balance-btn subtract" onClick={() => applyCustomAmount(user.id, 'subtract')}>- Træk</button>
                        </div>

                        {/* Saldo historik */}
                        <div className="balance-history">
                          <p className="history-title">📋 Bevægelser</p>
                          <div className="history-item positive">✅ +100 kr · Indbetaling · 10. Jan 2025</div>
                          <div className="history-item negative">🏒 -25 kr · Battlenight deltagelse · 11. Jan 2025</div>
                          <div className="history-item negative">⚠️ -12 kr · No-show straf · 4. Jan 2025</div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div>
            <h2 className="section-title">🍔 Mad & Drikke Menu</h2>

            {/* Tilføj ny vare */}
            <div className="add-menu-card">
              <h3 className="card-title">➕ Tilføj ny vare</h3>
              <div className="add-menu-fields">
                <div className="edit-field">
                  <label>Kategori</label>
                  <select
                    className="sa-input"
                    value={newMenuItem.category}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option>Mad</option>
                    <option>Drikke</option>
                    <option>Snacks</option>
                  </select>
                </div>
                <div className="edit-field">
                  <label>Emoji</label>
                  <input
                    type="text"
                    className="sa-input"
                    value={newMenuItem.emoji}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, emoji: e.target.value }))}
                    maxLength={2}
                  />
                </div>
                <div className="edit-field">
                  <label>Navn</label>
                  <input
                    type="text"
                    className="sa-input"
                    placeholder="fx Hotdog"
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="edit-field">
                  <label>Pris (kr)</label>
                  <input
                    type="number"
                    className="sa-input"
                    placeholder="fx 25"
                    value={newMenuItem.price}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <button className="add-btn full-width" onClick={addMenuItem}>➕ Tilføj vare</button>
            </div>

            {/* Menu liste */}
            <div className="menu-items-list">
              {menuItems.map(item => (
                <div key={item.id} className={`menu-item-admin ${!item.available ? 'unavailable' : ''}`}>
                  <span className="item-emoji">{item.emoji}</span>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-category">{item.category} · {item.price} kr</span>
                  </div>
                  <div className="item-admin-actions">
                    <button
                      className={`toggle-available-btn ${item.available ? 'active' : 'inactive'}`}
                      onClick={() => toggleMenuItem(item.id)}
                    >
                      {item.available ? '✅' : '❌'}
                    </button>
                    <button className="delete-item-btn" onClick={() => deleteMenuItem(item.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INDSTILLINGER TAB */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="section-title">⚙️ App Indstillinger</h2>

            <div className="settings-card">
              <h3 className="settings-title">💰 Pris pr. spiller</h3>
              <div className="settings-row">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="sa-input"
                />
                <span className="settings-unit">kr</span>
              </div>
            </div>

            <div className="settings-card">
              <h3 className="settings-title">🔔 Push Notifikationer</h3>
              <div className="settings-field">
                <label>Første påmindelse (timer før)</label>
                <input
                  type="number"
                  value={notifyHours.first}
                  onChange={(e) => setNotifyHours(prev => ({ ...prev, first: Number(e.target.value) }))}
                  className="sa-input"
                />
              </div>
              <div className="settings-field">
                <label>Anden påmindelse (timer før)</label>
                <input
                  type="number"
                  value={notifyHours.second}
                  onChange={(e) => setNotifyHours(prev => ({ ...prev, second: Number(e.target.value) }))}
                  className="sa-input"
                />
              </div>
            </div>

            <div className="settings-card">
              <h3 className="settings-title">🏆 Rangliste</h3>
              <div className="settings-toggle-row">
                <span>Rangliste aktiv</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={leaderboardActive}
                    onChange={(e) => setLeaderboardActive(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <button className="save-settings-btn">💾 Gem alle indstillinger</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperAdminPanel;