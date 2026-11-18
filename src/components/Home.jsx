import { useState } from 'react';
import { createTrip, tripExists } from '../api.js';
import { navigate } from '../router.js';
import { normalizeCode } from '../logic.js';
import { getRecent, forgetTrip } from '../storage.js';
import { CURRENCIES } from './ui.jsx';

export default function Home() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [people, setPeople] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [recent, setRecent] = useState(getRecent);

  const setPersonAt = (i, v) => {
    const next = [...people];
    next[i] = v;
    if (i === next.length - 1 && v.trim()) next.push('');
    setPeople(next);
  };

  async function onCreate(e) {
    e.preventDefault();
    setError('');
    const names = people.map((p) => p.trim()).filter(Boolean);
    if (!name.trim()) return setError('Give your trip a name');
    const lower = names.map((n) => n.toLowerCase());
    if (new Set(lower).size !== lower.length) return setError('Each person needs a different name');
    setBusy(true);
    try {
      const newCode = await createTrip({ name, currency, people: names });
      navigate(`/t/${newCode}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  }

  async function onJoin(e) {
    e.preventDefault();
    setJoinError('');
    const c = normalizeCode(code);
    if (c.length < 6) return setJoinError('That code looks too short');
    setBusy(true);
    try {
      if (await tripExists(c)) navigate(`/t/${c}`);
      else setJoinError('No trip found with that code');
    } catch (err) {
      setJoinError(err.message || 'Could not look up that code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <header className="hero">
        <div className="logo">⇆</div>
        <h1>Splitter</h1>
        <p className="muted">Track shared trip expenses and see who owes whom. Free, no sign-up — just share the link.</p>
      </header>

      <form className="card" onSubmit={onJoin}>
        <h2>Open a trip</h2>
        <div className="row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Trip code or link"
            autoCapitalize="characters"
            aria-label="Trip code"
          />
          <button className="btn" disabled={busy || !code.trim()}>Open</button>
        </div>
        {joinError && <p className="error">{joinError}</p>}
      </form>

      {recent.length > 0 && (
        <div className="card">
          <h2>Your recent trips</h2>
          <ul className="list">
            {recent.map((t) => (
              <li key={t.code} className="list-item clickable" onClick={() => navigate(`/t/${t.code}`)}>
                <div className="grow">
                  <div className="strong">{t.name}</div>
                  <div className="muted small mono">{t.code}</div>
                </div>
                <button
                  className="icon-btn"
                  title="Remove from this list"
                  aria-label={`Remove ${t.name} from recent trips`}
                  onClick={(e) => {
                    e.stopPropagation();
                    forgetTrip(t.code);
                    setRecent(getRecent());
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="card" onSubmit={onCreate}>
        <h2>Start a new trip</h2>
        <label className="field">
          <span>Trip name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa 2026" maxLength={80} />
        </label>
        <label className="field">
          <span>Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map(([sym, label]) => <option key={label} value={sym}>{label}</option>)}
          </select>
        </label>
        <div className="field">
          <span>People <span className="muted small">(you can add more later)</span></span>
          {people.map((p, i) => (
            <input
              key={i}
              value={p}
              onChange={(e) => setPersonAt(i, e.target.value)}
              placeholder={i === 0 ? 'Your name' : `Friend ${i}`}
              maxLength={40}
              className="stack"
            />
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create trip'}</button>
      </form>
    </div>
  );
}
