import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../styles/rules.css';

const playerRules = [
  {
    id: 1,
    title: '👥 Holdregler',
    content: 'Et hold består af 3 spillere og en holdleder. Holdlederen er ansvarlig for holdet og skal melde afbud i god tid hvis holdet ikke kan deltage.',
  },
  {
    id: 2,
    title: '⚙️ Udstyr',
    content: 'Alle spillere på et hold skal have SAMME udstyrsniveau. Enten spiller ALLE med fuldt udstyr, eller ALLE med stav, handsker og hjelm. Det er IKKE tilladt at spille med delvist udstyr!',
  },
  {
    id: 3,
    title: '🏒 Spilleregler',
    content: 'Der spilles 3 mod 3 på tværs af banen. Hver kamp varer 5 minutter, derefter holder holdet pause i 5 minutter mens andre hold spiller. Der spilles i 3 zoner på isen.',
  },
  {
    id: 4,
    title: '📅 Tilmelding',
    content: 'Tilmelding sker via appen. Max 36 spillere (12 hold) pr. Battlenight. Ved afbud SKAL dette registreres i appen senest 24 timer før. Udebliver man uden afbud koster det 50% af deltagergebyret som straf.',
  },
  {
    id: 5,
    title: '💰 Betaling',
    content: 'Betaling sker via MobilePay til din konto i appen. Beløbet trækkes automatisk ved deltagelse. Negativ saldo skal indbetales inden næste Battlenight.',
  },
  {
    id: 6,
    title: '🏆 Udfordringer',
    content: 'Hold kan udfordre hinanden til en officiel 3 on 3 battle. Resultater publiceres på ranglisten. Det er for sjov - god sportsånd er et krav!',
  },
];

const adminRules = [
  {
    id: 1,
    title: '🛡️ Vagter',
    content: 'Som admin skal du sikre at reglerne overholdes på isen. Tjek at alle hold har korrekt udstyr INDEN de går på isen. Kontrollér at hold med "stav, handsker og hjelm" IKKE har yderligere udstyr på.',
  },
  {
    id: 2,
    title: '📋 Registrering',
    content: 'Registrér alle hold ved ankomst. Marker betalingsstatus - enten betalt på forhånd eller "betaling ved ankomst". Registrér no-shows.',
  },
  {
    id: 3,
    title: '⚠️ No-show håndtering',
    content: 'Hvis et hold ikke møder op uden at have meldt afbud, skal dette registreres i appen. Holdederen vil automatisk få en strafbetaling på 50% inden næste tilmelding.',
  },
];

function Rules() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'player' | 'admin'>('player');
  const [expandedRule, setExpandedRule] = useState<number | null>(null);

  const rules = activeTab === 'player' ? playerRules : adminRules;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">REGLER</h1>
        <div />
      </div>

      <div className="content">
        {/* Tab toggle */}
        <div className="rules-toggle">
          <button
            className={`rules-tab ${activeTab === 'player' ? 'active' : ''}`}
            onClick={() => setActiveTab('player')}
          >
            👤 Spillerregler
          </button>
          <button
            className={`rules-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            🛡️ Adminregler
          </button>
        </div>

        {/* Rules list */}
        <div className="rules-list">
          {rules.map((rule) => (
            <div key={rule.id} className="rule-card">
              <button
                className="rule-header"
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              >
                <span className="rule-title">{rule.title}</span>
                <span className="rule-arrow">{expandedRule === rule.id ? '▲' : '▼'}</span>
              </button>
              {expandedRule === rule.id && (
                <div className="rule-content">
                  <p>{rule.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default Rules;