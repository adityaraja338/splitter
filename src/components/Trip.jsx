import { useEffect, useMemo, useState, useCallback } from 'react';
import { watchTrip, watchEntries } from '../api.js';
import { computeBalances, formatMoney, suggestSettlements, pairwiseDebts } from '../logic.js';
import { getMe, setMe as storeMe, rememberTrip } from '../storage.js';
import { navigate } from '../router.js';
import { Avatar, Toast } from './ui.jsx';
import WhoAreYou from './WhoAreYou.jsx';
import PeopleStrip from './PeopleStrip.jsx';
import MySummary from './MySummary.jsx';
import ExpenseList from './ExpenseList.jsx';
import ExpenseForm from './ExpenseForm.jsx';
import PaymentForm from './PaymentForm.jsx';
import Balances from './Balances.jsx';
import People from './People.jsx';

const TABS = [
  ['expenses', 'Expenses'],
  ['balances', 'Balances'],
  ['people', 'People'],
];

export default function Trip({ code }) {
  const [trip, setTrip] = useState(undefined); // undefined = loading, null = not found
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [me, setMeState] = useState(() => getMe(code));
  const [tab, setTab] = useState('expenses');
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(null); // {kind:'expense'|'payment', entry?, preset?}
  const [toast, setToast] = useState('');

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  useEffect(() => {
    const onErr = (e) => setError(e.message || 'Could not load trip');
    const u1 = watchTrip(code, setTrip, onErr);
    const u2 = watchEntries(code, setEntries, onErr);
    return () => { u1(); u2(); };
  }, [code]);

  useEffect(() => {
    if (trip) {
      rememberTrip(code, trip.name);
      document.title = `${trip.name} · Splitter`;
    }
    return () => { document.title = 'Splitter'; };
  }, [trip?.name, code]);

  const people = useMemo(() => trip?.people || [], [trip]);
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const meValid = me && byId[me] ? me : null;

  // Ask who you are on first visit (once people exist)
  useEffect(() => {
    if (trip && people.length && !meValid) setPicking(true);
  }, [trip, people.length, meValid]);

  const setMe = (id) => {
    storeMe(code, id);
    setMeState(id);
    setPicking(false);
  };

  const stats = useMemo(() => computeBalances(people, entries), [people, entries]);
  const simplify = trip?.simplify !== false;
  const settlements = useMemo(
    () => (simplify ? suggestSettlements(stats.balances) : pairwiseDebts(entries)),
    [simplify, stats, entries],
  );
  const total = useMemo(() => entries.filter((e) => e.type !== 'payment').reduce((a, e) => a + e.amount, 0), [entries]);

  async function share() {
    const url = `${location.origin}/t/${code}`;
    const text = `Join "${trip.name}" on Splitter to add and track our shared expenses`;
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.name, text, url });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash('Link copied to clipboard');
    } catch {
      prompt('Copy this link', url);
    }
  }

  if (error) {
    return (
      <div className="page narrow">
        <div className="card">
          <h2>Something went wrong</h2>
          <p className="error">{error}</p>
          <button className="btn" onClick={() => navigate('/')}>Go home</button>
        </div>
      </div>
    );
  }
  if (trip === undefined) return <div className="page narrow"><div className="spinner" aria-label="Loading" /></div>;
  if (trip === null) {
    return (
      <div className="page narrow">
        <div className="card">
          <h2>Trip not found</h2>
          <p className="muted">No trip exists with code <span className="mono">{code}</span>. Check the link and try again.</p>
          <button className="btn" onClick={() => navigate('/')}>Go home</button>
        </div>
      </div>
    );
  }

  const cur = trip.currency ?? '';
  const myBal = meValid ? stats.balances[meValid] || 0 : 0;

  return (
    <div className="page">
      <header className="trip-head">
        <button className="link-btn back" onClick={() => navigate('/')}>← Trips</button>
        <div className="trip-title">
          <h1>{trip.name}</h1>
          <button className="code-chip mono" onClick={share} title="Share this trip">{code} · Share</button>
        </div>
        <div className="summary">
          <div>
            <div className="muted small">Total spent</div>
            <div className="big">{formatMoney(total, cur)}</div>
          </div>
          <button className="me-chip" onClick={() => setPicking(true)}>
            {meValid ? (
              <>
                <Avatar person={byId[meValid]} size={28} />
                <span>
                  <span className="small muted">You are {byId[meValid].name}</span>
                  <span className={`strong ${myBal > 0 ? 'pos' : myBal < 0 ? 'neg' : ''}`}>
                    {myBal > 0 ? `overall you get back ${formatMoney(myBal, cur)}` : myBal < 0 ? `overall you owe ${formatMoney(-myBal, cur)}` : 'all settled'}
                  </span>
                </span>
              </>
            ) : (
              <span>Who are you?</span>
            )}
          </button>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === 'expenses' && people.length > 0 && (
          <MySummary
            me={meValid}
            byId={byId}
            settlements={settlements}
            currency={cur}
            code={code}
            flash={flash}
            onPickMe={() => setPicking(true)}
            onEdit={(preset) => setEditing({ kind: 'payment', preset })}
            onSeeAll={() => setTab('balances')}
          />
        )}
        {tab === 'expenses' && (
          <PeopleStrip people={people} me={meValid} balances={stats.balances} code={code} currency={cur} flash={flash} />
        )}
        {tab === 'expenses' && (
          <ExpenseList
            entries={entries}
            byId={byId}
            me={meValid}
            currency={cur}
            onOpen={(entry) => setEditing({ kind: entry.type === 'payment' ? 'payment' : 'expense', entry })}
            onAdd={() => setEditing({ kind: 'expense' })}
            hasPeople={people.length > 0}
          />
        )}
        {tab === 'balances' && (
          <Balances
            people={people}
            byId={byId}
            stats={stats}
            settlements={settlements}
            simplify={simplify}
            me={meValid}
            currency={cur}
            code={code}
            flash={flash}
            onRecord={(preset) => setEditing({ kind: 'payment', preset })}
          />
        )}
        {tab === 'people' && (
          <People trip={trip} code={code} entries={entries} me={meValid} stats={stats} flash={flash} onPickMe={() => setPicking(true)} />
        )}
      </main>

      {tab === 'expenses' && people.length > 0 && entries.length > 0 && (
        <button className="fab" onClick={() => setEditing({ kind: 'expense' })} aria-label="Add expense">＋ Add expense</button>
      )}

      {picking && (
        <WhoAreYou
          people={people}
          code={code}
          current={meValid}
          onPick={setMe}
          onClose={() => setPicking(false)}
          flash={flash}
        />
      )}
      {editing?.kind === 'expense' && (
        <ExpenseForm
          code={code}
          people={people}
          me={meValid}
          currency={cur}
          entry={editing.entry}
          onClose={() => setEditing(null)}
          flash={flash}
        />
      )}
      {editing?.kind === 'payment' && (
        <PaymentForm
          code={code}
          people={people}
          me={meValid}
          currency={cur}
          entry={editing.entry}
          preset={editing.preset}
          onClose={() => setEditing(null)}
          flash={flash}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
