import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

export type User = {
  id?: string;
  userId: string;
  firstName: string;
  club: string;
  birthYear: number;
  playerNumber: number;
  password: string;
  role: 'player' | 'admin' | 'superadmin';
  balance: number;
  contact: {
    phone: string;
    snap: string;
    email: string;
  };
  createdAt: Date;
};

// Generer unikt bruger ID
export const generateUserId = (firstName: string, playerNumber: number): string => {
  const name = firstName.toUpperCase().slice(0, 4);
  return `${name}${playerNumber}`;
};

// Opret ny bruger
export const createUser = async (userData: Omit<User, 'id' | 'userId' | 'balance' | 'createdAt'>) => {
  const userId = generateUserId(userData.firstName, userData.playerNumber);
  
  // Tjek om userId allerede eksisterer
  const existingUser = await getUserByUserId(userId);
  if (existingUser) {
    throw new Error(`Bruger ID ${userId} er allerede i brug`);
  }

  const newUser: Omit<User, 'id'> = {
    ...userData,
    userId,
    balance: 0,
    createdAt: new Date(),
  };

  const docRef = await addDoc(collection(db, 'users'), newUser);
  return { id: docRef.id, ...newUser };
};

// Hent bruger via userId og password (login)
export const loginUser = async (firstName: string, password: string): Promise<User | null> => {
  const q = query(
    collection(db, 'users'),
    where('firstName', '==', firstName),
    where('password', '==', password)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
};

// Hent bruger via userId
export const getUserByUserId = async (userId: string): Promise<User | null> => {
  const q = query(
    collection(db, 'users'),
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
};

// Hent alle brugere
export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

// Opdater bruger saldo
export const updateUserBalance = async (userId: string, newBalance: number) => {
  const q = query(collection(db, 'users'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  
  const docRef = doc(db, 'users', snapshot.docs[0].id);
  await updateDoc(docRef, { balance: newBalance });
};

// Opdater bruger data
export const updateUser = async (id: string, data: Partial<User>) => {
  const docRef = doc(db, 'users', id);
  await updateDoc(docRef, data);
};
