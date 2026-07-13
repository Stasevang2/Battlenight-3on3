import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/food.css';

const mockMenu = [
  { id: 1, category: 'Mad', name: 'Hotdog', price: 25, emoji: '🌭' },
  { id: 2, category: 'Mad', name: 'Pølse i brød', price: 20, emoji: '🌭' },
  { id: 3, category: 'Mad', name: 'Bolle med kødsovs', price: 30, emoji: '🍝' },
  { id: 4, category: 'Drikke', name: 'Vand', price: 10, emoji: '💧' },
  { id: 5, category: 'Drikke', name: 'Juice', price: 15, emoji: '🧃' },
  { id: 6, category: 'Drikke', name: 'Sodavand', price: 15, emoji: '🥤' },
  { id: 7, category: 'Snacks', name: 'Frugt', price: 10, emoji: '🍎' },
  { id: 8, category: 'Snacks', name: 'Energibar', price: 15, emoji: '🍫' },
];

type OrderItem = {
  id: number;
  quantity: number;
};

function Food() {
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderItem[]>([]);

  const addItem = (id: number) => {
    setOrder(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const removeItem = (id: number) => {
    setOrder(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === id ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const getQuantity = (id: number) => {
    return order.find(item => item.id === id)?.quantity || 0;
  };

  const totalAmount = order.reduce((sum, orderItem) => {
    const menuItem = mockMenu.find(m => m.id === orderItem.id);
    return sum + (menuItem?.price || 0) * orderItem.quantity;
  }, 0);

  const categories = [...new Set(mockMenu.map(item => item.category))];

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">MAD & DRIKKE</h1>
        <div />
      </div>

      <div className="content">
        <p className="food-subtitle">Bestil nu - betal ved ankomst 💰</p>

        {categories.map(category => (
          <div key={category} className="food-section">
            <h2 className="section-title">{category}</h2>
            <div className="menu-list">
              {mockMenu.filter(item => item.category === category).map(item => (
                <div key={item.id} className="menu-item">
                  <span className="item-emoji">{item.emoji}</span>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{item.price} kr</span>
                  </div>
                  <div className="item-controls">
                    {getQuantity(item.id) > 0 && (
                      <>
                        <button className="qty-btn minus" onClick={() => removeItem(item.id)}>−</button>
                        <span className="qty-number">{getQuantity(item.id)}</span>
                      </>
                    )}
                    <button className="qty-btn plus" onClick={() => addItem(item.id)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {order.length > 0 && (
          <div className="order-summary">
            <h3 className="order-title">🛒 Din Bestilling</h3>
            {order.map(orderItem => {
              const menuItem = mockMenu.find(m => m.id === orderItem.id);
              return (
                <div key={orderItem.id} className="order-item">
                  <span>{menuItem?.emoji} {menuItem?.name} x{orderItem.quantity}</span>
                  <span>{(menuItem?.price || 0) * orderItem.quantity} kr</span>
                </div>
              );
            })}
            <div className="order-total">
              <span>Total</span>
              <span>{totalAmount} kr</span>
            </div>
            <p className="order-note">💳 Betales ved ankomst til admin</p>
            <button className="order-btn">✅ Afgiv bestilling</button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default Food;