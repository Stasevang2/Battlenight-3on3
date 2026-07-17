import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { requestAdminRole, updateUser, deleteUserProfile } from '../services/userService';
import { getFoodOrdersForUser } from '../services/menuService';
import { getNotificationsForUser, markAllAsRead } from '../services/notificationService';
import type { FoodOrder } from '../services/menuService';
import type { Notification } from '../services/notificationService';
import '../styles/profile.css';

function Profile() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, refreshCounts } = useAuth();
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const [showFoodOrders, setShowFoodOrders] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [contact, setContact] = useState({
    phone: currentUser?.contact?.phone || '',
    snap: currentUser?.contact?.snap || '',
    email: currentUser?.contact?.email || '',
  });
  const [saved, setSaved] = useState(false);
  const [adminRequestSent, setAdminRequestSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (currentUser?.adminRequest === 'pending') {
      setAdminRequestSent(true);
    }
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const [orders, notifs] = await Promise.all([
        getFoodOrdersForUser(currentUser.userId),
        getNotificationsForUser(currentUser.userId),
      ]);
      setFoodOrders(orders);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      await updateUser(currentUser.id, { contact });
      setCurrentUser({ ...currentUser, contact });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleAdminRequest = async () => {
    if (!currentUser?.userId) return;
    setIsLoading(true);
    try {
      await requestAdminRole(currentUser.userId);
      setCurrentUser({ ...currentUser, adminRequest: 'pending' });
      setAdminRequestSent(true);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleShowNotifications = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && currentUser) {
      await markAllAsRead(currentUser.userId);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      refreshCounts();
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (
      notif.type === 'team_invite' ||
      notif.type === 'invite_accepted' ||
      notif.type === 'invite_rejected'
    ) {
      navigate('/myteam');
    } else if (notif.type === 'admin_request') {
      navigate('/superadmin');
    }
  };

  const handleDeleteProfile = async () => {
    if (!currentUser?.id) return;
    setIsDeleting(true);
    try {
      await deleteUserProfile(currentUser.userId, currentUser.id);
      setCurrentUser(null);
      navigate('/');
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    if (timestamp?.toDate) return timestamp.toDate().toLocaleDateString('da-DK');
    return new Date(timestamp).toLocaleDateString('da-DK');
  };

  if (!currentUser) {
    navigate('/');
    return null;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">MIN PROFIL</h1>
        <div />
      </div>

      <div className="content">

        {/* Profil kort */}
        <div className="profile-card">
          <div className="profile-avatar">
            <span className="avatar-number">#{currentUser.playerNumber}</span>
          </div>
          <h2 className="profile-name">{currentUser.firstName}</h2>
          <div className="profile-user-id">
            <span>🪪 Bruger ID: </span>
            <strong>{currentUser.userId}</strong>
          </div>
          <p className="profile-club">{currentUser.club}</p>
          <p className="profile-year">Årgang {currentUser.birthYear}</p>
          <div className="mobilepay-hint">
            <p>💳 Brug dit Bruger ID <strong>{currentUser.userId}</strong> som besked ved MobilePay indbetaling</p>
            <p className="mobilepay-note">⏰ Der kan gå 1-2 hverdage inden betalingen registreres</p>
          </div>
        </div>

        {/* Notifikationer */}
        <div className="notifications-card">
          <button
            className="notifications-toggle"
            onClick={handleShowNotifications}
          >
            <span>🔔 Notifikationer</span>
            <div className="notif-header-right">
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount}</span>
              )}
              <span>{showNotifications ? '▲' : '▼'}</span>
            </div>
          </button>

          {showNotifications && (
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <p className="no-notif">Ingen notifikationer endnu</p>
              ) : (
                notifications.slice(0, 15).map(notif => {
                  const isClickable =
                    notif.type === 'team_invite' ||
                    notif.type === 'invite_accepted' ||
                    notif.type === 'invite_rejected' ||
                    notif.type === 'admin_request';

                  return (
                    <div
                      key={notif.id}
                      className={`notif-item ${!notif.read ? 'unread' : ''} ${isClickable ? 'clickable' : ''}`}
                      onClick={() => isClickable && handleNotificationClick(notif)}
                    >
                      <div className="notif-content">
                        <p className="notif-title">{notif.title}</p>
                        <p className="notif-message">{notif.message}</p>
                        <p className="notif-time">{formatTimestamp(notif.createdAt)}</p>
                      </div>
                      {isClickable && (
                        <span className="notif-arrow">→</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Saldo */}
        <div className="balance-card">
          <div className="balance-info">
            <h3 className="balance-title">💰 Min Saldo</h3>
            <span className={`balance-amount ${(currentUser.balance || 0) < 0 ? 'negative' : 'positive'}`}>
              {currentUser.balance || 0} kr
            </span>
          </div>

          {(currentUser.balance || 0) < 0 && (
            <div className="balance-warning">
              <p>⚠️ Du har negativ saldo</p>
              <p>Indbetal via MobilePay med dit Bruger ID <strong>{currentUser.userId}</strong> som besked</p>
            </div>
          )}

          <button
            className="history-toggle"
            onClick={() => setShowBalanceHistory(!showBalanceHistory)}
          >
            📋 Se saldo historik {showBalanceHistory ? '▲' : '▼'}
          </button>

          {showBalanceHistory && (
            <div className="balance-history-note">
              <p>📊 Saldo historik vises når der er registreret bevægelser på din konto</p>
              <p>Kontakt en admin hvis du mener der er fejl i din saldo</p>
            </div>
          )}
        </div>

        {/* Statistik */}
        <div className="stats-card">
          <h3 className="card-title">📊 Min Statistik</h3>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Deltagelser</span>
            </div>
            <div className="stat-item official">
              <span className="stat-number">0</span>
              <span className="stat-label">Officielle Sejre</span>
            </div>
            <div className="stat-item official">
              <span className="stat-number">0</span>
              <span className="stat-label">Officielle Nederlag</span>
            </div>
          </div>
          <p className="stats-note">⚔️ Sejre og nederlag er kun fra officielle udfordringskampe</p>
        </div>

        {/* Mad bestillinger */}
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
              {foodOrders.length === 0 ? (
                <p className="no-orders">Ingen bestillinger endnu</p>
              ) : (
                foodOrders.map((order, index) => (
                  <div key={index} className="food-order-row">
                    <div>
                      <p className="order-event">🏒 {formatTimestamp(order.createdAt)}</p>
                      <p className="order-items">
                        {order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <span className="order-total">{order.totalAmount} kr</span>
                  </div>
                ))
              )}
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
          <button className="save-btn" onClick={handleSave} disabled={isLoading}>
            {isLoading ? '⏳ Gemmer...' : '💾 Gem ændringer'}
          </button>
        </div>

        {/* Bliv Admin */}
        {currentUser.role === 'player' && (
          <div className="admin-request-card">
            <h3 className="card-title">🛡️ Bliv Admin/Vagt</h3>
            <p className="admin-request-desc">
              Som admin kan du tage vagter til Battlenights og hjælpe med at afvikle arrangementerne.
              Forældre der tager vagter kan optjene kredit så deres barn ikke skal betale for at deltage.
            </p>

            {currentUser.adminRequest === 'rejected' && (
              <div className="request-rejected">
                ❌ Din anmodning blev afvist - kontakt en Super Admin for mere info
              </div>
            )}

            {currentUser.adminRequest === 'approved' && (
              <div className="request-approved">
                ✅ Din anmodning er godkendt! Log ud og ind igen for at se ændringen
              </div>
            )}

            {!adminRequestSent && currentUser.adminRequest !== 'rejected' && currentUser.adminRequest !== 'approved' && (
              <>
                <p className="admin-request-note">
                  💡 Din anmodning sendes til Super Admin som godkender den
                </p>
                <button
                  className="admin-request-btn"
                  onClick={handleAdminRequest}
                  disabled={isLoading}
                >
                  {isLoading ? '⏳ Sender...' : '🛡️ Anmod om Admin rolle'}
                </button>
              </>
            )}

            {adminRequestSent && currentUser.adminRequest !== 'rejected' && currentUser.adminRequest !== 'approved' && (
              <div className="request-pending">
                ⏳ Din anmodning afventer godkendelse fra Super Admin
              </div>
            )}
          </div>
        )}

        {/* Log ud */}
        <button className="logout-btn" onClick={() => {
          setCurrentUser(null);
          navigate('/');
        }}>
          🚪 Log ud
        </button>

        {/* Slet profil */}
        {showDeleteConfirm ? (
          <div className="delete-profile-confirm">
            <p>⚠️ Er du sikker på at du vil slette din profil?</p>
            <p className="delete-profile-note">
              Dette kan ikke fortrydes. Alle dine data, hold og beskeder slettes permanent.
            </p>
            <div className="delete-profile-actions">
              <button
                className="delete-profile-yes"
                onClick={handleDeleteProfile}
                disabled={isDeleting}
              >
                {isDeleting ? '⏳ Sletter...' : '🗑️ Ja, slet min profil'}
              </button>
              <button
                className="delete-profile-no"
                onClick={() => setShowDeleteConfirm(false)}
              >
                ✕ Annuller
              </button>
            </div>
          </div>
        ) : (
          <button
            className="delete-profile-btn"
            onClick={() => setShowDeleteConfirm(true)}
          >
            🗑️ Slet min profil
          </button>
        )}

      </div>

      <BottomNav />
    </div>
  );
}

export default Profile;