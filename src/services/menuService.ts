import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type MenuItem = {
  id?: string;
  category: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  available: boolean;
  createdAt: Timestamp;
};

export type FoodOrder = {
  id?: string;
  battlenightId: string;
  userId: string;
  userName: string;
  items: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totalAmount: number;
  paid: boolean;
  createdAt: Timestamp;
};

export const getMenuItems = async (): Promise<MenuItem[]> => {
  const snapshot = await getDocs(collection(db, 'menuItems'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
};

export const createMenuItem = async (data: Omit<MenuItem, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'menuItems'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateMenuItem = async (id: string, data: Partial<MenuItem>) => {
  const docRef = doc(db, 'menuItems', id);
  await updateDoc(docRef, { ...data });
};

export const deleteMenuItem = async (id: string) => {
  await deleteDoc(doc(db, 'menuItems', id));
};

export const createFoodOrder = async (data: Omit<FoodOrder, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'foodOrders'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getFoodOrdersForUser = async (userId: string): Promise<FoodOrder[]> => {
  const snapshot = await getDocs(collection(db, 'foodOrders'));
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as FoodOrder))
    .filter(o => o.userId === userId);
};

export const getFoodOrdersForBattlenight = async (battlenightId: string): Promise<FoodOrder[]> => {
  const snapshot = await getDocs(collection(db, 'foodOrders'));
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as FoodOrder))
    .filter(o => o.battlenightId === battlenightId);
};