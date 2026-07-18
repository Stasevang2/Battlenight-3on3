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

// Results
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

// Challenges
export const createChallenge = async (data: Omit<Challenge, 'id' | 'createdAt' | 'expiresAt'>) => {
  // Udløber om 14 dage
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

export const getChallengesForTeam = async (teamId: string): Promise<Challenge[]> => {
  const q = query(
    collection(db, 'challenges'),
    where('challengedTeamId', '==', teamId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
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

export const respondToChallenge = async (
  challengeId: string,
  accept: boolean
) => {
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

// Bygger rangliste fra alle hold og resultater
export const buildLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const [allTeams, allResults] = await Promise.all([
    getDocs(collection(db, 'teams')),
    getAllResults(),
  ]);

  const entries: { [teamId: string]: LeaderboardEntry } = {};

  // Tilføj alle hold til ranglisten
  allTeams.docs.forEach(teamDoc => {
    const team = teamDoc.data();
    if (!entries[teamDoc.id] && team.teamName && team.leaderId) {
      entries[teamDoc.id] = {
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
    } else if (entries[teamDoc.id]) {
      entries[teamDoc.id].attended += 1;
    }
  });

  // Beregn point fra resultater
  allResults
    .filter(r => r.isOfficial && r.winner && r.winner !== null)
    .forEach(result => {
      if (!entries[result.teamAId]) {
        entries[result.teamAId] = {
          teamId: result.teamAId,
          teamName: result.teamAName,
          leaderId: '',
          wins: 0, losses: 0, draws: 0, undecided: 0,
          attended: 0, points: 0, birthYear: 2012,
        };
      }
      if (!entries[result.teamBId]) {
        entries[result.teamBId] = {
          teamId: result.teamBId,
          teamName: result.teamBName,
          leaderId: '',
          wins: 0, losses: 0, draws: 0, undecided: 0,
          attended: 0, points: 0, birthYear: 2012,
        };
      }

      if (result.winner === 'teamA') {
        entries[result.teamAId].wins += 1;
        entries[result.teamAId].points += 3;
        entries[result.teamBId].losses += 1;
        entries[result.teamBId].points += 1;
      } else if (result.winner === 'teamB') {
        entries[result.teamBId].wins += 1;
        entries[result.teamBId].points += 3;
        entries[result.teamAId].losses += 1;
        entries[result.teamAId].points += 1;
      } else if (result.winner === 'draw') {
        entries[result.teamAId].draws += 1;
        entries[result.teamAId].points += 2;
        entries[result.teamBId].draws += 1;
        entries[result.teamBId].points += 2;
      } else if (result.winner === 'undecided') {
        entries[result.teamAId].undecided += 1;
        entries[result.teamAId].points += 1;
        entries[result.teamBId].undecided += 1;
        entries[result.teamBId].points += 1;
      }
    });

  // Konsolider hold med samme navn og holdleder
  const consolidated: { [key: string]: LeaderboardEntry } = {};
  Object.values(entries).forEach(entry => {
    const key = `${entry.teamName}-${entry.leaderId}`;
    if (!consolidated[key]) {
      consolidated[key] = { ...entry };
    } else {
      consolidated[key].attended += entry.attended;
      consolidated[key].wins += entry.wins;
      consolidated[key].losses += entry.losses;
      consolidated[key].draws += entry.draws;
      consolidated[key].undecided += entry.undecided;
      consolidated[key].points += entry.points;
    }
  });

  // Sorter: 1) point, 2) kampe, 3) alfabetisk
  return Object.values(consolidated).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aGames = a.wins + a.losses + a.draws + a.undecided;
    const bGames = b.wins + b.losses + b.draws + b.undecided;
    if (bGames !== aGames) return bGames - aGames;
    return a.teamName.localeCompare(b.teamName);
  });
};