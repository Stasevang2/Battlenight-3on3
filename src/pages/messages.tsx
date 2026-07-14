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
  getTotalUnreadCount,
} from '../services/messageService';
import type { Conversation, Message } from '../services/messageService';
import { getAllUsers } from '../services/userService';
import type { User } from '../services/userService';
import '../styles/messages.css';

type Category = 'team' | 'direct' | 'admin' | 'challenges';

function Messages() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('direct');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToConversations(currentUser.userId, (convs) => {
      setConversations(convs);
      setIsLoading(false);
    });

    getAllUsers().then(users => {
      setAllUsers(users.filter(u => u.userId !== currentUser.userId));
    });

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation?.id || !currentUser) return;

    await sendMessage(
      activeConversation.id,
      currentUser.userId,
      currentUser.firstName,
      newMessage,
      activeConversation.participants
    );
    setNewMessage('');
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
      return;
    }

    const convId = await createConversation({
      type: 'direct',
      participants: [currentUser.userId, user.userId],
      participantNames: [currentUser.firstName, user.firstName],
      lastMessage: '',
      unreadCount: {},
    });

    setActiveConversation({
      id: convId,
      type: 'direct',
      participants: [currentUser.userId, user.userId],
      participantNames: [currentUser.firstName, user.firstName],
    } as Conversation);

    setShowNewChat(false);
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
      const otherName = conv.participantNames?.find(n => n !== currentUser?.firstName);
      return otherName || 'Direkte besked';
    }
    return conv.teamName || conv.type;
  };

  const filteredUsers = allUsers.filter(u =>
    u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {activeConversation ? getConvName(activeConversation).toUpperCase().substring(0, 15) : 'BESKEDER'}
        </h1>
        {!activeConversation && (
          <button className="new-chat-btn" onClick={() => setShowNewChat(!showNewChat)}>✏️</button>
        )}
      </div>

      {!activeConversation ? (
        <>
          {/* Ny chat søgning */}
          {showNewChat && (
            <div className="new-chat-panel">
              <input
                type="text"
                className="search-input"
                placeholder="Søg efter spiller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <div className="user-search-results">
                {filteredUsers.slice(0, 8).map(user => (
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
            </div>
          )}

          {/* Kategori tabs */}
          <div className="message-categories">
            {([
              { key: 'direct', label: '👤 Spiller', type: 'direct' },
              { key: 'team', label: '👥 Hold', type: 'team' },
              { key: 'admin', label: '📢 Admin', type: 'admin' },
              { key: 'challenges', label: '⚔️ Udfordringer', type: 'challenge' },
            ] as { key: Category; label: string; type: string }[]).map(cat => (
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
                <p>Tryk ✏️ øverst for at starte en ny samtale</p>
              </div>
            ) : (
              <div className="conversations-list">
                {filteredConversations.map((conv) => {
                  const unread = conv.unreadCount?.[currentUser.userId] || 0;
                  return (
                    <button
                      key={conv.id}
                      className="conversation-card"
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
                              ? (conv.lastMessageTime as any)?.toDate?.()?.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                        <p className="conv-last-message">{conv.lastMessage || 'Ingen beskeder endnu'}</p>
                        {conv.battlenightDate && (
                          <span className="conv-event-tag">🏒 {conv.battlenightDate}</span>
                        )}
                      </div>
                      {unread > 0 && (
                        <span className="unread-badge">{unread}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="chat-container">
          <div className="messages-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.fromUserId === currentUser.userId ? 'mine' : 'theirs'}`}>
                {msg.fromUserId !== currentUser.userId && (
                  <span className="message-from">{msg.fromUserName}</span>
                )}
                <div className="message-bubble">
                  <p>{msg.text}</p>
                  <span className="message-time">
                    {(msg.createdAt as any)?.toDate?.()?.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) || ''}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="message-input-container">
            <input
              type="text"
              className="message-input"
              placeholder="Skriv en besked..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="send-btn" onClick={handleSendMessage}>➤</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Messages;