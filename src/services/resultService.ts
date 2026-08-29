import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export type Result = {
  id?: string;
  battlenightId: string;
  battlenightDate: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  winner: 'teamA' | 'teamB' | 'draw' | 'undecided' | null;
  isOfficial: boolean;
  isChallenge: boolean;
  registeredBy: string;
  createdAt: Timestamp;
};

export type Challenge = {
  id?: string;
  challengerTeamId: string;
  challengerTeamName: string;
  challengerLeaderId: string;
  challengerLeaderName: string;
  challengedTeamId: string;
  challengedTeamName: string;
  challengedLeaderId: string;
  battlenightId: string;
  battlenightDate: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: Timestamp;
  createdAt: Timestamp;
};

export type LeaderboardEntry = {
  teamId: string;
  teamName: string;
  leaderId: string;
  wins: number;
  losses: number;
  draws: number;
  undecided: number;
  attended: number;
  points: number;
  birthYear: number;
};

export const createResult = async (data: Omit<Result, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'results'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateResult = async (id: string, winner: Result['winner']) => {
  const docRef = doc(db, 'results', id);
  await updateDoc(docRef, { winner });
};

export const getResultsForBattlenight = async (battlenightId: string): Promise<Result[]> => {
  const q = query(
    collection(db, 'results'),
    where('battlenightId', '==', battlenightId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Result));
};

export const getAllResults = async (): Promise<Result[]> => {
  const snapshot = await getDocs(collection(db, 'results'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Result));
};

export const createChallenge = async (data: Omit<Challenge, 'id' | 'createdAt' | 'expiresAt'>) => {
  const expiresAt = new Timestamp(
    Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    0
  );
  const docRef = await addDoc(collection(db, 'challenges'), {
    ...data,
    status: 'pending',
    expiresAt,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getPendingChallengesForLeader = async (leaderId: string): Promise<Challenge[]> => {
  const q = query(
    collection(db, 'challenges'),
    where('challengedLeaderId', '==', leaderId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
};

export const getAllPendingChallenges = async (): Promise<Challenge[]> => {
  const q = query(
    collection(db, 'challenges'),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
};

export const respondToChallenge = async (challengeId: string, accept: boolean) => {
  const docRef = doc(db, 'challenges', challengeId);
  await updateDoc(docRef, {
    status: accept ? 'accepted' : 'rejected',
  });
};

export const expireOldChallenges = async () => {
  const now = Timestamp.now();
  const q = query(
    collection(db, 'challenges'),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  for (const challengeDoc of snapshot.docs) {
    const challenge = challengeDoc.data() as Challenge;
    if (challenge.expiresAt.seconds < now.seconds) {
      await updateDoc(challengeDoc.ref, { status: 'expired' });
    }
  }
};

export const buildLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const [allTeams, allResults] = await Promise.all([
    getDocs(collection(db, 'teams')),
    getAllResults(),
  ]);

  const entries: { [key: string]: LeaderboardEntry } = {};

  allTeams.docs.forEach(teamDoc => {
    const team = teamDoc.data();
    if (!team.teamName || !team.leaderId) return;

    const key = `${team.teamName}-${team.leaderId}`;
    if (!entries[key]) {
      entries[key] = {
        teamId: teamDoc.id,
        teamName: team.teamName,
        leaderId: team.leaderId,
        wins: 0,
        losses: 0,
        draws: 0,
        undecided: 0,
        attended: 1,
        points: 0,
        birthYear: team.players?.[0]?.birthYear || 2012,
      };
    } else {
      entries[key].attended += 1;
    }
  });

  allResults
    .filter(r => r.isOfficial && r.winner && r.winner !== null)
    .forEach(result => {
      const findKey = (teamId: string, teamName: string) => {
        return Object.keys(entries).find(k =>
          entries[k].teamId === teamId || entries[k].teamName === teamName
        );
      };

      const keyA = findKey(result.teamAId, result.teamAName);
      const keyB = findKey(result.teamBId, result.teamBName);

      if (!keyA) {
        const k = `${result.teamAName}-unknown`;
        entries[k] = { teamId: result.teamAId, teamName: result.teamAName, leaderId: '', wins: 0, losses: 0, draws: 0, undecided: 0, attended: 0, points: 0, birthYear: 2012 };
      }
      if (!keyB) {
        const k = `${result.teamBName}-unknown`;
        entries[k] = { teamId: result.teamBId, teamName: result.teamBName, leaderId: '', wins: 0, losses: 0, draws: 0, undecided: 0, attended: 0, points: 0, birthYear: 2012 };
      }

      const eA = entries[keyA || `${result.teamAName}-unknown`];
      const eB = entries[keyB || `${result.teamBName}-unknown`];

      if (result.winner === 'teamA') {
        eA.wins += 1; eA.points += 3;
        eB.losses += 1; eB.points += 1;
      } else if (result.winner === 'teamB') {
        eB.wins += 1; eB.points += 3;
        eA.losses += 1; eA.points += 1;
      } else if (result.winner === 'draw') {
        eA.draws += 1; eA.points += 2;
        eB.draws += 1; eB.points += 2;
      } else if (result.winner === 'undecided') {
        eA.undecided += 1; eA.points += 1;
        eB.undecided += 1; eB.points += 1;
      }
    });

  return Object.values(entries).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aGames = a.wins + a.losses + a.draws + a.undecided;
    const bGames = b.wins + b.losses + b.draws + b.undecided;
    if (bGames !== aGames) return bGames - aGames;
    return a.teamName.localeCompare(b.teamName);
  });
};
