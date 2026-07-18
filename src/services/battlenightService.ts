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
  status: 'accepted' | 'pending' | 'rejected' | 'placeholder' | 'waitlist';
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
  const snapshot = await getDocs(collection(db, 'battlenights'));
  const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Battlenight));
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
  await updateDoc(doc(db, 'battlenights', id), { ...data });
};

export const deleteBattlenight = async (id: string) => {
  await deleteDoc(doc(db, 'battlenights', id));
};

export const getTeamsForBattlenight = async (battlenightId: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('battlenightId', '==', battlenightId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
};

export const getTeamsByLeader = async (leaderId: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('leaderId', '==', leaderId));
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
  await updateDoc(doc(db, 'teams', id), { ...data });
};

export const getShiftsForBattlenight = async (battlenightId: string): Promise<Shift[]> => {
  const q = query(collection(db, 'shifts'), where('battlenightId', '==', battlenightId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
};

export const takeShift = async (shiftId: string, userId: string, userName: string) => {
  await updateDoc(doc(db, 'shifts', shiftId), {
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
  // Opdater invite status
  await updateDoc(doc(db, 'teamInvites', inviteId), {
    status: accept ? 'accepted' : 'rejected',
  });

  if (!accept) return;

  // Hent holdet
  const teamsSnapshot = await getDocs(
    query(collection(db, 'teams'), where('__name__', '==', teamId))
  );
  if (teamsSnapshot.empty) return;

  const teamDoc = teamsSnapshot.docs[0];
  const team = teamDoc.data() as Team;

  // Tæl accepterede spillere (ikke venteliste, ikke holdleder)
  const acceptedCount = team.players.filter(
    (p: TeamPlayer) => p.status === 'accepted'
  ).length;

  // Max 3 spillere - resten på venteliste
  const newStatus: TeamPlayer['status'] = acceptedCount < 3 ? 'accepted' : 'waitlist';

  const updatedPlayers = team.players.map((p: TeamPlayer) =>
    p.userId === userId ? { ...p, status: newStatus } : p
  );

  await updateDoc(doc(db, 'teams', teamId), { players: updatedPlayers });

  if (newStatus === 'accepted') {
    // Tilføj til hold chat
    const player = team.players.find((p: TeamPlayer) => p.userId === userId);
    if (player) {
      const { addPlayerToTeamConversation } = await import('./messageService');
      await addPlayerToTeamConversation(teamId, userId, player.firstName);
    }

    // Fjern fra alle andre ventelister på samme event
    await removeFromOtherWaitlists(team.battlenightId, userId, teamId);

    // Fjern fra individuel liste
    await removeIndividualSignup(team.battlenightId, userId);

    // Send notifikation om at man er accepteret
    const { createNotification } = await import('./notificationService');
    await createNotification({
      toUserId: userId,
      type: 'invite_accepted',
      title: '✅ Du er på holdet!',
      message: `Du er nu accepteret på holdet "${team.teamName}"! Tjek hold chatten.`,
    });
  } else {
    // På venteliste - send notifikation
    const { createNotification } = await import('./notificationService');
    await createNotification({
      toUserId: userId,
      type: 'general',
      title: '⏳ Du er på venteliste!',
      message: `Holdet "${team.teamName}" er fuldt - du er på venteliste. Holdlederen kontakter dig hvis der bliver plads!`,
    });
  }
};

// Fjern fra ventelister på andre hold til samme event
export const removeFromOtherWaitlists = async (
  battlenightId: string,
  userId: string,
  acceptedTeamId: string
) => {
  const q = query(collection(db, 'teams'), where('battlenightId', '==', battlenightId));
  const snapshot = await getDocs(q);

  for (const teamDoc of snapshot.docs) {
    if (teamDoc.id === acceptedTeamId) continue;
    const team = teamDoc.data() as Team;
    const isOnWaitlist = team.players.some(
      (p: TeamPlayer) => p.userId === userId && p.status === 'waitlist'
    );
    if (isOnWaitlist) {
      const updatedPlayers = team.players.filter((p: TeamPlayer) => p.userId !== userId);
      await updateDoc(teamDoc.ref, { players: updatedPlayers });
    }
  }
};

// Fjern spiller fra hold (holdleder smider ud)
export const removePlayerFromTeam = async (teamId: string, userId: string) => {
  const teamsSnapshot = await getDocs(
    query(collection(db, 'teams'), where('__name__', '==', teamId))
  );
  if (teamsSnapshot.empty) return;

  const team = teamsSnapshot.docs[0].data() as Team;
  const updatedPlayers = team.players.filter((p: TeamPlayer) => p.userId !== userId);
  await updateDoc(doc(db, 'teams', teamId), { players: updatedPlayers });
};

// Promovér spiller fra venteliste til holdet
export const promoteFromWaitlist = async (
  teamId: string,
  userId: string
) => {
  const teamsSnapshot = await getDocs(
    query(collection(db, 'teams'), where('__name__', '==', teamId))
  );
  if (teamsSnapshot.empty) return;

  const team = teamsSnapshot.docs[0].data() as Team;

  const updatedPlayers = team.players.map((p: TeamPlayer) =>
    p.userId === userId ? { ...p, status: 'accepted' as const } : p
  );

  await updateDoc(doc(db, 'teams', teamId), { players: updatedPlayers });

  // Tilføj til hold chat
  const player = team.players.find((p: TeamPlayer) => p.userId === userId);
  if (player) {
    const { addPlayerToTeamConversation } = await import('./messageService');
    await addPlayerToTeamConversation(teamId, userId, player.firstName);

    // Fjern fra andre ventelister
    await removeFromOtherWaitlists(team.battlenightId, userId, teamId);

    // Fjern fra individuel liste
    await removeIndividualSignup(team.battlenightId, userId);

    // Send notifikation
    const { createNotification } = await import('./notificationService');
    await createNotification({
      toUserId: userId,
      type: 'invite_accepted',
      title: '🎉 Du er nu på holdet!',
      message: `Tillykke! Du er rykket op fra ventelisten og er nu på holdet "${team.teamName}"!`,
    });
  }
};

export const signupIndividual = async (
  battlenightId: string,
  userId: string,
  userName: string
) => {
  const existingIndividual = await getDocs(query(
    collection(db, 'individualSignups'),
    where('battlenightId', '==', battlenightId),
    where('userId', '==', userId)
  ));
  if (!existingIndividual.empty) {
    throw new Error('Du er allerede tilmeldt dette event som individuel spiller');
  }

  const allTeams = await getDocs(query(
    collection(db, 'teams'),
    where('battlenightId', '==', battlenightId)
  ));
  const onTeam = allTeams.docs.some(d => {
    const team = d.data() as Team;
    return team.players.some((p: TeamPlayer) =>
      p.userId === userId && p.status === 'accepted'
    );
  });
  if (onTeam) {
    throw new Error('Du er allerede tilmeldt dette event på et hold');
  }

  await addDoc(collection(db, 'individualSignups'), {
    battlenightId,
    userId,
    userName,
    createdAt: Timestamp.now(),
  });
};

export const getIndividualSignups = async (battlenightId: string) => {
  const q = query(collection(db, 'individualSignups'), where('battlenightId', '==', battlenightId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const removeIndividualSignup = async (battlenightId: string, userId: string) => {
  const q = query(
    collection(db, 'individualSignups'),
    where('battlenightId', '==', battlenightId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(d.ref);
  }
};

// Hent brugers status for et event
export const getUserEventStatus = async (
  battlenightId: string,
  userId: string
): Promise<{
  status: 'team' | 'individual' | 'waitlist' | 'none';
  teamName?: string;
  teamId?: string;
}> => {
  // Tjek hold
  const allTeams = await getDocs(query(
    collection(db, 'teams'),
    where('battlenightId', '==', battlenightId)
  ));

  for (const teamDoc of allTeams.docs) {
    const team = teamDoc.data() as Team;
    const player = team.players.find((p: TeamPlayer) => p.userId === userId);
    if (player) {
      if (player.status === 'accepted') {
        return { status: 'team', teamName: team.teamName, teamId: teamDoc.id };
      }
      if (player.status === 'waitlist') {
        return { status: 'waitlist', teamName: team.teamName, teamId: teamDoc.id };
      }
    }
  }

  // Tjek individuel
  const individual = await getDocs(query(
    collection(db, 'individualSignups'),
    where('battlenightId', '==', battlenightId),
    where('userId', '==', userId)
  ));
  if (!individual.empty) {
    return { status: 'individual' };
  }

  return { status: 'none' };
};