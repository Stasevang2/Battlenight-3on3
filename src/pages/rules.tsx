import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/rules.css';

type Rule = {
  id: string;
  title: string;
  content: string;
  type: 'player' | 'admin';
  order: number;
  updatedAt: Timestamp;
};

const defaultPlayerRules: Omit<Rule, 'updatedAt'>[] = [
  {
    id: 'player-1',
    title: '👥 Holdregler',
    content: 'Et hold består af op til 3 spillere og en holdleder. Holdlederen er ansvarlig for holdet og skal melde afbud i god tid hvis holdet ikke kan deltage. Man kan spille med færre end 3 spillere.',
    type: 'player',
    order: 1,
  },
  {
    id: 'player-2',
    title: '⚙️ Udstyr',
    content: 'Alle spillere på et hold skal have SAMME udstyrsniveau. Enten spiller ALLE med fuldt udstyr, eller ALLE med stav, handsker og hjelm. Det er IKKE tilladt at spille med delvist udstyr!',
    type: 'player',
    order: 2,
  },
  {
    id: 'player-3',
    title: '🏒 Spilleregler',
    content: 'Der spilles 3 mod 3 på tværs af banen. Hver kamp varer 5 minutter, derefter holder holdet pause i 5 minutter mens andre hold spiller. Der spilles i 3 zoner på isen.',
    type: 'player',
    order: 3,
  },
  {
    id: 'player-4',
    title: '📅 Tilmelding',
    content: 'Tilmelding sker via appen. Max 36 spillere (12 hold) pr. Battlenight. Ved afbud SKAL dette registreres i appen. Udebliver man uden afbud koster det 50% af deltagergebyret som straf.',
    type: 'player',
    order: 4,
  },
  {
    id: 'player-5',
    title: '💰 Betaling',
    content: 'Betaling sker via MobilePay med dit Bruger ID som besked. Beløbet trækkes ved deltagelse. Negativ saldo skal indbetales inden næste Battlenight.',
    type: 'player',
    order: 5,
  },
  {
    id: 'player-6',
    title: '🏆 Udfordringer',
    content: 'Hold kan udfordre hinanden til en officiel 3 on 3 battle. Resultater publiceres på ranglisten. Det er for sjov - god sportsånd er et krav!',
    type: 'player',
    order: 6,
  },
];

const defaultAdminRules: Omit<Rule, 'updatedAt'>[] = [
  {
    id: 'admin-1',
    title: '🛡️ Vagter',
    content: 'Som admin skal du sikre at reglerne overholdes på isen. Tjek at alle hold har korrekt udstyr INDEN de går på isen. Kontrollér at hold med "stav, handsker og hjelm" IKKE har yderligere udstyr på.',
    type: 'admin',
    order: 1,
  },
  {
    id: 'admin-2',
    title: '📋 Registrering',
    content: 'Registrér alle hold ved ankomst. Marker betalingsstatus - enten betalt på forhånd eller "betaling ved ankomst". Registrér no-shows.',
    type: 'admin',
    order: 2,
  },
  {
    id: 'admin-3',
    title: '⚠️ No-show håndtering',
    content: 'Hvis et hold ikke møder op uden at have meldt afbud, skal dette registreres i appen. Holdlederen vil automatisk få en strafbetaling på 50% inden næste tilmelding.',
    type: 'admin',
    order: 3,
  },
  {
    id: 'admin-4',
    title: '🍔 Mad & Drikke',
    content: 'Admins håndterer udlevering af mad og drikke bestillinger. Sørg for at registrere betaling ved ankomst for bestillinger.',
    type: 'admin',
    order: 4,
  },
];

function Rules() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'player' | 'admin'>('player');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saved, setSaved] = useState(false);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'rules'));
      if (snapshot.empty) {
        // Opret standard regler hvis ingen findes
        const allDefaults = [...defaultPlayerRules, ...defaultAdminRules];
        const loadedRules: Rule[] = [];
        for (const rule of allDefaults) {
          const ruleWithTimestamp: Rule = {
            ...rule,
            updatedAt: Timestamp.now(),
          };
          await setDoc(doc(db, 'rules', rule.id), ruleWithTimestamp);
          loadedRules.push(ruleWithTimestamp);
        }
        setRules(loadedRules);
      } else {
        setRules(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Rule)));
      }
    } catch (err) {
      console.error(err);
      // Fallback til default regler
      setRules([
        ...defaultPlayerRules.map(r => ({ ...r, updatedAt: Timestamp.now() })),
        ...defaultAdminRules.map(r => ({ ...r, updatedAt: Timestamp.now() })),
      ]);
    }
    setIsLoading(false);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule.id);
    setEditTitle(rule.title);
    setEditContent(rule.content);
  };

  const handleSaveRule = async (ruleId: string) => {
    try {
      const updatedRule = {
        title: editTitle,
        content: editContent,
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'rules', ruleId), updatedRule, { merge: true });
      setRules(prev => prev.map(r =>
        r.id === ruleId ? { ...r, title: editTitle, content: editContent } : r
      ));
      setEditingRule(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRules = rules
    .filter(r => r.type === activeTab)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Tilbage</button>
        <h1 className="page-title">REGLER</h1>
        <div />
      </div>

      <div className="content">
        {saved && (
          <div className="save-banner">✅ Regel gemt!</div>
        )}

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

        {isLoading ? (
          <p className="loading-text">⏳ Henter regler...</p>
        ) : (
          <div className="rules-list">
            {filteredRules.map((rule) => (
              <div key={rule.id} className="rule-card">
                {editingRule === rule.id && isSuperAdmin ? (
                  // Redigeringsvisning
                  <div className="rule-edit">
                    <input
                      type="text"
                      className="rule-edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <textarea
                      className="rule-edit-content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                    />
                    <div className="rule-edit-actions">
                      <button
                        className="rule-save-btn"
                        onClick={() => handleSaveRule(rule.id)}
                      >
                        💾 Gem
                      </button>
                      <button
                        className="rule-cancel-btn"
                        onClick={() => setEditingRule(null)}
                      >
                        ✕ Annuller
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal visning
                  <>
                    <button
                      className="rule-header"
                      onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                    >
                      <span className="rule-title">{rule.title}</span>
                      <div className="rule-header-right">
                        {isSuperAdmin && (
                          <button
                            className="rule-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRule(rule);
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        <span className="rule-arrow">
                          {expandedRule === rule.id ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>
                    {expandedRule === rule.id && (
                      <div className="rule-content">
                        <p>{rule.content}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default Rules;