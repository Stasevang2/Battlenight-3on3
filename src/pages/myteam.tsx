import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  getBattlenights,
  createTeam,
  getTeamsByLeader,
  getTeamsByPlayer,
  updateTeam,
  createTeamInvite,
  getInvitesForUser,
  respondToInvite,
  removeIndividualSignup,
} from '../services/battlenightService';
import type { Battlenight, Team, TeamInvite, TeamPlayer } from '../services/battlenightService';
import { getAllUsers } from '../services/userService';
import type { User } from '../services/userService';
import { createNotification } from '../services/notificationService';
import { createTeamConversation } from '../services/messageService';
import '../styles/myteam.css';

type FlowStep = 'overview' | 'choose-type' | 'choose-existing' | 'create-team' | 'individual-confirm';

function MyTeam() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [battlenights, setBattlenights] = useState<Battlenight[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [pastTeams, setPastTeams] = useState<Team[]>([]);
  const [myInvites, setMyInvites] = useState<TeamInvite[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flowStep, setFlowStep] = useState<FlowStep>('overview');
  const [selectedBattlenight, setSelectedBattlenight] = useState<Battlenight | null>(null);
  const [teamName, setTeamName] = useState('');
  const [equipment, setEquipment] = useState<'full' | 'basic'>('full');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteText, setShowInviteText] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [events, leaderTeams, playerTeams, invites, users] = await Promise.all([
        getBattlenights(),
        getTeamsByLeader(currentUser.userId),
        getTeamsByPlayer(currentUser.userId),
        getInvitesForUser(currentUser.userId),
        getAllUsers(),
      ]);

      const openBattlenightIds = events
        .filter((e: Battlenight) => e.status === 'open')
        .map(e => e.id);

      const allMyTeams = [...leaderTeams];
      playerTeams.forEach((t: Team) => {
        if (!allMyTeams.find(lt => lt.id === t.id)) {
          allMyTeams.push(t);
        }
      });

      const activeTeams = allMyTeams.filter(t => openBattlenightIds.includes(t.battlenightId));

      const previousTeams = leaderTeams.filter(t => !openBattlenightIds.includes(t.battlenightId));
      const uniquePastTeams = previousTeams.reduce((acc: Team[], team) => {
        if (!acc.find(t => t.teamName === team.teamName)) {
          acc.push(team);
        }
        return acc;
      }, []);

      setBattlenights(events.filter((e: Battlenight) => e.status === 'open'));
      setMyTeams(activeTeams);
      setPastTeams(uniquePastTeams);
      setMyInvites(invites);
      setAllUsers(users.filter((u: User) => u.userId !== currentUser.userId));
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleReuseTeam = async (existingTeam: Team) => {
    if (!currentUser || !selectedBattlenight) return;

    const team: Omit<Team, 'id' | 'createdAt'> = {
      battlenightId: selectedBattlenight.id!,
      teamName: existingTeam.teamName,
      leaderId: currentUser.userId,
      leaderName: currentUser.firstName,
      players: [
        {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          playerNumber: currentUser.playerNumber,
          club: currentUser.club,
          birthYear: currentUser.birthYear,
          status: 'accepted',
        },
      ],
      equipment: existingTeam.equipment,
      paid: false,
      present: null,
      isIndividual: false,
    };

    try {
      const teamId = await createTeam(team);

      // Opret hold chat
      await createTeamConversation(
        teamId,
        existingTeam.teamName,
        [currentUser.userId],
        [currentUser.firstName],
        selectedBattlenight.id!,
        selectedBattlenight.date
      );

      // Fjern fra individuel liste
      await removeIndividualSignup(selectedBattlenight.id!, currentUser.userId);

      setConfirmationText(`✅ Holdet "${existingTeam.teamName}" er tilmeldt ${selectedBattlenight.date}!`);
      setShowConfirmation(true);
      setFlowStep('overview');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTeam = async () => {
    if (!currentUser || !selectedBattlenight) return;

    const finalTeamName = teamName.trim() || `Team ${currentUser.firstName}`;

    const team: Omit<Team, 'id' | 'createdAt'> = {
      battlenightId: selectedBattlenight.id!,
      teamName: finalTeamName,
      leaderId: currentUser.userId,
      leaderName: currentUser.firstName,
      players: [
        {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          playerNumber: currentUser.playerNumber,
          club: currentUser.club,
          birthYear: currentUser.birthYear,
          status: 'accepted',
        },
        ...selectedPlayers.map((userId: string) => {
          const user = allUsers.find(u => u.userId === userId);
          if (user) {
            return {
              userId: user.userId,
              firstName: user.firstName,
              playerNumber: user.playerNumber,
              club: user.club,
              birthYear: user.birthYear,
              status: 'pending' as const,
            };
          }
          return {
            userId,
            firstName: userId,
            playerNumber: 0,
            club: '',
            birthYear: 0,
            status: 'placeholder' as const,
            placeholderName: userId,
          };
        }),
      ],
      equipment,
      paid: false,
      present: null,
      isIndividual: false,
    };

    try {
      const teamId = await createTeam(team);

      // Opret hold chat automatisk
      const acceptedPlayers = team.players.filter(p => p.status === 'accepted');
      await createTeamConversation(
        teamId,
        finalTeamName,
        acceptedPlayers.map(p => p.userId),
        acceptedPlayers.map(p => p.firstName),
        selectedBattlenight.id!,
        selectedBattlenight.date
      );

      // Fjern holdleder fra individuel liste hvis tilmeldt
      await removeIndividualSignup(selectedBattlenight.id!, currentUser.userId);

      // Send invites til valgte spillere
      for (const userId of selectedPlayers) {
        const user = allUsers.find(u => u.userId === userId);
        if (user) {
          await createTeamInvite({
            teamId,
            teamName: finalTeamName,
            battlenightId: selectedBattlenight.id!,
            battlenightDate: selectedBattlenight.date,
            fromUserId: currentUser.userId,
            fromUserName: currentUser.firstName,
            toUserId: userId,
            status: 'pending',
          });

          await createNotification({
            toUserId: userId,
            type: 'team_invite',
            title: '🏒 Du er inviteret til et hold!',
            message: `${currentUser.firstName} inviterer dig til holdet "${finalTeamName}" til Battlenight ${selectedBattlenight.date}`,
            data: { teamId },
          });
        }
      }

      setConfirmationText(`✅ Holdet "${finalTeamName}" er oprettet og tilmeldt ${selectedBattlenight.date}!`);
      setShowConfirmation(true);
      setFlowStep('overview');
      setTeamName('');
      setSelectedPlayers([]);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespondToInvite = async (invite: TeamInvite, accept: boolean) => {
    if (!currentUser) return;
    try {
      await respondToInvite(invite.id!, invite.teamId, currentUser.userId, accept);

      await createNotification({
        toUserId: invite.fromUserId,
        type: accept ? 'invite_accepted' : 'invite_rejected',
        title: accept ? '✅ Invitation accepteret!' : '❌ Invitation afvist',
        message: accept
          ? `${currentUser.firstName} har accepteret din invitation til ${invite.teamName}!`
          : `${currentUser.firstName} har afvist din invitation til ${invite.teamName}`,
        data: { teamId: invite.teamId },
      });

      setMyInvites(prev => prev.filter(i => i.id !== invite.id));
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveTeam = async (team: Team) => {
    if (!currentUser) return;
    const isLeader = team.leaderId === currentUser.userId;

    if (isLeader) {
      const updatedPlayers = team.players.filter((p: TeamPlayer) => p.userId !== currentUser.userId);
      if (updatedPlayers.length === 0) {
        await updateTeam(team.id!, { players: updatedPlayers });
      } else {
        const newLeader = updatedPlayers.find((p: TeamPlayer) => p.status === 'accepted') || updatedPlayers[0];
        await updateTeam(team.id!, {
          players: updatedPlayers,
          leaderId: newLeader.userId,
          leaderName: newLeader.firstName,
        });
        await createNotification({
          toUserId: newLeader.userId,
          type: 'general',
          title: '👑 Du er nu holdleder!',
          message: `${currentUser.firstName} har meldt afbud. Du er nu holdleder for ${team.teamName}`,
        });
      }
    } else {
      const updatedPlayers = team.players.filter((p: TeamPlayer) => p.userId !== currentUser.userId);
      await updateTeam(team.id!, { players: updatedPlayers });
      await createNotification({
        toUserId: team.leaderId,
        type: 'general',
        title: '⚠️ Spiller har meldt afbud',
        message: `${currentUser.firstName} har meldt afbud fra holdet ${team.teamName}`,
      });
    }

    setConfirmationText('⚠️ Du er afmeldt holdet. Dine medspillere er notificeret.');
    setShowConfirmation(true);
    await loadData();
  };

  const handleInvitePlayer = async (team: Team, userId: string) => {
    if (!currentUser) return;
    const user = allUsers.find(u => u.userId === userId);
    if (!user) return;

    const battlenight = battlenights.find(b => b.id === team.battlenightId);

    try {
      await createTeamInvite({
        teamId: team.id!,
        teamName: team.teamName,
        battlenightId: team.battlenightId,
        battlenightDate: battlenight?.date || '',
        fromUserId: currentUser.userId,
        fromUserName: currentUser.firstName,
        toUserId: userId,
        status: 'pending',
      });

      await createNotification({
        toUserId: userId,
        type: 'team_invite',
        title: '🏒 Du er inviteret til et hold!',
        message: `${currentUser.firstName} inviterer dig til holdet "${team.teamName}"`,
        data: { teamId: team.id! },
      });

      setConfirmationText(`✅ Invitation sendt til ${user.firstName}!`);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
      setSearchQuery('');
    } catch (err) {
      console.error(err);
    }
  };

  const generateInviteText = (type: 'team' | 'opponent', teamName: string, battlenightDate?: string) => {
    if (type === 'team') {
      return `Hej! 🏒\n\nJeg vil gerne have dig med på mit hold "${teamName}" til 3on3 Battlenight på Rungsted Ishockey!\n\n📅 ${battlenightDate || 'Kommende Battlenight'}\n\n📲 Download appen og opret dig her:\nbattlenight.netlify.app\n\nSøg efter holdet "${teamName}" og accepter invitationen!\n\nSes på isen! 🥅`;
    } else {
      return `Hej! ⚔️\n\nJeg udfordrer dig til 3on3 Battlenight på Rungsted Ishockey!\n\n📲 Download appen og opret dit eget hold her:\nbattlenight.netlify.app\n\nFind holdet "${teamName}" på ranglisten og send en udfordring!\n\nHåber du tør tage imod! 😏🏒`;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const filteredUsers = allUsers.filter((u: User) =>
    u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.club.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    navigate('/');
    return null;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => {
          if (flowStep !== 'overview') {
            setFlowStep('overview');
          } else {
            navigate('/dashboard');
          }
        }}>← Tilbage</button>
        <h1 className="page-title">
          {flowStep === 'overview' && 'MIT HOLD'}
          {flowStep === 'choose-type' && 'TILMELD DIG'}
          {flowStep === 'choose-existing' && 'VÆLG HOLD'}
          {flowStep === 'create-team' && 'OPRET HOLD'}
          {flowStep === 'individual-confirm' && 'INDIVIDUEL'}
        </h1>
        <div />
      </div>

      {showConfirmation && (
        <div className="confirmation-banner" onClick={() => setShowConfirmation(false)}>
          {confirmationText}
        </div>
      )}

      {copiedText && (
        <div className="copied-banner">📋 Tekst kopieret!</div>
      )}

      <div className="content">

        {/* ============ OVERVIEW ============ */}
        {flowStep === 'overview' && (
          <>
            {myInvites.length > 0 && (
              <div className="invites-section">
                <h2 className="section-title">
                  📨 Invitationer
                  <span className="invite-count-badge">{myInvites.length}</span>
                </h2>
                {myInvites.map(invite => (
                  <div key={invite.id} className="invite-card">
                    <div className="invite-info">
                      <h3 className="invite-team">🏒 {invite.teamName}</h3>
                      <p className="invite-from">Invitation fra: <strong>{invite.fromUserName}</strong></p>
                      <p className="invite-date">📅 {invite.battlenightDate}</p>
                    </div>
                    <div className="invite-actions">
                      <button className="accept-invite-btn" onClick={() => handleRespondToInvite(invite, true)}>
                        ✅ Acceptér
                      </button>
                      <button className="decline-invite-btn" onClick={() => handleRespondToInvite(invite, false)}>
                        ❌ Afvis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isLoading ? (
              <p className="loading-text">⏳ Henter hold...</p>
            ) : (
              <>
                {battlenights.length > 0 && (
                  <div className="signup-section">
                    <h2 className="section-title">🏒 Næste Battlenight</h2>
                    {battlenights.slice(0, 1).map(bn => (
                      <div key={bn.id} className="next-battlenight-card">
                        <h3>{new Date(bn.date).toLocaleDateString('da-DK', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}</h3>
                        <p>⏰ {bn.time} · 💰 {bn.price} kr pr. spiller</p>
                        <button
                          className="signup-btn"
                          onClick={() => {
                            setSelectedBattlenight(bn);
                            setFlowStep('choose-type');
                          }}
                        >
                          🏒 Tilmeld dig nu
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {battlenights.length === 0 && myTeams.length === 0 && (
                  <div className="no-events-card">
                    <p className="no-team-icon">🏒</p>
                    <h2>Ingen åbne Battlenights</h2>
                    <p>Hold øje med appen - nye events annonceres snart!</p>
                  </div>
                )}

                {myTeams.length > 0 && (
                  <>
                    <h2 className="section-title" style={{ marginTop: '20px' }}>👥 Mine Hold</h2>
                    {myTeams.map(team => {
                      const isLeader = team.leaderId === currentUser.userId;
                      const battlenight = battlenights.find(b => b.id === team.battlenightId);

                      return (
                        <div key={team.id} className="team-card">
                          <div className="team-header">
                            <div>
                              <h2 className="team-name">🏒 {team.teamName}</h2>
                              <p className="team-event">
                                📅 {battlenight
                                  ? new Date(battlenight.date).toLocaleDateString('da-DK', {
                                      weekday: 'long', day: 'numeric', month: 'long'
                                    })
                                  : 'Ukendt event'}
                              </p>
                            </div>
                            <span className={`team-role-badge ${isLeader ? 'leader' : 'player'}`}>
                              {isLeader ? '👑 Holdleder' : '👤 Spiller'}
                            </span>
                          </div>

                          {/* Hold chat knap */}
                          <button
                            className="team-chat-btn"
                            onClick={() => navigate(`/messages?teamId=${team.id}`)}
                          >
                            💬 Hold Chat - {team.teamName}
                          </button>

                          {/* Udstyr */}
                          <div className="equipment-row">
                            <span className={`equipment-tag ${team.equipment}`}>
                              {team.equipment === 'full' ? '🏒 Fuldt udstyr' : '🧤 Basis udstyr'}
                            </span>
                            {isLeader && (
                              <button
                                className="change-equipment-btn"
                                onClick={() => updateTeam(team.id!, {
                                  equipment: team.equipment === 'full' ? 'basic' : 'full'
                                }).then(loadData)}
                              >
                                Skift
                              </button>
                            )}
                          </div>

                          {/* Spillere */}
                          <div className="players-section">
                            <h3 className="players-title">👥 Spillere ({team.players.length})</h3>
                            <div className="players-list">
                              {team.players.map((player: TeamPlayer, index: number) => (
                                <div key={index} className="player-card">
                                  <div className="player-avatar">
                                    #{player.playerNumber || '?'}
                                  </div>
                                  <div className="player-info">
                                    <p className="player-name">
                                      {player.placeholderName || player.firstName}
                                      {player.userId === team.leaderId && ' 👑'}
                                    </p>
                                    <p className="player-details">{player.club || 'Ukendt klub'}</p>
                                  </div>
                                  <span className={`player-status-tag ${player.status}`}>
                                    {player.status === 'accepted' && '✅'}
                                    {player.status === 'pending' && '⏳ Afventer'}
                                    {player.status === 'rejected' && '❌ Afvist'}
                                    {player.status === 'placeholder' && '👤 Ledig'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Inviter spillere - kun holdleder */}
                          {isLeader && (
                            <div className="invite-players-section">
                              <h3 className="players-title">➕ Inviter spiller</h3>

                              <div className="invite-search">
                                <input
                                  type="text"
                                  className="search-input-small"
                                  placeholder="Søg spiller i appen..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                  <div className="search-results-dropdown">
                                    {filteredUsers.slice(0, 5).map((user: User) => {
                                      const alreadyInTeam = team.players.some((p: TeamPlayer) => p.userId === user.userId);
                                      return (
                                        <div key={user.id} className="search-result-item">
                                          <div className="search-result-info">
                                            <span className="search-result-name">{user.firstName}</span>
                                            <span className="search-result-details">#{user.playerNumber} · {user.club}</span>
                                          </div>
                                          {alreadyInTeam ? (
                                            <span className="already-invited">✅ På holdet</span>
                                          ) : (
                                            <button
                                              className="invite-small-btn"
                                              onClick={() => handleInvitePlayer(team, user.userId)}
                                            >
                                              Inviter
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="invite-copy-options">
                                <button
                                  className="invite-copy-btn"
                                  onClick={() => setShowInviteText(showInviteText === `team-${team.id}` ? null : `team-${team.id}`)}
                                >
                                  📲 Inviter via SMS/Snap {showInviteText === `team-${team.id}` ? '▲' : '▼'}
                                </button>
                                <button
                                  className="invite-copy-btn opponent"
                                  onClick={() => setShowInviteText(showInviteText === `opp-${team.id}` ? null : `opp-${team.id}`)}
                                >
                                  ⚔️ Udfordr ny spiller {showInviteText === `opp-${team.id}` ? '▲' : '▼'}
                                </button>
                              </div>

                              {showInviteText === `team-${team.id}` && (
                                <div className="invite-text-box">
                                  <p className="invite-text-label">📋 Kopiér og send til din ven:</p>
                                  <textarea
                                    className="invite-textarea"
                                    readOnly
                                    value={generateInviteText('team', team.teamName, battlenights.find(b => b.id === team.battlenightId)?.date)}
                                    rows={8}
                                  />
                                  <button className="copy-btn" onClick={() => handleCopy(generateInviteText('team', team.teamName, battlenights.find(b => b.id === team.battlenightId)?.date))}>
                                    📋 Kopiér tekst
                                  </button>
                                </div>
                              )}

                              {showInviteText === `opp-${team.id}` && (
                                <div className="invite-text-box opponent">
                                  <p className="invite-text-label">⚔️ Kopiér og send udfordringen:</p>
                                  <textarea
                                    className="invite-textarea"
                                    readOnly
                                    value={generateInviteText('opponent', team.teamName)}
                                    rows={8}
                                  />
                                  <button className="copy-btn opponent" onClick={() => handleCopy(generateInviteText('opponent', team.teamName))}>
                                    📋 Kopiér udfordring
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Handlinger */}
                          <div className="team-actions">
                            <button className="action-btn danger" onClick={() => handleLeaveTeam(team)}>
                              {isLeader ? '⚠️ Meld afbud som holdleder' : '⚠️ Forlad holdet'}
                            </button>
                            {isLeader && (
                              <p className="action-note">ℹ️ Dine medspillere notificeres automatisk ved afbud</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ============ CHOOSE TYPE ============ */}
        {flowStep === 'choose-type' && selectedBattlenight && (
          <div>
            <div className="chosen-event-card">
              <p className="chosen-event-label">Du tilmelder dig:</p>
              <h3 className="chosen-event-date">
                {new Date(selectedBattlenight.date).toLocaleDateString('da-DK', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </h3>
              <p className="chosen-event-details">⏰ {selectedBattlenight.time} · 💰 {selectedBattlenight.price} kr</p>
            </div>

            <h2 className="section-title">Hvordan vil du deltage?</h2>

            <div className="type-choice-cards">
              {pastTeams.length > 0 && (
                <button
                  className="type-choice-card highlight"
                  onClick={() => setFlowStep('choose-existing')}
                >
                  <span className="type-choice-icon">🔄</span>
                  <h3 className="type-choice-title">Brug eksisterende hold</h3>
                  <p className="type-choice-desc">
                    Du har {pastTeams.length} tidligere hold du kan genbruge.
                  </p>
                </button>
              )}

              <button
                className="type-choice-card"
                onClick={() => setFlowStep('create-team')}
              >
                <span className="type-choice-icon">👑</span>
                <h3 className="type-choice-title">Opret nyt hold</h3>
                <p className="type-choice-desc">
                  Opret et nyt hold og inviter medspillere.
                </p>
              </button>

              <button
                className="type-choice-card"
                onClick={() => setFlowStep('individual-confirm')}
              >
                <span className="type-choice-icon">🏒</span>
                <h3 className="type-choice-title">Individuel spiller</h3>
                <p className="type-choice-desc">
                  Tilmeld dig uden hold og find hold på dagen.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ============ CHOOSE EXISTING TEAM ============ */}
        {flowStep === 'choose-existing' && selectedBattlenight && (
          <div>
            <div className="chosen-event-card">
              <p className="chosen-event-label">Battlenight:</p>
              <h3 className="chosen-event-date">
                {new Date(selectedBattlenight.date).toLocaleDateString('da-DK', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </h3>
            </div>

            <h2 className="section-title">Vælg dit hold</h2>
            <p className="form-hint">💡 Holdets navn og rangliste placering bevares.</p>

            <div className="existing-teams-list">
              {pastTeams.map(team => (
                <div key={team.id} className="existing-team-card">
                  <div className="existing-team-info">
                    <h3 className="existing-team-name">🏒 {team.teamName}</h3>
                    <p className="existing-team-details">
                      {team.equipment === 'full' ? '🏒 Fuldt udstyr' : '🧤 Basis udstyr'}
                      · {team.players.length} spillere sidst
                    </p>
                    <div className="existing-team-players">
                      {team.players.slice(0, 3).map((p: TeamPlayer, i: number) => (
                        <span key={i} className="existing-player-tag">
                          {p.placeholderName || p.firstName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="use-team-btn"
                    onClick={() => handleReuseTeam(team)}
                  >
                    Brug dette hold
                  </button>
                </div>
              ))}
            </div>

            <button
              className="action-btn secondary"
              style={{ marginTop: '15px' }}
              onClick={() => setFlowStep('choose-type')}
            >
              ← Tilbage
            </button>
          </div>
        )}

        {/* ============ CREATE TEAM ============ */}
        {flowStep === 'create-team' && selectedBattlenight && (
          <div>
            <div className="chosen-event-card">
              <p className="chosen-event-label">Battlenight:</p>
              <h3 className="chosen-event-date">
                {new Date(selectedBattlenight.date).toLocaleDateString('da-DK', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </h3>
            </div>

            <div className="form-section">
              <label className="form-label">🏒 Holdnavn <span className="optional">(valgfrit)</span></label>
              <input
                type="text"
                className="form-input"
                placeholder={`Team ${currentUser.firstName}`}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <p className="form-hint">💡 Holdnavnet bruges på ranglisten!</p>
            </div>

            <div className="form-section">
              <label className="form-label">⚙️ Udstyrsniveau</label>
              <p className="form-hint">⚠️ Alle spillere SKAL have samme udstyrsniveau</p>
              <div className="equipment-toggle">
                <button
                  className={`equipment-btn ${equipment === 'full' ? 'active' : ''}`}
                  onClick={() => setEquipment('full')}
                >
                  🏒 Fuldt udstyr
                  <span className="equipment-desc">Alle beskyttere, hjelm, handsker, stav</span>
                </button>
                <button
                  className={`equipment-btn ${equipment === 'basic' ? 'active' : ''}`}
                  onClick={() => setEquipment('basic')}
                >
                  🧤 Basis udstyr
                  <span className="equipment-desc">Kun stav, handsker og hjelm</span>
                </button>
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">👥 Inviter medspillere <span className="optional">(valgfrit)</span></label>
              <p className="form-hint">💡 Du kan tilmelde dig alene og invitere spillere bagefter</p>

              <input
                type="text"
                className="form-input"
                placeholder="Søg efter spiller i appen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {searchQuery && (
                <div className="search-results-list">
                  {filteredUsers.slice(0, 5).map((user: User) => (
                    <div key={user.id} className="search-result-item">
                      <div className="search-result-info">
                        <span className="search-result-name">{user.firstName}</span>
                        <span className="search-result-details">#{user.playerNumber} · {user.club} · {user.userId}</span>
                      </div>
                      {selectedPlayers.includes(user.userId) ? (
                        <button
                          className="remove-player-btn"
                          onClick={() => setSelectedPlayers(prev => prev.filter(id => id !== user.userId))}
                        >
                          ✕ Fjern
                        </button>
                      ) : (
                        <button
                          className="add-player-small-btn"
                          onClick={() => {
                            if (selectedPlayers.length < 2) {
                              setSelectedPlayers(prev => [...prev, user.userId]);
                              setSearchQuery('');
                            }
                          }}
                          disabled={selectedPlayers.length >= 2}
                        >
                          + Tilføj
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedPlayers.length > 0 && (
                <div className="selected-players-list">
                  {selectedPlayers.map((userId: string) => {
                    const user = allUsers.find(u => u.userId === userId);
                    return (
                      <div key={userId} className="selected-player-item">
                        <span>✅ {user?.firstName || userId}</span>
                        <button onClick={() => setSelectedPlayers(prev => prev.filter(id => id !== userId))}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="invite-new-section">
                <p className="form-hint">📲 Har du en ven der ikke er i appen endnu?</p>
                <button
                  className="show-invite-text-btn"
                  onClick={() => setShowInviteText(showInviteText ? null : 'new-team')}
                >
                  {showInviteText === 'new-team' ? '▲ Skjul invite tekst' : '📲 Vis invite tekst til SMS/Snap ▼'}
                </button>

                {showInviteText === 'new-team' && (
                  <div className="invite-text-box">
                    <p className="invite-text-label">📋 Kopiér og send til din ven:</p>
                    <textarea
                      className="invite-textarea"
                      readOnly
                      value={generateInviteText('team', teamName || `Team ${currentUser.firstName}`, selectedBattlenight.date)}
                      rows={8}
                    />
                    <button
                      className="copy-btn"
                      onClick={() => handleCopy(generateInviteText('team', teamName || `Team ${currentUser.firstName}`, selectedBattlenight.date))}
                    >
                      📋 Kopiér tekst
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="create-actions">
              <button className="action-btn primary" onClick={handleCreateTeam}>
                ✅ Opret hold og tilmeld
              </button>
              <button className="action-btn secondary" onClick={() => setFlowStep('choose-type')}>
                ← Tilbage
              </button>
            </div>
          </div>
        )}

        {/* ============ INDIVIDUAL CONFIRM ============ */}
        {flowStep === 'individual-confirm' && selectedBattlenight && (
          <div>
            <div className="chosen-event-card">
              <p className="chosen-event-label">Du tilmelder dig som individuel spiller:</p>
              <h3 className="chosen-event-date">
                {new Date(selectedBattlenight.date).toLocaleDateString('da-DK', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </h3>
              <p className="chosen-event-details">⏰ {selectedBattlenight.time} · 💰 {selectedBattlenight.price} kr</p>
            </div>

            <div className="individual-info-card">
              <h3>🏒 Som individuel spiller:</h3>
              <ul className="individual-info-list">
                <li>✅ Du tilmeldes eventet uden hold</li>
                <li>✅ Du vises på listen over individuelle spillere</li>
                <li>✅ Holdledere kan invitere dig til deres hold</li>
                <li>✅ Du kan selv oprette et hold bagefter</li>
                <li>✅ Du kan finde medspillere på selve dagen</li>
              </ul>
            </div>

            <div className="create-actions">
              <button
                className="action-btn primary"
                onClick={async () => {
                  try {
                    const { signupIndividual } = await import('../services/battlenightService');
                    await signupIndividual(selectedBattlenight.id!, currentUser.userId, currentUser.firstName);
                    setConfirmationText(`✅ Du er tilmeldt som individuel spiller!`);
                    setShowConfirmation(true);
                    setFlowStep('overview');
                    await loadData();
                  } catch (err: any) {
                    setConfirmationText(err.message || 'Der skete en fejl');
                    setShowConfirmation(true);
                    setTimeout(() => setShowConfirmation(false), 3000);
                  }
                }}
              >
                ✅ Bekræft tilmelding
              </button>
              <button className="action-btn secondary" onClick={() => setFlowStep('choose-type')}>
                ← Tilbage
              </button>
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}

export default MyTeam;