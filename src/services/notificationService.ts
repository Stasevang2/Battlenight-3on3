import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export type Notification = {
  id?: string;
  toUserId: string;
  type: 'team_invite' | 'invite_accepted' | 'invite_rejected' | 'battlenight_reminder' | 'admin_request' | 'general';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: Timestamp;
};

export const createNotification = async (data: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: Timestamp.now(),
  });
};

export const getNotificationsForUser = async (userId: string): Promise<Notification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const markAsRead = async (notificationId: string) => {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
};

export const markAllAsRead = async (userId: string) => {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map(d => updateDoc(d.ref, { read: true })));
};