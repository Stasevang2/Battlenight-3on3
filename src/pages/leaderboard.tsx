import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  buildLeaderboard,
  createChallenge,
  getPendingChallengesForLeader,
  respondToChallenge,
  expireOldChallenges,
} from '../services/resultService';
import type { LeaderboardEntry, Challenge } from '../services/resultService';
import { getBattlenights, createTeam, getTeamsByLeader } from '../services/battlenightService';
import type { Battlenight, Team } from '../services/battlenightService';
import { createNotification } from '../services/notificationService';
import '../styles/leaderboard.css';

function Leaderboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showAllYears, setShowAllYears] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myRank, setMyRank] = useState(0);
  const [myTeamEntry, setMyTeamEntry] = useState<LeaderboardEntry | null>(null);

  // Challenge modal
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<LeaderboardEntry | null>(null);
  const [battlenights, setBattlenights] = useState<Battlenight[]>([]);
  const [selectedBattlenight, setSelectedBattlenight] = useState<string>('');
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [useNewTeam, setUseNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [challengeSending, setChallengeSending] = useState(false);

  // Indgående udfordringer
  const [incomingChallenges, setIncomingChallenges] = useState<Challenge[]>([]);

  const currentUserBirthYear = currentUser?.birthYear || 2012;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Udløb gamle udfordringer
      await expireOldChallenges();

      const [board, events, challenges] = await Promise.all([
        buildLeaderboard(),
        getBattlenights(),
        currentUser ? getPendingChallengesForLeader(currentUser.userId) : Promise.resolve([]),
      ]);

      setLeaderboard(board);
      setBattlenights(events.filter(e => e.status === 'open'));
      setIncomingChallenges(challenges);

      if (currentUser) {
        const myEntry = board.find(e => e.leaderId === currentUser.userId);
        if (myEntry) {
          setMyTeamEntry(myEntry);
          const rank = board.indexOf(myEntry) + 1;
          setMyRank(rank);
        }

        const teams = await getTeamsByLeader(currentUser.userId);
        setMyTeams(teams);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const filteredLeaderboard = showAllYears
    ? leaderboard
    : leaderboard.filter(team =>
        Math.abs(team.birthYear - currentUserBirthYear) <= 1
      );

  const canChallenge = (targetRank: number) => {
    if (!myRank) return false;
    return Math.abs(targetRank - myRank) <= 3;
  };

  const handleOpenChallenge = async (target: LeaderboardEntry) => {
    setChallengeTarget(target);
    setShowChallengeModal(true);
    setSelectedBattlenight('');
    setSelectedTeamId('');
    setUseNewTeam(false);
    setNewTeamName('');
  };

  const handleSendChallenge = async () => {
    if (!currentUser || !challengeTarget || !selectedBattlenight) return;
    setChallengeSending(true);

    try {
      const battlenight = battlenights.find(b => b.id === selectedBattlenight);
      if (!battlenight) return;

      let challengerTeamId = selectedTeamId;
      let challengerTeamName = myTeams.find(t => t.id === selectedTeamId)?.teamName || '';

      // Opret nyt hold hvis valgt
      if (useNewTeam || !selectedTeamId) {
        const finalTeamName = newTeamName.trim() || `Team ${currentUser.firstName}`;
        const newTeam = await createTeam({
          battlenightId: selectedBattlenight,
          teamName: finalTeamName,
          leaderId: currentUser.userId,
          leaderName: currentUser.firstName,
          players: [{
            userId: currentUser.userId,
            firstName: currentUser.firstName,
            playerNumber: currentUser.playerNumber,
            club: currentUser.club,
            birthYear: currentUser.birthYear,
            status: 'accepted',
          }],
          equipment: 'full',
          paid: false,
          present: null,
          isIndividual: false,
        });
        challengerTeamId = newTeam;
        challengerTeamName = finalTeamName;
      } else {
        // Tilmeld eksisterende hold til dette event
        const existingTeam = myTeams.find(t => t.id === selectedTeamId);
        if (existingTeam && existingTeam.battlenightId !== selectedBattlenight) {
          const newTeamId = await createTeam({
            battlenightId: selectedBattlenight,
            teamName: existingTeam.teamName,
            leaderId: currentUser.userId,
            leaderName: currentUser.firstName,
            players: [{
              userId: currentUser.userId,
              firstName: currentUser.firstName,
              playerNumber: currentUser.playerNumber,
              club: currentUser.club,
              birthYear: currentUser.birthYear,
              status: 'accepted',
            }],
            equipment: existingTeam.equipment,
            paid: false,
            present: null,
            isIndividual: false,
          });
          challengerTeamId = newTeamId;
          challengerTeamName = existingTeam.teamName;
        }
      }

      const formattedDate = new Date(battlenight.date).toLocaleDateString('da-DK', {
        weekday: 'long', day: 'numeric', month: 'long'
      });

      // Opret udfordring
      const challengeId = await createChallenge({
        challengerTeamId,
        challengerTeamName,
        challengerLeaderId: currentUser.userId,
        challengerLeaderName: currentUser.firstName,
        challengedTeamId: challengeTarget.teamId,
        challengedTeamName: challengeTarget.teamName,
        challengedLeaderId: challengeTarget.leaderId,
        battlenightId: selectedBattlenight,
        battlenightDate: battlenight.date,
        status: 'pending',
      });

      // Send notifikation til udfordret hold
      await createNotification({
        toUserId: challengeTarget.leaderId,
        type: 'general',
        title: '⚔️ Du er udfordret!',
        message: `${currentUser.firstName} udfordrer dit hold "${challengeTarget.teamName}" til en officiel kamp til Battlenight ${formattedDate}! Du har 14 dage til at acceptere.`,
        data: { challengeId },
      });

      // Opret beskedtråd til udfordringen
      const { createConversation } = await import('../services/messageService');
      await createConversation({
        type: 'challenge',
        participants: [currentUser.userId, challengeTarget.leaderId],
        participantNames: [currentUser.firstName, challengeTarget.teamName],
        teamId: challengerTeamId,
        teamName: `⚔️ ${challengerTeamName} vs ${challengeTarget.teamName}`,
        battlenightId: selectedBattlenight,
        battlenightDate: battlenight.date,
        lastMessage: `${currentUser.firstName} har udfordret ${challengeTarget.teamName}!`,
        lastMessageTime: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        unreadCount: { [challengeTarget.leaderId]: 1 },
      });

      setShowChallengeModal(false);
      navigate('/messages');
    } catch (err) {
      console.error(err);
    }
    setChallengeSending(false);
  };

  const handleRespondToChallenge = async (challenge: Challenge, accept: boolean) => {
    if (!currentUser) return;
    try {
      await respondToChallenge(challenge.id!, accept);

      if (accept) {
        // Tilmeld udfordret hold til eventet
        await createTeam({
          battlenightId: challenge.battlenightId,
          teamName: challenge.challengedTeamName,
          leaderId: currentUser.userId,
          leaderName: currentUser.firstName,
          players: [{
            userId: currentUser.userId,
            firstName: currentUser.firstName,
            playerNumber: currentUser.playerNumber,
            club: currentUser.club,
            birthYear: currentUser.birthYear,
            status: 'accepted',
          }],
          equipment: 'full',
          paid: false,
          present: null,
          isIndividual: false,
        });

        await createNotification({
          toUserId: challenge.challengerLeaderId,
          type: 'general',
          title: '✅ Udfordring accepteret!',
          message: `${currentUser.firstName} har accepteret din udfordring! Begge hold er nu tilmeldt ${new Date(challenge.battlenightDate).toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}.`,
        });
      } else {
        await createNotification({
          toUserId: challenge.challengerLeaderId,
          type: 'general',
          title: '❌ Udfordring afvist',
          message: `${currentUser.firstName} har afvist din udfordring til ${challenge.challengedTeamName}.`,
        });
      }

      setIncomingChallenges(prev => prev.filter(c => c.id !== challenge.id));
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getDaysLeft = (expiresAt: any) => {
    if (!expiresAt) return 0;
    const expiry = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt.seconds * 1000);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">RANGLISTE</h1>
        <div />
      </div>

      <div className="content">

        {/* Indgående udfordringer */}
        {incomingChallenges.length > 0 && (
          <div className="challenges-section">
            <h2 className="section-title">
              ⚔️ Indgående Udfordringer
              <span className="challenge-count">{incomingChallenges.length}</span>
            </h2>
            {incomingChallenges.map(challenge => (
              <div key={challenge.id} className="challenge-card incoming">
                <div className="challenge-info">
                  <p className="challenge-from">⚔️ <strong>{challenge.challengerTeamName}</strong> udfordrer dit hold!</p>
                  <p className="challenge-event">
                    📅 {new Date(challenge.battlenightDate).toLocaleDateString('da-DK', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })}
                  </p>
                  <p className="challenge-days">⏰ {getDaysLeft(challenge.expiresAt)} dage tilbage</p>
                  <p className="challenge-note">⚠️ Accepterer du ikke inden 14 dage taber du din placering</p>
                </div>
                <div className="challenge-actions">
                  <button className="accept-btn" onClick={() => handleRespondToChallenge(challenge, true)}>
                    ✅ Acceptér
                  </button>
                  <button className="decline-btn" onClick={() => handleRespondToChallenge(challenge, false)}>
                    ❌ Afvis
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Årgangs toggle */}
        <div className="year-toggle-row">
          <div className="year-info">
            <p className="year-label">
              {showAllYears ? '🌍 Alle årgange' : `📅 Årgange ${currentUserBirthYear - 1}-${currentUserBirthYear + 1}`}
            </p>
            <p className="year-sublabel">
              {showAllYears ? 'Viser hele ranglisten' : 'Viser din årgang ± 1 år'}
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showAllYears}
              onChange={(e) => setShowAllYears(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {isLoading ? (
          <p className="loading-text">⏳ Henter rangliste...</p>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="no-results">
            <p>🏆 Ingen hold på ranglisten endnu</p>
            <p>Tilmeld et hold til næste Battlenight for at komme på listen!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {filteredLeaderboard.length >= 3 && (
              <div className="podium">
                <div className="podium-item second">
                  <span className="podium-crown">🥈</span>
                  <div className="podium-block second-block">
                    <span className="podium-rank">2</span>
                  </div>
                  <span className="podium-name">{filteredLeaderboard[1]?.teamName}</span>
                  <span className="podium-points">{filteredLeaderboard[1]?.points} pt</span>
                </div>
                <div className="podium-item first">
                  <span className="podium-crown">🏆</span>
                  <div className="podium-block first-block">
                    <span className="podium-rank">1</span>
                  </div>
                  <span className="podium-name">{filteredLeaderboard[0]?.teamName}</span>
                  <span className="podium-points">{filteredLeaderboard[0]?.points} pt</span>
                </div>
                <div className="podium-item third">
                  <span className="podium-crown">🥉</span>
                  <div className="podium-block third-block">
                    <span className="podium-rank">3</span>
                  </div>
                  <span className="podium-name">{filteredLeaderboard[2]?.teamName}</span>
                  <span className="podium-points">{filteredLeaderboard[2]?.points} pt</span>
                </div>
              </div>
            )}

            {/* Rangliste */}
            <h2 className="section-title">📊 Rangliste</h2>
            <div className="leaderboard-list">
              {filteredLeaderboard.map((team, index) => {
                const rank = index + 1;
                const isMyTeam = team.leaderId === currentUser?.userId;
                const canChallengeTeam = canChallenge(rank) && !isMyTeam && !!currentUser && !!myTeamEntry;
                const totalGames = team.wins + team.losses + team.draws + team.undecided;

                return (
                  <div key={`${team.teamName}-${team.leaderId}`} className={`leaderboard-row ${isMyTeam ? 'my-team' : ''}`}>
                    <span className="rank-number">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </span>
                    <div className="team-info">
                      <div className="team-name-row">
                        <span className="team-name-text">{team.teamName}</span>
                        {isMyTeam && <span className="my-team-tag">Dit hold</span>}
                        <span className="birth-year-tag">{team.birthYear}</span>
                      </div>
                      <span className="team-record">
                        {totalGames > 0
                          ? `${team.wins}V · ${team.losses}T · ${team.draws}U · ${team.attended} ∑`
                          : `${team.attended} kamp${team.attended !== 1 ? 'e' : ''} · Ingen officielle resultater`}
                      </span>
                    </div>
                    <div className="team-right">
                      <span className="team-points">{team.points} pt</span>
                      {canChallengeTeam && (
                        <button
                          className="mini-challenge-btn"
                          onClick={() => handleOpenChallenge(team)}
                        >
                          ⚔️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Point forklaring */}
            <div className="points-explanation">
              <p>🏆 Sejr = 3 pt &nbsp; 🤝 Uafgjort = 2 pt &nbsp; 💔 Tab = 1 pt &nbsp; ❓ Ubestemt = 1 pt</p>
              <p>⚔️ Du kan udfordre hold 3 placeringer over/under dig</p>
              <p>⏰ Udfordringer udløber efter 14 dage - manglende svar = tabt placering</p>
            </div>
          </>
        )}
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && challengeTarget && (
        <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">⚔️ Udfordr {challengeTarget.teamName}</h3>
            <p className="modal-text">
              Send en officiel udfordring. Dit hold tilmeldes eventet med det samme!
            </p>

            {/* Vælg event */}
            <div className="modal-field">
              <label>📅 Vælg Battlenight:</label>
              {battlenights.length === 0 ? (
                <p className="modal-note">Ingen åbne events - opret et event først</p>
              ) : (
                <select
                  className="modal-select"
                  value={selectedBattlenight}
                  onChange={(e) => setSelectedBattlenight(e.target.value)}
                >
                  <option value="">Vælg event...</option>
                  {battlenights.map(bn => (
                    <option key={bn.id} value={bn.id}>
                      {new Date(bn.date).toLocaleDateString('da-DK', {
                        weekday: 'long', day: 'numeric', month: 'long'
                      })}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Vælg hold */}
            <div className="modal-field">
              <label>👥 Dit hold:</label>
              {myTeams.length > 0 && !useNewTeam ? (
                <div>
                  <select
                    className="modal-select"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="">Vælg eksisterende hold...</option>
                    {myTeams.reduce((acc: Team[], team) => {
                      if (!acc.find(t => t.teamName === team.teamName)) acc.push(team);
                      return acc;
                    }, []).map(team => (
                      <option key={team.id} value={team.id}>{team.teamName}</option>
                    ))}
                  </select>
                  <button
                    className="modal-new-team-btn"
                    onClick={() => setUseNewTeam(true)}
                  >
                    + Opret nyt hold i stedet
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder={`Team ${currentUser?.firstName}`}
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                  {myTeams.length > 0 && (
                    <button
                      className="modal-new-team-btn"
                      onClick={() => setUseNewTeam(false)}
                    >
                      ← Brug eksisterende hold
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="modal-info">
              <p>ℹ️ Dit hold tilmeldes eventet med det samme</p>
              <p>Det udfordrede hold har 14 dage til at acceptere</p>
              <p>En beskedtråd oprettes så I kan kommunikere</p>
            </div>

            <div className="modal-actions">
              <button
                className="modal-confirm-btn"
                onClick={handleSendChallenge}
                disabled={!selectedBattlenight || challengeSending}
              >
                {challengeSending ? '⏳ Sender...' : '⚔️ Send udfordring'}
              </button>
              <button
                className="modal-cancel-btn"
                onClick={() => setShowChallengeModal(false)}
              >
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Leaderboard;