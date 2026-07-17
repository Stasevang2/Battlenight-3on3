import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../services/userService';
import { getUserByUserId } from '../services/userService';
import { getInvitesForUser } from '../services/battlenightService';
import { getUnreadCount } from '../services/notificationService';

type AuthContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  pendingInvites: number;
  unreadNotifications: number;
  refreshCounts: () => void;
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  isLoading: true,
  pendingInvites: 0,
  unreadNotifications: 0,
  refreshCounts: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUserId = localStorage.getItem('battlenight_userId');
        if (savedUserId) {
          const user = await getUserByUserId(savedUserId);
          if (user) {
            setCurrentUser(user);
          } else {
            localStorage.removeItem('battlenight_userId');
          }
        }
      } catch (err) {
        console.error(err);
        localStorage.removeItem('battlenight_userId');
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadCounts(currentUser.userId);
      // Opdater counts hvert 30 sekunder
      const interval = setInterval(() => loadCounts(currentUser.userId), 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadCounts = async (userId: string) => {
    try {
      const [invites, notifCount] = await Promise.all([
        getInvitesForUser(userId),
        getUnreadCount(userId),
      ]);
      setPendingInvites(invites.length);
      setUnreadNotifications(notifCount);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshCounts = () => {
    if (currentUser) {
      loadCounts(currentUser.userId);
    }
  };

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('battlenight_userId', user.userId);
    } else {
      localStorage.removeItem('battlenight_userId');
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      setCurrentUser: handleSetCurrentUser,
      isLoading,
      pendingInvites,
      unreadNotifications,
      refreshCounts,
    }}>
      {children}
    </AuthContext.Provider>
  );
}