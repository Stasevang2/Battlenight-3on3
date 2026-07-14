import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export type Message = {
  id?: string;
  conversationId: string;
  fromUserId: string;
  fromUserName: string;
  text: string;
  read: boolean;
  createdAt: Timestamp;
};

export type Conversation = {
  id?: string;
  type: 'direct' | 'team' | 'admin' | 'challenge';
  participants: string[];
  participantNames: string[];
  teamId?: string;
  teamName?: string;
  battlenightId?: string;
  battlenightDate?: string;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: { [userId: string]: number };
  createdAt: Timestamp;
};

export const createConversation = async (data: Omit<Conversation, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'conversations'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getConversationsForUser = async (userId: string): Promise<Conversation[]> => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
};

export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
    callback(conversations);
  });
};

export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
    callback(messages);
  });
};

export const sendMessage = async (
  conversationId: string,
  fromUserId: string,
  fromUserName: string,
  text: string,
  participants: string[]
) => {
  await addDoc(collection(db, 'messages'), {
    conversationId,
    fromUserId,
    fromUserName,
    text,
    read: false,
    createdAt: Timestamp.now(),
  });

  const convRef = doc(db, 'conversations', conversationId);
  const unreadCount: { [key: string]: number } = {};
  participants.forEach(p => {
    if (p !== fromUserId) unreadCount[p] = 1;
  });

  await updateDoc(convRef, {
    lastMessage: text,
    lastMessageTime: Timestamp.now(),
    unreadCount,
  });
};

export const markConversationAsRead = async (conversationId: string, userId: string) => {
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    [`unreadCount.${userId}`]: 0,
  });
};

export const getTotalUnreadCount = (conversations: Conversation[], userId: string): number => {
  return conversations.reduce((sum, conv) => {
    return sum + (conv.unreadCount?.[userId] || 0);
  }, 0);
};