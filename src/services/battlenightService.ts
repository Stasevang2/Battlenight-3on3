import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
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
  maxShifts: number;
  createdAt: Timestamp;
};

export type Shift = {
  id?: string;
  battlenightId: string;
  shiftNumber: number;
  takenBy: string | null;
  takenByName: string | null;
  taken: boolean;
};

export type TeamPlayer = {
  userId: string;
  firstName: string;
  playerNumber: number;
  club: string;
  birthYear: number;
  status: 'accepted' | 'pending' | 'rejected' | 'placeholder';
  placeholderName?: string;
};

export type Team = {
  id?: string;
  battlenightId: string;
  teamName: string;
  leaderId: string;
  leaderName: string;
  players: TeamPlayer[];
  equipment: 'full' | 'basic';
  paid: boolean;
  present: boolean | null;
  isIndividual: boolean;
  createdAt: Timestamp;
};

export type TeamInvite = {
  id?: string;
  teamId: string;
  teamName: string;
  battlenightId: string;
  battlenightDate: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
};

export const getBattlenights = async (): Promise<Battlenight[]> => {
  const q = query(collection(db, 'battlenights'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Battlenight));
};

export const createBattlenight = async (data: Omit<Battlenight, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'battlenights'), {
    ...data,
    createdAt: Timestamp.now(),
  });

  for (let i = 1; i <= data.maxShifts; i++) {
    await addDoc(collection(db, 'shifts'), {
      battlenightId: docRef.id,
      shiftNumber: i,
      takenBy: null,
      takenByName: null,
      taken: false,
    });
  }

  return docRef.id;
};

export const updateBattlenight = async (id: string, data: Partial<Battlenight>) => {
  const docRef = doc(db, 'battlenights', id);
  await updateDoc(docRef, { ...data });
};

export const deleteBattlenight = async (id: string) => {
  await deleteDoc(doc(db, 'battlenights', id));
};

export const getTeamsForBattlenight = async (battlenightId: string): Promise<Team[]> => {
  const q = query(
    collection(db, 'teams'),
    where('battlenightId', '==', battlenightId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
};

export const getTeamsByLeader = async (leaderId: string): Promise<Team[]> => {
  const q = query(
    collection(db, 'teams'),
    where('leaderId', '==', leaderId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
};

export const getTeamsByPlayer = async (userId: string): Promise<Team[]> => {
  const snapshot = await getDocs(collection(db, 'teams'));
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as Team))
    .filter((team: Team) => team.players.some((p: TeamPlayer) => p.userId === userId));
};

export const createTeam = async (data: Omit<Team, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'teams'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateTeam = async (id: string, data: Partial<Team>) => {
  const docRef = doc(db, 'teams', id);
  await updateDoc(docRef, { ...data });
};

export const getShiftsForBattlenight = async (battlenightId: string): Promise<Shift[]> => {
  const q = query(
    collection(db, 'shifts'),
    where('battlenightId', '==', battlenightId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
};

export const takeShift = async (shiftId: string, userId: string, userName: string) => {
  const docRef = doc(db, 'shifts', shiftId);
  await updateDoc(docRef, {
    taken: true,
    takenBy: userId,
    takenByName: userName,
  });
};

export const createTeamInvite = async (data: Omit<TeamInvite, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'teamInvites'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getInvitesForUser = async (userId: string): Promise<TeamInvite[]> => {
  const q = query(
    collection(db, 'teamInvites'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TeamInvite));
};

export const respondToInvite = async (
  inviteId: string,
  teamId: string,
  userId: string,
  accept: boolean
) => {
  const inviteRef = doc(db, 'teamInvites', inviteId);
  await updateDoc(inviteRef, {
    status: accept ? 'accepted' : 'rejected',
  });

  const teamsSnapshot = await getDocs(
    query(collection(db, 'teams'), where('__name__', '==', teamId))
  );

  if (!teamsSnapshot.empty) {
    const team = teamsSnapshot.docs[0].data() as Team;
    const updatedPlayers = team.players.map((p: TeamPlayer) =>
      p.userId === userId
        ? { ...p, status: accept ? 'accepted' as const : 'rejected' as const }
        : p
    );
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, { players: updatedPlayers });
  }
};

export const signupIndividual = async (battlenightId: string, userId: string, userName: string) => {
  await addDoc(collection(db, 'individualSignups'), {
    battlenightId,
    userId,
    userName,
    createdAt: Timestamp.now(),
  });
};

export const getIndividualSignups = async (battlenightId: string) => {
  const q = query(
    collection(db, 'individualSignups'),
    where('battlenightId', '==', battlenightId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};