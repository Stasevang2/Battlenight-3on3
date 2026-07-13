import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export type Battlenight = {
  id?: string;
  date: string;
  time: string;
  maxTeams: number;
  maxPlayers: number;
  price: number;
  status: 'open' | 'closed' | 'completed';
  zones: number;
  createdAt: Date;
};

export type Shift = {
  id?: string;
  battlenightId: string;
  takenBy: string | null;
  takenByName: string | null;
  taken: boolean;
};

export type Team = {
  id?: string;
  battlenightId: string;
  teamName: string;
  leaderId: string;
  leaderName: string;
  players: {
    id: string;
    firstName: string;
    playerNumber: number;
    club: string;
    birthYear: number;
    userId: string;
  }[];
  equipment: 'full' | 'basic';
  paid: boolean;
  present: boolean | null;
  isIndividual: boolean;
  createdAt: Date;
};

// Hent alle battlenights
export const getBattlenights = async (): Promise<Battlenight[]> => {
  const q = query(collection(db, 'battlenights'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Battlenight));
};

// Opret battlenight
export const createBattlenight = async (data: Omit<Battlenight, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'battlenights'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

// Slet battlenight
export const deleteBattlenight = async (id: string) => {
  await deleteDoc(doc(db, 'battlenights', id));
};

// Hent hold til et battlenight
export const getTeamsForBattlenight = async (battlenightId: string): Promise<Team[]> => {
  const q = query(
    collection(db, 'teams'),
    where('battlenightId', '==', battlenightId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
};

// Opret hold
export const createTeam = async (data: Omit<Team, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'teams'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

// Opdater hold
export const updateTeam = async (id: string, data: Partial<Team>) => {
  const docRef = doc(db, 'teams', id);
  await updateDoc(docRef, data);
};

// Hent vagter til et battlenight
export const getShiftsForBattlenight = async (battlenightId: string): Promise<Shift[]> => {
  const q = query(
    collection(db, 'shifts'),
    where('battlenightId', '==', battlenightId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
};

// Tag en vagt
export const takeShift = async (shiftId: string, userId: string, userName: string) => {
  const docRef = doc(db, 'shifts', shiftId);
  await updateDoc(docRef, {
    taken: true,
    takenBy: userId,
    takenByName: userName,
  });
};
