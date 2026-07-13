import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/messages.css';

const mockConversations = {
  team: [
    { id: 1, name: 'Ice Kings 🏒', lastMessage: 'Magnus: Er vi klar til lørdag?', time: '14:32', unread: 2, event: '18. Jan 2025' },
    { id: 2, name: 'Rungsted Rockets', lastMessage: 'Oliver: God kamp!', time: 'I går', unread: 0, event: '11. Jan 2025' },
  ],
  direct: [
    { id: 3, name: 'Magnus', lastMessage: 'Hej! Hvornår mødes vi?', time: '12:15', unread: 1, userId: 'MAGN9' },
    { id: 4, name: 'Oliver', lastMessage: 'Fedt vi vandt!', time: 'I går', unread: 0, userId: 'OLIV23' },
  ],
  admin: [
    { id: 5, name: '📢 Admin - 18. Jan', lastMessage: 'Husk Battlenight lørdag kl. 17:00!', time: '10:00', unread: 1, event: '18. Jan 2025' },
    { id: 6, name: '📢 Admin - 11. Jan', lastMessage: 'Tak for god kamp!', time: '21:00', unread: 0, event: '11. Jan 2025' },
  ],
  challenges: [
    { id: 7, name: '⚔️ Udfordring - Rungsted Rockets', lastMessage: 'Vi udfordrer jer til officiel kamp!', time: '09:00', unread: 1, status: 'pending' },
  ],
};

const mockMessages = [
  { id: 1, from: 'Magnus', text: 'Er vi klar til lørdag?', time: '14:30', isMe: false },
  { id: 2, from: 'Mig', text: 'Ja! Glæder mig!', time: '14:31', isMe: true },
  { id: 3, from: 'Magnus', text: 'Husk fuldt udstyr', time: '14:32', isMe: false },
  { id: 4, from: 'Oliver', text: 'Vi er klar! 🏒', time: '14:33', isMe: false },
];

type Category = 'team' | 'direct' | 'admin' | 'challenges';

function Messages() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('team');
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const allConversations = mockConversations[activeCategory];
  const activeChat = Object.values(mockConversations).flat().find(c => c.id === activeConversation);

  const totalUnread = {
    team: mockConversations.team.reduce((sum, c) => sum + c.unread, 0),
    direct: mockConversations.direct.reduce((sum, c) => sum + c.unread, 0),
    admin: mockConversations.admin.reduce((sum, c) => sum + c.unread, 0),
    challenges: mockConversations.challenges.reduce((sum, c) => sum + c.unread, 0),
  };

  return (
    <div className="page-container">
      <div className="page-header">
        {activeConversation ? (
          <button className="back-btn" onClick={() => setActiveConversation(null)}>← Tilbage</button>
        ) : (
          <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        )}
        <h1 className="page-title">
          {activeChat ? activeChat.name.toUpperCase().substring(0, 15) : 'BESKEDER'}
        </h1>
        <div />
      </div>

      {!activeConversation ? (
        <>
          {/* Kategori tabs */}
          <div className="message-categories">
            {([
              { key: 'team', label: '👥 Hold', count: totalUnread.team },
              { key: 'direct', label: '👤 Spiller', count: totalUnread.direct },
              { key: 'admin', label: '📢 Admin', count: totalUnread.admin },
              { key: 'challenges', label: '⚔️ Udfordringer', count: totalUnread.challenges },
            ] as { key: Category; label: string; count: number }[]).map(cat => (
              <button
                key={cat.key}
                className={`category-tab ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                {cat.label}
                {cat.count > 0 && <span className="tab-badge">{cat.count}</span>}
              </button>
            ))}
          </div>

          <div className="content">
            <div className="conversations-list">
              {allConversations.map((conv) => (
                <button
                  key={conv.id}
                  className="conversation-card"
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <div className="conv-avatar">
                    {activeCategory === 'team' ? '👥' :
                      activeCategory === 'admin' ? '📢' :
                        activeCategory === 'challenges' ? '⚔️' : '👤'}
                  </div>
                  <div className="conv-info">
                    <div className="conv-header">
                      <span className="conv-name">{conv.name}</span>
                      <span className="conv-time">{conv.time}</span>
                    </div>
                    <p className="conv-last-message">{conv.lastMessage}</p>
                    {'event' in conv && conv.event && (
                      <span className="conv-event-tag">🏒 {conv.event}</span>
                    )}
                    {'status' in conv && conv.status === 'pending' && (
                      <span className="challenge-pending-tag">⏳ Afventer svar</span>
                    )}
                  </div>
                  {conv.unread > 0 && (
                    <span className="unread-badge">{conv.unread}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="chat-container">
          <div className="messages-list">
            {mockMessages.map((msg) => (
              <div key={msg.id} className={`message ${msg.isMe ? 'mine' : 'theirs'}`}>
                {!msg.isMe && <span className="message-from">{msg.from}</span>}
                <div className="message-bubble">
                  <p>{msg.text}</p>
                  <span className="message-time">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="message-input-container">
            <input
              type="text"
              className="message-input"
              placeholder="Skriv en besked..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button className="send-btn">➤</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Messages;