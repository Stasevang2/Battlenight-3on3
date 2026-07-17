import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllUsers,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  updateUser,
  deleteUserProfile,
} from '../services/userService';
import type { User } from '../services/userService';
import {
  getBattlenights,
  createBattlenight,
  deleteBattlenight,
  updateBattlenight
} from '../services/battlenightService';
import type { Battlenight } from '../services/battlenightService';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../services/menuService';
import type { MenuItem } from '../services/menuService';
import { createNotification } from '../services/notificationService';
import '../styles/superadminpanel.css';

function SuperAdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'requests' | 'events' | 'users' | 'settings' | 'menu' | 'rules'>('requests');
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [battlenights, setBattlenights] = useState<Battlenight[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [customAmount, setCustomAmount] = useState<{ [key: string]: string }>({});
  const [price, setPrice] = useState(25);
  const [notifyHours, setNotifyHours] = useState({ first: 48, second: 6 });
  const [leaderboardActive, setLeaderboardActive] = useState(true);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    date: '',
    time: '17:00 - 20:00',
    maxTeams: 12,
    maxPlayers: 36,
    price: 25,
    zones: 3,
    maxShifts: 2,
    status: 'open' as const,
  });
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    emoji: '🍽️',
    category: 'Mad',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allUsers, pending, events, items] = await Promise.all([
        getAllUsers(),
        getPendingAdminRequests(),
        getBattlenights(),
        getMenuItems(),
      ]);
      setUsers(allUsers);
      setPendingRequests(pending);
      setBattlenights(events);
      setMenuItems(items);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Ukendt dato';
    if (timestamp?.toDate) return timestamp.toDate().toLocaleDateString('da-DK');
    if (timestamp instanceof Date) return timestamp.toLocaleDateString('da-DK');
    return 'Ukendt dato';
  };

  const handleApproveRequest = async (user: User) => {
    if (!user.id) return;
    try {
      await approveAdminRequest(user.id);
      await createNotification({
        toUserId: user.userId,
        type: 'admin_request',
        title: '✅ Admin anmodning godkendt!',
        message: 'Du er nu admin og kan tage vagter til Battlenights!',
      });
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
      await createNotification({
        toUserId: user.userId,
        type: 'admin_request',
        title: '❌ Admin anmodning afvist',
        message: 'Din anmodning om admin rolle blev afvist. Kontakt en Super Admin for mere info.',
      });
      setPendingRequests(prev => prev.filter(r => r.id !== user.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!user.id) return;
    try {
      await deleteUserProfile(user.userId, user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setDeleteUserConfirm(null);
      setExpandedUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.date) return;
    try {
      await createBattlenight(newEvent);
      await loadData();
      setShowNewEventForm(false);
      setNewEvent({
        date: '',
        time: '17:00 - 20:00',
        maxTeams: 12,
        maxPlayers: 36,
        price: 25,
        zones: 3,
        maxShifts: 2,
        status: 'open',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette event?')) return;
    try {
      await deleteBattlenight(id);
      setBattlenights(prev => prev.filter(b => b.id !== id));
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

  const handleCreateMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) return;
    try {
      await createMenuItem({
        category: newMenuItem.category,
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: Number(newMenuItem.price),
        emoji: newMenuItem.emoji,
        available: true,
      });
      await loadData();
      setNewMenuItem({ name: '', price: '', emoji: '🍽️', category: 'Mad', description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMenuItem = async (item: MenuItem) => {
    if (!item.id) return;
    try {
      await updateMenuItem(item.id, {
        name: item.name,
        description: item.description,
        price: item.price,
        emoji: item.emoji,
        category: item.category,
      });
      setEditingMenuItem(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMenuItem = async (item: MenuItem) => {
    if (!item.id) return;
    try {
      await updateMenuItem(item.id, { available: !item.available });
      setMenuItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, available: !i.available } : i
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Slet denne vare?')) return;
    try {
      await deleteMenuItem(id);
      setMenuItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">SUPER ADMIN</h1>
        <div />
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          🛡️ {pendingRequests.length > 0 && <span className="tab-badge">{pendingRequests.length}</span>}
        </button>
        <button className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          📅 Events
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          👥 Brugere
        </button>
        <button className={`admin-tab ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
          🍔 Menu
        </button>
        <button className={`admin-tab ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
          📋 Regler
        </button>
        <button className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          ⚙️
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
                        📅 Anmodet: {formatDate(user.adminRequestDate)}
                      </p>
                    </div>
                    <div className="request-actions">
                      <button className="approve-btn" onClick={() => handleApproveRequest(user)}>
                        ✅ Godkend
                      </button>
                      <button className="reject-btn" onClick={() => handleRejectRequest(user)}>
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
              <button className="add-btn" onClick={() => setShowNewEventForm(!showNewEventForm)}>
                {showNewEventForm ? '✕ Luk' : '+ Opret ny'}
              </button>
            </div>

            {showNewEventForm && (
              <div className="new-event-form">
                <h3 className="card-title">🏒 Opret ny Battlenight</h3>
                <div className="edit-field">
                  <label>Dato</label>
                  <input
                    type="date"
                    className="sa-input"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="edit-field">
                  <label>Tidspunkt</label>
                  <input
                    type="text"
                    className="sa-input"
                    placeholder="fx 17:00 - 20:00"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div className="add-menu-fields">
                  <div className="edit-field">
                    <label>Max hold</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={newEvent.maxTeams}
                      onChange={(e) => setNewEvent(prev => ({
                        ...prev,
                        maxTeams: Number(e.target.value),
                        maxPlayers: Number(e.target.value) * 3
                      }))}
                    />
                  </div>
                  <div className="edit-field">
                    <label>Antal vagter</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={newEvent.maxShifts}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, maxShifts: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="edit-field">
                    <label>Pris pr. spiller</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={newEvent.price}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="edit-field">
                    <label>Zoner</label>
                    <input
                      type="number"
                      className="sa-input"
                      value={newEvent.zones}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, zones: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <button className="add-btn full-width" onClick={handleCreateEvent}>
                  🏒 Opret Battlenight
                </button>
              </div>
            )}

            {isLoading ? (
              <p className="loading-text">⏳ Henter events...</p>
            ) : battlenights.length === 0 ? (
              <div className="no-requests">
                <p>Ingen events oprettet endnu</p>
              </div>
            ) : (
              <div className="events-list">
                {battlenights.map(event => (
                  <div key={event.id} className="sa-event-card">
                    <div className="sa-event-header">
                      <h3 className="sa-event-date">
                        {new Date(event.date).toLocaleDateString('da-DK', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </h3>
                      <button className="delete-btn" onClick={() => handleDeleteEvent(event.id!)}>🗑️</button>
                    </div>
                    <p className="sa-event-time">⏰ {event.time}</p>
                    <div className="event-details-row">
                      <span className="event-detail-badge">👥 Max {event.maxTeams} hold</span>
                      <span className="event-detail-badge">🛡️ {event.maxShifts} vagter</span>
                      <span className="event-detail-badge">💰 {event.price} kr</span>
                      <span className="event-detail-badge">🏒 {event.zones} zoner</span>
                    </div>
                    <div className="sa-event-status">
                      <select
                        className="sa-input"
                        value={event.status}
                        onChange={(e) => updateBattlenight(event.id!, { status: e.target.value as Battlenight['status'] })}
                      >
                        <option value="open">🟢 Åben</option>
                        <option value="closed">🔴 Lukket</option>
                        <option value="completed">✅ Afsluttet</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BRUGERE TAB */}
        {activeTab === 'users' && (
          <div>
            <h2 className="section-title">👥 Alle Brugere</h2>
            <div className="mobilepay-info">
              <h3>📱 MobilePay Info</h3>
              <p>Spillere indbetaler med deres <strong>Bruger ID</strong> som besked.</p>
              <p>⏰ Der kan gå <strong>1-2 hverdage</strong> inden betalingen registreres.</p>
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
                            {user.role === 'admin' ? '🛡️ Admin' : user.role === 'superadmin' ? '⚙️ Super' : '👤 Spiller'}
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

                        {/* Rediger */}
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
                        </div>

                        {/* Slet bruger */}
                        <div className="sa-section">
                          {deleteUserConfirm === user.id ? (
                            <div className="delete-user-confirm">
                              <p>⚠️ Slet <strong>{user.firstName}</strong>?</p>
                              <p className="delete-user-note">Alle data slettes permanent</p>
                              <div className="delete-user-actions">
                                <button
                                  className="delete-user-yes"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  🗑️ Ja, slet
                                </button>
                                <button
                                  className="delete-user-no"
                                  onClick={() => setDeleteUserConfirm(null)}
                                >
                                  ✕ Annuller
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="delete-user-btn"
                              onClick={() => setDeleteUserConfirm(user.id!)}
                            >
                              🗑️ Slet bruger
                            </button>
                          )}
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
                  <label>Beskrivelse</label>
                  <input
                    type="text"
                    className="sa-input"
                    placeholder="fx Klassisk hotdog"
                    value={newMenuItem.description}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
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
              <button className="add-btn full-width" onClick={handleCreateMenuItem}>
                ➕ Tilføj vare
              </button>
            </div>

            {isLoading ? (
              <p className="loading-text">⏳ Henter menu...</p>
            ) : menuItems.length === 0 ? (
              <div className="no-requests">
                <p>Ingen menuvarer endnu</p>
              </div>
            ) : (
              <div className="menu-items-list">
                {menuItems.map(item => (
                  <div key={item.id} className={`menu-item-admin ${!item.available ? 'unavailable' : ''}`}>
                    {editingMenuItem === item.id ? (
                      <div className="menu-item-edit">
                        <div className="menu-edit-fields">
                          <input
                            type="text"
                            className="sa-input"
                            value={item.emoji}
                            maxLength={2}
                            onChange={(e) => setMenuItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, emoji: e.target.value } : i
                            ))}
                          />
                          <input
                            type="text"
                            className="sa-input"
                            value={item.name}
                            onChange={(e) => setMenuItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, name: e.target.value } : i
                            ))}
                          />
                          <input
                            type="text"
                            className="sa-input"
                            value={item.description || ''}
                            placeholder="Beskrivelse"
                            onChange={(e) => setMenuItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, description: e.target.value } : i
                            ))}
                          />
                          <input
                            type="number"
                            className="sa-input"
                            value={item.price}
                            onChange={(e) => setMenuItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, price: Number(e.target.value) } : i
                            ))}
                          />
                        </div>
                        <div className="menu-edit-actions">
                          <button className="save-menu-btn" onClick={() => handleSaveMenuItem(item)}>
                            💾 Gem
                          </button>
                          <button className="cancel-menu-btn" onClick={() => setEditingMenuItem(null)}>
                            ✕ Annuller
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="item-emoji">{item.emoji}</span>
                        <div className="item-info">
                          <span className="item-name">{item.name}</span>
                          <span className="item-category">{item.category} · {item.price} kr</span>
                          {item.description && (
                            <span className="item-desc">{item.description}</span>
                          )}
                        </div>
                        <div className="item-admin-actions">
                          <button className="edit-menu-btn" onClick={() => setEditingMenuItem(item.id!)}>
                            ✏️
                          </button>
                          <button className="toggle-available-btn" onClick={() => handleToggleMenuItem(item)}>
                            {item.available ? '✅' : '❌'}
                          </button>
                          <button className="delete-item-btn" onClick={() => handleDeleteMenuItem(item.id!)}>
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REGLER TAB */}
        {activeTab === 'rules' && (
          <div>
            <h2 className="section-title">📋 Regler</h2>
            <div className="rules-info-card">
              <p>Reglerne redigeres direkte på regler siden.</p>
              <p>Som Super Admin kan du klikke på ✏️ ikonet ved siden af hver regel for at redigere den.</p>
            </div>
            <button
              className="add-btn full-width"
              onClick={() => navigate('/rules')}
              style={{ marginTop: '15px' }}
            >
              📋 Gå til regler siden
            </button>
          </div>
        )}

        {/* INDSTILLINGER TAB */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="section-title">⚙️ App Indstillinger</h2>
            <div className="settings-card">
              <h3 className="settings-title">💰 Standard pris pr. spiller</h3>
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