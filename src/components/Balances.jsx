import { useState } from 'react';
import { updateTrip } from '../api.js';
import { formatMoney } from '../logic.js';
import { markPaid } from '../settle.js';
import { Avatar } from './ui.jsx';

export default function Balances({ people, byId, stats, settlements, simplify, me, currency, code, flash, onRecord }) {
  const [busyKey, setBusyKey] = useState(null);
  const { balances, paid, spent } = stats;
  const suggestions = settlements;
  const max = Math.max(1, ...Object.values(balances).map(Math.abs));
  const name = (id) => (id === me ? 'You' : byId[id]?.name || 'Someone');

  async function settle(s) {
    setBusyKey(`${s.from}-${s.to}`);
    await markPaid({ code, s, me, byId, currency, flash });
    setBusyKey(null);
  }

  async function toggleSimplify() {
    try {
      await updateTrip(code, { simplify: !simplify });
    } catch (e) {
      flash(`Failed: ${e.message}`);
    }
  }

  if (!people.length) return <div className="empty"><p>Add people to see balances.</p></div>;

  const mine = me ? suggestions.filter((s) => s.from === me || s.to === me) : [];
  const others = suggestions.filter((s) => !mine.includes(s));

  const renderSuggestion = (s) => (
    <li key={`${s.from}-${s.to}`} className="list-item settle">
      <Avatar person={byId[s.from]} size={30} />
      <div className="grow">
        <div>
          <strong>{name(s.from)}</strong> {s.from === me ? 'owe' : 'owes'} <strong>{s.to === me ? 'you' : name(s.to)}</strong>
        </div>
        <div className={`amount ${s.to === me ? 'pos' : 'neg'}`}>{formatMoney(s.amount, currency)}</div>
      </div>
      <button className="btn small-btn" disabled={busyKey === `${s.from}-${s.to}`} onClick={() => settle(s)}>
        Mark paid
      </button>
      <button className="icon-btn" title="Record a different amount" aria-label="Record a different amount" onClick={() => onRecord(s)}>✎</button>
    </li>
  );

  return (
    <div>
      <section className="card">
        <div className="summary-head">
          <h2>Who owes whom</h2>
          <label className="switch small">
            <input type="checkbox" checked={simplify} onChange={toggleSimplify} />
            <span>Simplify debts</span>
          </label>
        </div>
        <p className="muted small">
          {simplify
            ? 'Fewest payments to settle everyone (debts may be passed along, e.g. you pay Carol instead of Bob).'
            : 'Direct debts: each person pays back whoever actually paid for them.'}
        </p>
        {suggestions.length === 0 ? (
          <p className="muted">🎉 Everyone is settled up.</p>
        ) : (
          <>
            {mine.length > 0 && <ul className="list">{mine.map(renderSuggestion)}</ul>}
            {mine.length > 0 && others.length > 0 && <div className="divider small muted">Between others</div>}
            {others.length > 0 && <ul className="list">{others.map(renderSuggestion)}</ul>}
          </>
        )}
        <button className="link-btn top-gap" onClick={() => onRecord(null)}>+ Record some other payment</button>
      </section>

      <section className="card">
        <h2>Balances</h2>
        <ul className="list">
          {people.map((p) => {
            const b = balances[p.id] || 0;
            return (
              <li key={p.id} className="balance-row">
                <div className="balance-name">
                  <Avatar person={p} size={26} />
                  <span>{p.name}{p.id === me && <span className="muted small"> (you)</span>}</span>
                </div>
                <div className="bar-wrap">
                  <div className="bar-mid" />
                  <div
                    className={`bar ${b >= 0 ? 'bar-pos' : 'bar-neg'}`}
                    style={{ width: `${(Math.abs(b) / max) * 50}%`, [b >= 0 ? 'left' : 'right']: '50%' }}
                  />
                </div>
                <div className={`balance-amt ${b > 0 ? 'pos' : b < 0 ? 'neg' : 'muted'}`}>
                  {b > 0 ? '+' : ''}{formatMoney(b, currency)}
                </div>
                <div className="balance-detail muted small">
                  paid {formatMoney(paid[p.id] || 0, currency)} · share {formatMoney(spent[p.id] || 0, currency)}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="muted small">Green = gets money back, red = owes money. Payments already made are included.</p>
      </section>
    </div>
  );
}
