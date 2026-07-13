import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAllUsers, 
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  updateUser
} from '../services/userService';
import type { User } from '../services/userService';
import '../styles/superadminpanel.css';

const mockMenuItems = [
  { id: 1, category: 'Mad', name: 'Hotdog', price: 25, emoji: '🌭', available: true },
  { id: 2, category: 'Mad', name: 'Pølse i brød', price: 20, emoji: '🌭', available: true },
  { id: 3, category: 'Drikke', name: 'Vand', price: 10, emoji: '💧', available: true },
  { id: 4, category: 'Drikke', name: 'Sodavand', price: 15, emoji: '🥤', available: true },
];

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
  const [activeTab, setActiveTab] = useState<'requests' | 'events' | 'users' | 'settings' | 'menu'>('requests');
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [price, setPrice] = useState(25);
  const [notifyHours, setNotifyHours] = useState({ first: 48, second: 6 });
  const [leaderboardActive, setLeaderboardActive] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', emoji: '🍽️', category: 'Mad' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allUsers, pending] = await Promise.all([
        getAllUsers(),
        getPendingAdminRequests(),
      ]);
      setUsers(allUsers);
      setPendingRequests(pending);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleApproveRequest = async (user: User) => {
    if (!user.id) return;
    try {
      await approveAdminRequest(user.id);
      setPendingRequests(prev => prev.filter(r => r.id !== user.id));
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, role: 'admin', adminRequest: 'approved' } : u
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (user: User) => {
    if (!user.id) return;
    try {
      await rejectAdminRequest(user.id);
      setPendingRequests(prev => prev.filter(r => r.id !== user.id));
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, adminRequest: 'rejected' } : u
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUser = async (user: User) => {
    if (!user.id) return;
    try {
      await updateUser(user.id, {
        firstName: user.firstName,
        club: user.club,
        playerNumber: user.playerNumber,
        role: user.role,
        password: user.password,
      });
      setEditingUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const addBalance = async (user: User, amount: number) => {
    if (!user.id) return;
    const newBalance = (user.balance || 0) + amount;
    await updateUser(user.id, { balance: newBalance });
    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, balance: newBalance } : u
    ));
  };

  const subtractBalance = async (user: User, amount: number) => {
    if (!user.id) return;
    const newBalance = (user.balance || 0) - amount;
    await updateUser(user.id, { balance: newBalance });
    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, balance: newBalance } : u
    ));
  };

  const applyCustomAmount = async (user: User, type: 'add' | 'subtract') => {
    const amount = Number(customAmount[user.id || '']);
    if (!amount || amount <= 0) return;
    if (type === 'add') {
      await addBalance(user, amount);
    } else {
      await subtractBalance(user, amount);
    }
    setCustomAmount(prev => ({ ...prev, [user.id || '']: '' }));
  };

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

  const deleteMenuItem = (id: number) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  };

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
        <button 
          className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`} 
          onClick={() => setActiveTab('requests')}
        >
          🛡️ Anmodninger
          {pendingRequests.length > 0 && (
            <span className="tab-badge">{pendingRequests.length}</span>
          )}
        </button>
        <button 
          className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`} 
          onClick={() => setActiveTab('events')}
        >
          📅 Events
        </button>
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} 
          onClick={() => setActiveTab('users')}
        >
          👥 Brugere
        </button>
        <button 
          className={`admin-tab ${activeTab === 'menu' ? 'active' : ''}`} 
          onClick={() => setActiveTab('menu')}
        >
          🍔 Menu
        </button>
        <button 
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} 
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Indstillinger
        </button>
      </div>

      <div className="content">

        {/* ANMODNINGER TAB */}
        {activeTab === 'requests' && (
          <div>
            <h2 className="section-title">🛡️ Admin Anmodninger</h2>
            
            {isLoading ? (
              <p className="loading-text">⏳ Henter anmodninger...</p>
            ) : pendingRequests.length === 0 ? (
              <div className="no-requests">
                <p>✅ Ingen ventende anmodninger</p>
              </div>
            ) : (
              <div className="requests-list">
                {pendingRequests.map(user => (
                  <div key={user.id} className="request-card">
                    <div className="request-info">
                      <div className="request-user-id">{user.userId}</div>
                      <h3 className="request-name">{user.firstName}</h3>
                      <p className="request-details">
                        {user.club} · Årgang {user.birthYear} · #{user.playerNumber}
                      </p>
                      <p className="request-date">
                        📅 Anmodet: {user.adminRequestDate 
                          ? new Date(user.adminRequestDate).toLocaleDateString('da-DK')
                          : 'Ukendt dato'}
                      </p>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="approve-btn"
                        onClick={() => handleApproveRequest(user)}
                      >
                        ✅ Godkend
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleRejectRequest(user)}
                      >
                        ❌ Afvis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div>
            <div className="sa-header-row">
              <h2 className="section-title">📅 Battlenights</h2>
              <button className="add-btn">+ Opret ny</button>
            </div>
            <p className="help-text">Events kommer når Firebase er fuldt integreret 🔥</p>
          </div>
        )}

        {/* BRUGERE TAB */}
        {activeTab === 'users' && (
          <div>
            <h2 className="section-title">👥 Alle Brugere</h2>

            <div className="mobilepay-info">
              <h3>📱 MobilePay Info til spillere</h3>
              <p>Spillere indbetaler til <strong>MobilePay boks #XXXXX</strong> med deres <strong>Bruger ID</strong> som besked.</p>
              <p>⏰ Der kan gå <strong>1-2 hverdage</strong> inden betalingen registreres i appen.</p>
            </div>

            {isLoading ? (
              <p className="loading-text">⏳ Henter brugere...</p>
            ) : (
              <div className="users-list">
                {users.map(user => (
                  <div key={user.id} className="sa-user-card">
                    <div 
                      className="sa-user-header" 
                      onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id || null)}
                    >
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
                        <span className={`balance-text ${(user.balance || 0) < 0 ? 'negative' : 'positive'}`}>
                          {user.balance || 0} kr
                        </span>
                        <span className="expand-arrow">{expandedUser === user.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {expandedUser === user.id && (
                      <div className="sa-user-expanded">

                        {/* Password */}
                        <div className="sa-section">
                          <h4>🔑 Password</h4>
                          <div className="password-row">
                            <input
                              type={showPassword[user.id || ''] ? 'text' : 'password'}
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
                              onClick={() => setShowPassword(prev => ({ 
                                ...prev, 
                                [user.id || '']: !prev[user.id || ''] 
                              }))}
                            >
                              {showPassword[user.id || ''] ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </div>

                        {/* Rediger bruger */}
                        <div className="sa-section">
                          <div className="sa-section-header">
                            <h4>✏️ Brugerdata</h4>
                            <button
                              className="edit-btn"
                              onClick={() => {
                                if (editingUser === user.id) {
                                  handleSaveUser(user);
                                } else {
                                  setEditingUser(user.id || null);
                                }
                              }}
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
                                  u.id === user.id ? { ...u, role: e.target.value as User['role'] } : u
                                ))}
                              >
                                <option value="player">👤 Spiller</option>
                                <option value="admin">🛡️ Admin</option>
                                <option value="superadmin">⚙️ Super Admin</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Saldo */}
                        <div className="sa-section">
                          <h4>💰 Saldo: <span className={(user.balance || 0) < 0 ? 'negative' : 'positive'}>{user.balance || 0} kr</span></h4>

                          <div className="balance-quick-btns">
                            <button className="balance-btn add" onClick={() => addBalance(user, 25)}>+25</button>
                            <button className="balance-btn add" onClick={() => addBalance(user, 50)}>+50</button>
                            <button className="balance-btn add" onClick={() => addBalance(user, 100)}>+100</button>
                            <button className="balance-btn subtract" onClick={() => subtractBalance(user, 25)}>-25</button>
                            <button className="balance-btn subtract" onClick={() => subtractBalance(user, 50)}>-50</button>
                            <button className="balance-btn subtract" onClick={() => subtractBalance(user, 100)}>-100</button>
                          </div>

                          <div className="custom-amount-row">
                            <input
                              type="number"
                              placeholder="Indtast beløb..."
                              value={customAmount[user.id || ''] || ''}
                              onChange={(e) => setCustomAmount(prev => ({ 
                                ...prev, 
                                [user.id || '']: e.target.value 
                              }))}
                              className="sa-input"
                            />
                            <button className="balance-btn add" onClick={() => applyCustomAmount(user, 'add')}>+ Tilføj</button>
                            <button className="balance-btn subtract" onClick={() => applyCustomAmount(user, 'subtract')}>- Træk</button>
                          </div>

                          <div className="balance-history">
                            <p className="history-title">📋 Bevægelser kommer med Firebase integration</p>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div>
            <h2 className="section-title">🍔 Mad & Drikke Menu</h2>

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
                      className="toggle-available-btn"
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
