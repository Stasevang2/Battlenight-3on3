import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  createConversation,
  markConversationAsRead,
  deleteConversation,
  getOrCreateAdminBroadcast,
} from '../services/messageService';
import type { Conversation, Message } from '../services/messageService';
import { getAllUsers } from '../services/userService';
import type { User } from '../services/userService';
import {
  getBattlenights,
  getTeamsForBattlenight,
  getIndividualSignups,
} from '../services/battlenightService';
import type { Battlenight } from '../services/battlenightService';
import '../styles/messages.css';

type Category = 'direct' | 'team' | 'admin' | 'challenges';

function Messages() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('direct');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [battlenights, setBattlenights] = useState<Battlenight[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToConversations(currentUser.userId, (convs) => {
      setConversations(convs);
      setIsLoading(false);
    });

    loadSupportData();
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!activeConversation?.id || !currentUser) return;

    if (unsubscribeMessagesRef.current) {
      unsubscribeMessagesRef.current();
    }

    const unsubscribe = subscribeToMessages(activeConversation.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    unsubscribeMessagesRef.current = unsubscribe;
    markConversationAsRead(activeConversation.id, currentUser.userId);

    return () => unsubscribe();
  }, [activeConversation]);

  const loadSupportData = async () => {
    try {
      const [users, events] = await Promise.all([
        getAllUsers(),
        getBattlenights(),
      ]);
      setAllUsers(users.filter(u => u.userId !== currentUser?.userId));
      setBattlenights(events);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation?.id || !currentUser || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(
        activeConversation.id,
        currentUser.userId,
        currentUser.firstName,
        newMessage,
        activeConversation.participants
      );
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
    setIsSending(false);
  };

  const handleStartDirectChat = async (user: User) => {
    if (!currentUser) return;

    const existingConv = conversations.find(c =>
      c.type === 'direct' &&
      c.participants.includes(user.userId) &&
      c.participants.includes(currentUser.userId)
    );

    if (existingConv) {
      setActiveConversation(existingConv);
      setShowNewChat(false);
      setActiveCategory('direct');
      return;
    }

    const convId = await createConversation({
      type: 'direct',
      participants: [currentUser.userId, user.userId],
      participantNames: [currentUser.firstName, user.firstName],
      lastMessage: '',
      lastMessageTime: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      unreadCount: {},
    });

    const newConv: Conversation = {
      id: convId,
      type: 'direct',
      participants: [currentUser.userId, user.userId],
      participantNames: [currentUser.firstName, user.firstName],
      lastMessage: '',
      unreadCount: {},
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
    };

    setActiveConversation(newConv);
    setShowNewChat(false);
    setActiveCategory('direct');
  };

  // Admin opretter broadcast til event
  const handleCreateAdminBroadcast = async (battlenight: Battlenight) => {
    if (!currentUser || !battlenight.id) return;

    try {
      // Hent alle tilmeldte
      const [teams, individuals] = await Promise.all([
        getTeamsForBattlenight(battlenight.id),
        getIndividualSignups(battlenight.id),
      ]);

      const participantIds: string[] = [];
      const participantNames: string[] = [];

      // Tilføj holdspillere
      teams.forEach(team => {
        team.players.forEach(player => {
          if (!participantIds.includes(player.userId)) {
            participantIds.push(player.userId);
            participantNames.push(player.firstName);
          }
        });
      });

      // Tilføj individuelle spillere
      (individuals as any[]).forEach(ind => {
        if (!participantIds.includes(ind.userId)) {
          participantIds.push(ind.userId);
          participantNames.push(ind.userName);
        }
      });

      // Tilføj admin selv
      if (!participantIds.includes(currentUser.userId)) {
        participantIds.push(currentUser.userId);
        participantNames.push(currentUser.firstName);
      }

      const convId = await getOrCreateAdminBroadcast(
        battlenight.id,
        battlenight.date,
        participantIds,
        participantNames
      );

      const newConv: Conversation = {
        id: convId,
        type: 'admin',
        participants: participantIds,
        participantNames: participantNames,
        battlenightId: battlenight.id,
        battlenightDate: battlenight.date,
        teamName: `📢 Battlenight ${battlenight.date}`,
        lastMessage: '',
        unreadCount: {},
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      };

      setActiveConversation(newConv);
      setShowNewChat(false);
      setActiveCategory('admin');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await deleteConversation(convId);
      setShowDeleteConfirm(null);
      if (activeConversation?.id === convId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (activeCategory === 'direct') return conv.type === 'direct';
    if (activeCategory === 'team') return conv.type === 'team';
    if (activeCategory === 'admin') return conv.type === 'admin';
    if (activeCategory === 'challenges') return conv.type === 'challenge';
    return false;
  });

  const categoryUnread = (type: string) => {
    return conversations
      .filter(c => c.type === type)
      .reduce((sum, c) => sum + (c.unreadCount?.[currentUser?.userId || ''] || 0), 0);
  };

  const getConvName = (conv: Conversation) => {
    if (conv.type === 'direct') {
      return conv.participantNames?.find(n => n !== currentUser?.firstName) || 'Chat';
    }
    if (conv.type === 'admin') {
      return `📢 Battlenight ${conv.battlenightDate || ''}`;
    }
    if (conv.type === 'team') {
      return conv.teamName || 'Hold Chat';
    }
    if (conv.type === 'challenge') {
      return `⚔️ Udfordring`;
    }
    return 'Chat';
  };

  const getConvSubtitle = (conv: Conversation) => {
    if (conv.type === 'team' && conv.playerNames) {
      return conv.playerNames.join(', ');
    }
    if (conv.type === 'admin') {
      return `${conv.participants.length} tilmeldte`;
    }
    return null;
  };

  // Tjek om admin kan sende i admin tråd (kun admin/superadmin)
  const canSendInConversation = (conv: Conversation) => {
    if (conv.type === 'admin') {
      return currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
    }
    return true;
  };

  const filteredUsers = allUsers.filter(u =>
    u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdminOrSuperAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  if (!currentUser) {
    navigate('/');
    return null;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        {activeConversation ? (
          <button className="back-btn" onClick={() => {
            setActiveConversation(null);
            setMessages([]);
          }}>← Tilbage</button>
        ) : (
          <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        )}
        <h1 className="page-title">
          {activeConversation
            ? getConvName(activeConversation).substring(0, 18).toUpperCase()
            : 'BESKEDER'}
        </h1>
        {!activeConversation ? (
          <button className="new-chat-btn" onClick={() => setShowNewChat(!showNewChat)}>✏️</button>
        ) : (
          <button className="delete-conv-btn" onClick={() => setShowDeleteConfirm(activeConversation.id!)}>
            🗑️
          </button>
        )}
      </div>

      {/* Slet bekræftelse */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="delete-confirm-box" onClick={e => e.stopPropagation()}>
            <h3>🗑️ Slet samtale?</h3>
            <p>Er du sikker? Det kan ikke fortrydes.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-yes" onClick={() => handleDeleteConversation(showDeleteConfirm)}>
                ✅ Ja, slet
              </button>
              <button className="delete-confirm-no" onClick={() => setShowDeleteConfirm(null)}>
                ✕ Annuller
              </button>
            </div>
          </div>
        </div>
      )}

      {!activeConversation ? (
        <>
          {/* Ny chat panel */}
          {showNewChat && (
            <div className="new-chat-panel">

              {/* Direkte besked - søg spiller */}
              <div className="new-chat-section">
                <p className="new-chat-label">👤 Send direkte besked til spiller:</p>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Søg efter spiller..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className="user-search-results">
                    {filteredUsers.slice(0, 5).map(user => (
                      <button
                        key={user.id}
                        className="user-search-item"
                        onClick={() => handleStartDirectChat(user)}
                      >
                        <span className="user-search-name">{user.firstName}</span>
                        <span className="user-search-details">{user.club} · {user.userId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin broadcast - kun for admins */}
              {isAdminOrSuperAdmin && battlenights.length > 0 && (
                <div className="new-chat-section">
                  <p className="new-chat-label">📢 Opret admin besked til event:</p>
                  {battlenights.slice(0, 3).map(bn => (
                    <button
                      key={bn.id}
                      className="broadcast-event-btn"
                      onClick={() => handleCreateAdminBroadcast(bn)}
                    >
                      📢 Battlenight {bn.date}
                      <span className="broadcast-event-sub">Skriv til alle tilmeldte</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Kategori tabs */}
          <div className="message-categories">
            {([
              { key: 'direct' as Category, label: '👤 Spiller', type: 'direct' },
              { key: 'team' as Category, label: '👥 Hold', type: 'team' },
              { key: 'admin' as Category, label: '📢 Admin', type: 'admin' },
              { key: 'challenges' as Category, label: '⚔️ Udfordringer', type: 'challenge' },
            ]).map(cat => (
              <button
                key={cat.key}
                className={`category-tab ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                {cat.label}
                {categoryUnread(cat.type) > 0 && (
                  <span className="tab-badge">{categoryUnread(cat.type)}</span>
                )}
              </button>
            ))}
          </div>

          <div className="content">
            {isLoading ? (
              <p className="loading-text">⏳ Henter beskeder...</p>
            ) : filteredConversations.length === 0 ? (
              <div className="no-messages">
                <p>Ingen beskeder endnu</p>
                {activeCategory === 'direct' && <p>Tryk ✏️ øverst for at starte en samtale</p>}
                {activeCategory === 'team' && <p>Hold chats oprettes automatisk når du er på et hold</p>}
                {activeCategory === 'admin' && <p>Admin beskeder fra events vises her</p>}
                {activeCategory === 'challenges' && <p>Udfordringer fra ranglisten vises her</p>}
              </div>
            ) : (
              <div className="conversations-list">
                {filteredConversations.map((conv) => {
                  const unread = conv.unreadCount?.[currentUser.userId] || 0;
                  const subtitle = getConvSubtitle(conv);

                  return (
                    <div key={conv.id} className="conversation-row">
                      <button
                        className={`conversation-card ${unread > 0 ? 'has-unread' : ''}`}
                        onClick={() => setActiveConversation(conv)}
                      >
                        <div className="conv-avatar">
                          {conv.type === 'team' ? '👥' :
                            conv.type === 'admin' ? '📢' :
                              conv.type === 'challenge' ? '⚔️' : '👤'}
                        </div>
                        <div className="conv-info">
                          <div className="conv-header">
                            <span className="conv-name">{getConvName(conv)}</span>
                            <span className="conv-time">
                              {conv.lastMessageTime
                                ? (conv.lastMessageTime as any)?.toDate?.()?.toLocaleTimeString('da-DK', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : ''}
                            </span>
                          </div>
                          {subtitle && (
                            <p className="conv-subtitle">{subtitle}</p>
                          )}
                          <p className="conv-last-message">
                            {conv.lastMessage || 'Ingen beskeder endnu'}
                          </p>
                        </div>
                        {unread > 0 && (
                          <span className="unread-badge">{unread}</span>
                        )}
                      </button>
                      <button
                        className="conv-delete-btn"
                        onClick={() => setShowDeleteConfirm(conv.id!)}
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Chat vindue */
        <div className="chat-container">

          {/* Admin broadcast info */}
          {activeConversation.type === 'admin' && (
            <div className="admin-broadcast-info">
              <p>📢 Besked til alle tilmeldte på {activeConversation.battlenightDate}</p>
              <p className="admin-broadcast-sub">
                {isAdminOrSuperAdmin
                  ? 'Du skriver til alle tilmeldte · Spillere kan svare direkte til dig'
                  : 'Svar til admin går direkte til admin - ikke til alle'}
              </p>
            </div>
          )}

          {/* Hold info */}
          {activeConversation.type === 'team' && (
            <div className="team-chat-info">
              <p>👥 {activeConversation.teamName}</p>
              {activeConversation.playerNames && (
                <p className="team-chat-players">{activeConversation.playerNames.join(' · ')}</p>
              )}
            </div>
          )}

          <div className="messages-list">
            {messages.length === 0 ? (
              <p className="no-messages-yet">
                {activeConversation.type === 'admin' && isAdminOrSuperAdmin
                  ? '📢 Send en besked til alle tilmeldte på dette event'
                  : 'Ingen beskeder endnu - skriv den første! 👋'}
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.fromUserId === currentUser.userId ? 'mine' : 'theirs'}`}
                >
                  {msg.fromUserId !== currentUser.userId && (
                    <span className="message-from">{msg.fromUserName}</span>
                  )}
                  <div className="message-bubble">
                    <p>{msg.text}</p>
                    <span className="message-time">
                      {(msg.createdAt as any)?.toDate?.()?.toLocaleTimeString('da-DK', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || ''}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - kun admin kan skrive i admin tråd broadcast */}
          {activeConversation.type === 'admin' && !isAdminOrSuperAdmin ? (
            <div className="reply-to-admin-info">
              <p>💬 Vil du svare til admin?</p>
              <button
                className="reply-to-admin-btn"
                onClick={async () => {
                  // Find admin i samtalen
                  const adminUser = allUsers.find(u =>
                    activeConversation.participants.includes(u.userId) &&
                    (u.role === 'admin' || u.role === 'superadmin')
                  );
                  if (adminUser) {
                    await handleStartDirectChat(adminUser);
                  }
                }}
              >
                ✉️ Send direkte besked til admin
              </button>
            </div>
          ) : (
            <div className="message-input-container">
              {activeConversation.type === 'admin' && isAdminOrSuperAdmin && (
                <div className="broadcast-sending-label">
                  📢 Sender til {activeConversation.participants.length} spillere
                </div>
              )}
              <div className="message-input-row">
                <input
                  type="text"
                  className="message-input"
                  placeholder={
                    activeConversation.type === 'admin'
                      ? 'Skriv besked til alle tilmeldte...'
                      : 'Skriv en besked...'
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Messages;