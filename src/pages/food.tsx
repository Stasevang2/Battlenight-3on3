import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { getMenuItems, createFoodOrder } from '../services/menuService';
import type { MenuItem } from '../services/menuService';
import { getBattlenights } from '../services/battlenightService';
import type { Battlenight } from '../services/battlenightService';
import '../styles/food.css';

type OrderItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

function Food() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [battlenights, setBattlenights] = useState<Battlenight[]>([]);
  const [selectedBattlenight, setSelectedBattlenight] = useState<string>('');
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [items, events] = await Promise.all([
        getMenuItems(),
        getBattlenights(),
      ]);

      if (items.length === 0) {
        setMenuItems([
          { id: '1', category: 'Mad', name: 'Hotdog', description: 'Klassisk hotdog', price: 25, emoji: '🌭', available: true } as MenuItem,
          { id: '2', category: 'Mad', name: 'Pølse i brød', description: 'Pølse i brød', price: 20, emoji: '🌭', available: true } as MenuItem,
          { id: '3', category: 'Drikke', name: 'Vand', description: 'Koldt vand', price: 10, emoji: '💧', available: true } as MenuItem,
          { id: '4', category: 'Drikke', name: 'Sodavand', description: 'Sodavand', price: 15, emoji: '🥤', available: true } as MenuItem,
        ]);
      } else {
        setMenuItems(items.filter(i => i.available));
      }

      setBattlenights(events.filter(e => e.status === 'open'));
      if (events.length > 0) setSelectedBattlenight(events[0].id!);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const addItem = (item: MenuItem) => {
    setOrder(prev => {
      const existing = prev.find(o => o.menuItemId === item.id);
      if (existing) {
        return prev.map(o => o.menuItemId === item.id ? { ...o, quantity: o.quantity + 1 } : o);
      }
      return [...prev, {
        menuItemId: item.id!,
        name: item.name,
        price: item.price,
        quantity: 1,
      }];
    });
  };

  const removeItem = (menuItemId: string) => {
    setOrder(prev => {
      const existing = prev.find(o => o.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(o => o.menuItemId === menuItemId ? { ...o, quantity: o.quantity - 1 } : o);
      }
      return prev.filter(o => o.menuItemId !== menuItemId);
    });
  };

  const getQuantity = (menuItemId: string) => {
    return order.find(o => o.menuItemId === menuItemId)?.quantity || 0;
  };

  const totalAmount = order.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!currentUser || !selectedBattlenight || order.length === 0) return;
    try {
      await createFoodOrder({
        battlenightId: selectedBattlenight,
        userId: currentUser.userId,
        userName: currentUser.firstName,
        items: order,
        totalAmount,
        paid: false,
      });
      setOrder([]);
      setOrderPlaced(true);
      setTimeout(() => setOrderPlaced(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [...new Set(menuItems.map(item => item.category))];

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">MAD & DRIKKE</h1>
        <div />
      </div>

      {orderPlaced && (
        <div className="order-confirmation">
          ✅ Din bestilling er registreret! Betal ved ankomst.
        </div>
      )}

      <div className="content">
        <p className="food-subtitle">Bestil nu - betal ved ankomst 💰</p>

        {battlenights.length > 0 && (
          <div className="event-selector-food">
            <label>Vælg event:</label>
            <select
              className="food-select"
              value={selectedBattlenight}
              onChange={(e) => setSelectedBattlenight(e.target.value)}
            >
              {battlenights.map(b => (
                <option key={b.id} value={b.id}>{b.date}</option>
              ))}
            </select>
          </div>
        )}

        {isLoading ? (
          <p className="loading-text">⏳ Henter menu...</p>
        ) : (
          categories.map(category => (
            <div key={category} className="food-section">
              <h2 className="section-title">{category}</h2>
              <div className="menu-list">
                {menuItems.filter(item => item.category === category).map(item => (
                  <div key={item.id} className="menu-item">
                    <span className="item-emoji">{item.emoji}</span>
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      {item.description && (
                        <span className="item-description">{item.description}</span>
                      )}
                      <span className="item-price">{item.price} kr</span>
                    </div>
                    <div className="item-controls">
                      {getQuantity(item.id!) > 0 && (
                        <>
                          <button className="qty-btn minus" onClick={() => removeItem(item.id!)}>−</button>
                          <span className="qty-number">{getQuantity(item.id!)}</span>
                        </>
                      )}
                      <button className="qty-btn plus" onClick={() => addItem(item)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {order.length > 0 && (
          <div className="order-summary">
            <h3 className="order-title">🛒 Din Bestilling</h3>
            {order.map(orderItem => (
              <div key={orderItem.menuItemId} className="order-item">
                <span>{orderItem.name} x{orderItem.quantity}</span>
                <span>{orderItem.price * orderItem.quantity} kr</span>
              </div>
            ))}
            <div className="order-total">
              <span>Total</span>
              <span>{totalAmount} kr</span>
            </div>
            <p className="order-note">💳 Betales ved ankomst til admin</p>
            <button className="order-btn" onClick={handlePlaceOrder}>
              ✅ Afgiv bestilling
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default Food;