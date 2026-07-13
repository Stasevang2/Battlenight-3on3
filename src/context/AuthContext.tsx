import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../services/userService';

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
    // Tjek om bruger er gemt i localStorage
    const savedUser = localStorage.getItem('battlenight_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('battlenight_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('battlenight_user');
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
