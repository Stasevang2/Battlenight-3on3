import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/leaderboard.css';

const currentUserBirthYear = 2012;

const mockLeaderboard = [
  { rank: 1, teamName: 'Ice Kings', wins: 15, losses: 3, attended: 18, points: 45, birthYear: 2011 },
  { rank: 2, teamName: 'Rungsted Rockets', wins: 12, losses: 5, attended: 17, points: 36, birthYear: 2012 },
  { rank: 3, teamName: 'Puck Masters', wins: 10, losses: 7, attended: 17, points: 30, birthYear: 2012 },
  { rank: 4, teamName: 'Slap Shot Boys', wins: 8, losses: 9, attended: 17, points: 24, birthYear: 2013 },
  { rank: 5, teamName: 'The Blades', wins: 6, losses: 10, attended: 16, points: 18, birthYear: 2011 },
  { rank: 6, teamName: 'Frozen Five', wins: 4, losses: 12, attended: 16, points: 12, birthYear: 2013 },
  { rank: 7, teamName: 'Storm Riders', wins: 3, losses: 13, attended: 15, points: 9, birthYear: 2014 },
  { rank: 8, teamName: 'Thunder Hawks', wins: 2, losses: 14, attended: 15, points: 6, birthYear: 2010 },
];

const mockChallenges = [
  { id: 1, from: 'Rungsted Rockets', status: 'pending', daysLeft: 12, rank: 2 },
];

function Leaderboard() {
  const navigate = useNavigate();
  const [showAllYears, setShowAllYears] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const myTeamRank = 3;

  const filteredLeaderboard = showAllYears
    ? mockLeaderboard
    : mockLeaderboard.filter(team =>
        Math.abs(team.birthYear - currentUserBirthYear) <= 1
      );

  const handleChallenge = (teamName: string) => {
    setSelectedTeam(teamName);
    setShowChallengeModal(true);
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
        {mockChallenges.length > 0 && (
          <div className="challenges-section">
            <h2 className="section-title">⚔️ Indgående Udfordringer</h2>
            {mockChallenges.map(challenge => (
              <div key={challenge.id} className="challenge-card incoming">
                <div className="challenge-info">
                  <p className="challenge-from">⚔️ {challenge.from} udfordrer dig!</p>
                  <p className="challenge-days">⏰ {challenge.daysLeft} dage tilbage til at svare</p>
                  <p className="challenge-note">⚠️ Svarer du ikke inden 14 dage taber du din placering</p>
                </div>
                <div className="challenge-actions">
                  <button className="accept-btn">✅ Acceptér</button>
                  <button className="decline-btn">❌ Afvis</button>
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
          {filteredLeaderboard.map((team) => {
            const isMyTeam = team.rank === myTeamRank;
            const canChallenge = Math.abs(team.rank - myTeamRank) <= 3 && !isMyTeam;

            return (
              <div key={team.rank} className={`leaderboard-row ${isMyTeam ? 'my-team' : ''}`}>
                <span className="rank-number">
                  {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : `#${team.rank}`}
                </span>
                <div className="team-info">
                  <div className="team-name-row">
                    <span className="team-name-text">{team.teamName}</span>
                    {isMyTeam && <span className="my-team-tag">Dit hold</span>}
                    <span className="birth-year-tag">{team.birthYear}</span>
                  </div>
                  <span className="team-record">
                    {team.wins}W - {team.losses}L · {team.attended} kampe
                  </span>
                </div>
                <div className="team-right">
                  <span className="team-points">{team.points} pt</span>
                  {canChallenge && (
                    <button
                      className="mini-challenge-btn"
                      onClick={() => handleChallenge(team.teamName)}
                    >
                      ⚔️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Challenge regler info */}
        <div className="challenge-rules">
          <p>⚔️ Du kan udfordre hold 3 placeringer over og under dig</p>
          <p>⏰ Udfordringer skal besvares inden 14 dage - ellers taber det udfordrede hold sin placering</p>
        </div>

      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">⚔️ Send Udfordring</h3>
            <p className="modal-text">Du er ved at udfordre <strong>{selectedTeam}</strong> til en officiel 3 on 3 battle!</p>
            <p className="modal-note">En beskedtråd oprettes automatisk så I kan aftale detaljer</p>
            <div className="modal-actions">
              <button className="modal-confirm-btn" onClick={() => {
                setShowChallengeModal(false);
                navigate('/messages');
              }}>
                ⚔️ Send udfordring
              </button>
              <button className="modal-cancel-btn" onClick={() => setShowChallengeModal(false)}>
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
