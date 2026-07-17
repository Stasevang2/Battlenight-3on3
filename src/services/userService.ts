import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
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

export const deleteUserProfile = async (userId: string, userDocId: string) => {
  try {
    // 1. Slet bruger dokument
    await deleteDoc(doc(db, 'users', userDocId));

    // 2. Fjern fra hold
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    for (const teamDoc of teamsSnapshot.docs) {
      const team = teamDoc.data();
      const players = team.players || [];
      const isInTeam = players.some((p: any) => p.userId === userId);

      if (isInTeam) {
        const updatedPlayers = players.filter((p: any) => p.userId !== userId);
        if (updatedPlayers.length === 0) {
          await deleteDoc(teamDoc.ref);
        } else {
          // Hvis holdleder slettes - giv ny holdleder
          if (team.leaderId === userId) {
            const newLeader = updatedPlayers.find((p: any) => p.status === 'accepted') || updatedPlayers[0];
            await updateDoc(teamDoc.ref, {
              players: updatedPlayers,
              leaderId: newLeader.userId,
              leaderName: newLeader.firstName,
            });
          } else {
            await updateDoc(teamDoc.ref, { players: updatedPlayers });
          }
        }
      }
    }

    // 3. Slet ventende invitationer
    const invitesSentSnapshot = await getDocs(query(
      collection(db, 'teamInvites'),
      where('fromUserId', '==', userId)
    ));
    for (const d of invitesSentSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    const invitesReceivedSnapshot = await getDocs(query(
      collection(db, 'teamInvites'),
      where('toUserId', '==', userId)
    ));
    for (const d of invitesReceivedSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    // 4. Slet notifikationer
    const notifsSnapshot = await getDocs(query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId)
    ));
    for (const d of notifsSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    // 5. Fjern fra individuel tilmeldinger
    const individualSnapshot = await getDocs(query(
      collection(db, 'individualSignups'),
      where('userId', '==', userId)
    ));
    for (const d of individualSnapshot.docs) {
      await deleteDoc(d.ref);
    }

    // 6. Fjern fra conversations participants
    const convsSnapshot = await getDocs(collection(db, 'conversations'));
    for (const convDoc of convsSnapshot.docs) {
      const conv = convDoc.data();
      if (conv.participants && conv.participants.includes(userId)) {
        const updatedParticipants = conv.participants.filter((p: string) => p !== userId);
        const updatedNames = (conv.participantNames || []).filter((_: string, i: number) =>
          conv.participants[i] !== userId
        );
        if (updatedParticipants.length === 0) {
          await deleteDoc(convDoc.ref);
        } else {
          await updateDoc(convDoc.ref, {
            participants: updatedParticipants,
            participantNames: updatedNames,
          });
        }
      }
    }

    console.log('✅ Bruger slettet:', userId);
  } catch (err) {
    console.error('Fejl ved sletning af bruger:', err);
    throw err;
  }
};