import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../services/userService';
import { getUserByUserId } from '../services/userService';

type AuthContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUserId = localStorage.getItem('battlenight_userId');
        if (savedUserId) {
          // Hent frisk data fra Firebase ved refresh
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

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      // Gem kun userId - henter frisk data ved næste login
      localStorage.setItem('battlenight_userId', user.userId);
    } else {
      localStorage.removeItem('battlenight_userId');
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      setCurrentUser: handleSetCurrentUser,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}