import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
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
  winner: 'teamA' | 'teamB' | 'draw' | null;
  isOfficial: boolean;
  registeredBy: string;
  createdAt: Timestamp;
};

export type LeaderboardEntry = {
  teamName: string;
  leaderId: string;
  wins: number;
  losses: number;
  draws: number;
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
  const q = query(collection(db, 'results'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Result));
};

export const buildLeaderboard = (results: Result[], teams: any[]): LeaderboardEntry[] => {
  const entries: { [teamName: string]: LeaderboardEntry } = {};

  teams.forEach(team => {
    if (!entries[team.teamName]) {
      entries[team.teamName] = {
        teamName: team.teamName,
        leaderId: team.leaderId,
        wins: 0,
        losses: 0,
        draws: 0,
        attended: 0,
        points: 0,
        birthYear: team.players[0]?.birthYear || 2012,
      };
    }
    entries[team.teamName].attended += 1;
  });

  results.filter(r => r.isOfficial && r.winner).forEach(result => {
    if (!entries[result.teamAName]) {
      entries[result.teamAName] = {
        teamName: result.teamAName,
        leaderId: result.teamAId,
        wins: 0, losses: 0, draws: 0, attended: 0, points: 0, birthYear: 2012,
      };
    }
    if (!entries[result.teamBName]) {
      entries[result.teamBName] = {
        teamName: result.teamBName,
        leaderId: result.teamBId,
        wins: 0, losses: 0, draws: 0, attended: 0, points: 0, birthYear: 2012,
      };
    }

    if (result.winner === 'teamA') {
      entries[result.teamAName].wins += 1;
      entries[result.teamAName].points += 3;
      entries[result.teamBName].losses += 1;
    } else if (result.winner === 'teamB') {
      entries[result.teamBName].wins += 1;
      entries[result.teamBName].points += 3;
      entries[result.teamAName].losses += 1;
    } else if (result.winner === 'draw') {
      entries[result.teamAName].draws += 1;
      entries[result.teamAName].points += 1;
      entries[result.teamBName].draws += 1;
      entries[result.teamBName].points += 1;
    }
  });

  return Object.values(entries).sort((a, b) => b.points - a.points);
};