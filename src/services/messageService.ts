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
  writeBatch,
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

export const createConversation = async (data: Omit<Conversation, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'conversations'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const createTeamConversation = async (
  teamId: string,
  teamName: string,
  playerIds: string[],
  playerNames: string[],
  battlenightId: string,
  battlenightDate: string
): Promise<string> => {
  try {
    console.log('createTeamConversation kaldt med:', { teamId, teamName, playerIds });

    // Søg efter eksisterende hold chat med dette teamId
    const q = query(
      collection(db, 'conversations'),
      where('type', '==', 'team'),
      where('teamId', '==', teamId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log('Hold chat eksisterer allerede:', snapshot.docs[0].id);
      return snapshot.docs[0].id;
    }

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

    console.log('Hold chat oprettet med ID:', docRef.id, 'teamId:', teamId);
    return docRef.id;
  } catch (err) {
    console.error('Fejl i createTeamConversation:', err);
    throw err;
  }
};

export const addPlayerToTeamConversation = async (
  teamId: string,
  userId: string,
  userName: string
) => {
  try {
    console.log('addPlayerToTeamConversation kaldt:', { teamId, userId, userName });

    // Søg efter hold chat med dette teamId
    const q = query(
      collection(db, 'conversations'),
      where('type', '==', 'team'),
      where('teamId', '==', teamId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const convDoc = snapshot.docs[0];
      const data = convDoc.data() as Conversation;

      if (!data.participants.includes(userId)) {
        await updateDoc(doc(db, 'conversations', convDoc.id), {
          participants: [...data.participants, userId],
          participantNames: [...(data.participantNames || []), userName],
          playerNames: [...(data.playerNames || []), userName],
        });
        console.log('✅ Spiller tilføjet til hold chat:', userName);
      } else {
        console.log('Spiller allerede i hold chat:', userName);
      }
    } else {
      console.log('❌ Ingen hold chat fundet for teamId:', teamId);
    }
  } catch (err) {
    console.error('Fejl i addPlayerToTeamConversation:', err);
  }
};

export const getOrCreateAdminBroadcast = async (
  battlenightId: string,
  battlenightDate: string,
  participantIds: string[],
  participantNames: string[]
): Promise<string> => {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('type', '==', 'admin'),
      where('battlenightId', '==', battlenightId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await updateDoc(doc(db, 'conversations', snapshot.docs[0].id), {
        participants: participantIds,
        participantNames: participantNames,
      });
      return snapshot.docs[0].id;
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
  } catch (err) {
    console.error('Fejl i getOrCreateAdminBroadcast:', err);
    throw err;
  }
};

export const addPlayerToAdminBroadcast = async (
  battlenightId: string,
  userId: string,
  userName: string
) => {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('type', '==', 'admin'),
      where('battlenightId', '==', battlenightId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data() as Conversation;
      if (!data.participants.includes(userId)) {
        await updateDoc(doc(db, 'conversations', snapshot.docs[0].id), {
          participants: [...data.participants, userId],
          participantNames: [...(data.participantNames || []), userName],
        });
      }
    }
  } catch (err) {
    console.error('Fejl i addPlayerToAdminBroadcast:', err);
  }
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

export const markConversationAsRead = async (conversationId: string, userId: string) => {
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    [`unreadCount.${userId}`]: 0,
  });
};

export const deleteConversation = async (conversationId: string) => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);

    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'conversations', conversationId));
    await batch.commit();
  } catch (err) {
    console.error('Fejl i deleteConversation:', err);
    throw err;
  }
};

export const getTotalUnreadCount = (conversations: Conversation[], userId: string): number => {
  return conversations.reduce((sum, conv) => {
    return sum + (conv.unreadCount?.[userId] || 0);
  }, 0);
};