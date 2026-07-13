import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp
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
  adminRequest?: 'pending' | 'approved' | 'rejected' | null;
  adminRequestDate?: Date | Timestamp | null;
  contact: {
    phone: string;
    snap: string;
    email: string;
  };
  createdAt: Date | Timestamp;
};

export const generateUserId = (firstName: string, playerNumber: number): string => {
  const name = firstName.toUpperCase().slice(0, 4);
  return `${name}${playerNumber}`;
};

export const createUser = async (userData: Omit<User, 'id' | 'userId' | 'balance' | 'createdAt'>) => {
  const userId = generateUserId(userData.firstName, userData.playerNumber);

  const existingUser = await getUserByUserId(userId);
  if (existingUser) {
    throw new Error(`Bruger ID ${userId} er allerede i brug - prøv et andet spillernummer`);
  }

  const newUser = {
    ...userData,
    userId,
    balance: 0,
    adminRequest: null,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'users'), newUser);
  return { id: docRef.id, ...newUser };
};

export const loginUser = async (firstName: string, password: string): Promise<User | null> => {
  const q = query(
    collection(db, 'users'),
    where('firstName', '==', firstName),
    where('password', '==', password)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
};

export const getUserByUserId = async (userId: string): Promise<User | null> => {
  const q = query(
    collection(db, 'users'),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
};

export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(userDoc => ({ id: userDoc.id, ...userDoc.data() } as User));
};

export const getPendingAdminRequests = async (): Promise<User[]> => {
  const q = query(
    collection(db, 'users'),
    where('adminRequest', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(userDoc => ({ id: userDoc.id, ...userDoc.data() } as User));
};

export const requestAdminRole = async (userId: string) => {
  const q = query(collection(db, 'users'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const docRef = doc(db, 'users', snapshot.docs[0].id);
  await updateDoc(docRef, {
    adminRequest: 'pending',
    adminRequestDate: Timestamp.now(),
  });
};

export const approveAdminRequest = async (id: string) => {
  const docRef = doc(db, 'users', id);
  await updateDoc(docRef, {
    role: 'admin',
    adminRequest: 'approved',
  });
};

export const rejectAdminRequest = async (id: string) => {
  const docRef = doc(db, 'users', id);
  await updateDoc(docRef, {
    adminRequest: 'rejected',
  });
};

export const updateUserBalance = async (userId: string, newBalance: number) => {
  const q = query(collection(db, 'users'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const docRef = doc(db, 'users', snapshot.docs[0].id);
  await updateDoc(docRef, { balance: newBalance });
};

export const updateUser = async (id: string, data: Partial<User>) => {
  const docRef = doc(db, 'users', id);
  await updateDoc(docRef, { ...data });
};