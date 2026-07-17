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
  deleteDoc,
  writeBatch,
  getDoc,
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
  playerNames?: string[];
  battlenightId?: string;
  battlenightDate?: string;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: { [userId: string]: number };
  createdAt: Timestamp;
};

// Opret samtale
export const createConversation = async (data: Omit<Conversation, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'conversations'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

// Find eksisterende samtale
export const findExistingConversation = async (
  type: string,
  participants: string[],
  teamId?: string,
  battlenightId?: string
): Promise<Conversation | null> => {
  const snapshot = await getDocs(collection(db, 'conversations'));
  const conv = snapshot.docs.find(d => {
    const data = d.data() as Conversation;
    if (data.type !== type) return false;
    if (teamId && data.teamId !== teamId) return false;
    if (battlenightId && type === 'admin' && data.battlenightId !== battlenightId) return false;
    if (type === 'direct') {
      return participants.every(p => data.participants.includes(p)) &&
        data.participants.length === participants.length;
    }
    return true;
  });
  if (!conv) return null;
  return { id: conv.id, ...conv.data() } as Conversation;
};

// Opret hold chat automatisk
export const createTeamConversation = async (
  teamId: string,
  teamName: string,
  playerIds: string[],
  playerNames: string[],
  battlenightId: string,
  battlenightDate: string
): Promise<string> => {
  // Tjek om der allerede er en hold chat for dette hold på dette event
  const existing = await findExistingConversation('team', playerIds, teamId);
  if (existing?.id) return existing.id;

  const docRef = await addDoc(collection(db, 'conversations'), {
    type: 'team',
    participants: playerIds,
    participantNames: playerNames,
    playerNames: playerNames,
    teamId,
    teamName,
    battlenightId,
    battlenightDate,
    lastMessage: '',
    lastMessageTime: Timestamp.now(),
    unreadCount: {},
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

// Opret eller hent admin broadcast tråd for et event
export const getOrCreateAdminBroadcast = async (
  battlenightId: string,
  battlenightDate: string,
  participantIds: string[],
  participantNames: string[]
): Promise<string> => {
  const existing = await findExistingConversation('admin', [], undefined, battlenightId);
  if (existing?.id) {
    // Opdater participants hvis nye spillere er tilmeldt
    const convRef = doc(db, 'conversations', existing.id);
    await updateDoc(convRef, {
      participants: participantIds,
      participantNames: participantNames,
    });
    return existing.id;
  }

  const docRef = await addDoc(collection(db, 'conversations'), {
    type: 'admin',
    participants: participantIds,
    participantNames: participantNames,
    battlenightId,
    battlenightDate,
    teamName: `📢 Battlenight ${battlenightDate}`,
    lastMessage: '',
    lastMessageTime: Timestamp.now(),
    unreadCount: {},
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

// Tilføj spiller til admin broadcast
export const addPlayerToAdminBroadcast = async (
  battlenightId: string,
  userId: string,
  userName: string
) => {
  const snapshot = await getDocs(collection(db, 'conversations'));
  const adminConv = snapshot.docs.find(d => {
    const data = d.data() as Conversation;
    return data.type === 'admin' && data.battlenightId === battlenightId;
  });

  if (adminConv) {
    const data = adminConv.data() as Conversation;
    if (!data.participants.includes(userId)) {
      await updateDoc(doc(db, 'conversations', adminConv.id), {
        participants: [...data.participants, userId],
        participantNames: [...(data.participantNames || []), userName],
      });
    }
  }
};

// Subscribe til samtaler
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

// Subscribe til beskeder i en samtale
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

// Send besked
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
  const unreadUpdate: { [key: string]: number } = {};
  participants.forEach(p => {
    if (p !== fromUserId) unreadUpdate[`unreadCount.${p}`] = 1;
  });

  await updateDoc(convRef, {
    lastMessage: text,
    lastMessageTime: Timestamp.now(),
    ...unreadUpdate,
  });
};

// Marker samtale som læst
export const markConversationAsRead = async (conversationId: string, userId: string) => {
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    [`unreadCount.${userId}`]: 0,
  });
};

// Slet samtale og alle beskeder
export const deleteConversation = async (conversationId: string) => {
  const messagesQuery = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId)
  );
  const messagesSnapshot = await getDocs(messagesQuery);

  const batch = writeBatch(db);
  messagesSnapshot.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, 'conversations', conversationId));
  await batch.commit();
};

// Hent antal ulæste
export const getTotalUnreadCount = (conversations: Conversation[], userId: string): number => {
  return conversations.reduce((sum, conv) => {
    return sum + (conv.unreadCount?.[userId] || 0);
  }, 0);
};