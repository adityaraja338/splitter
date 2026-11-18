import { useState } from 'react';
import { addEntry } from '../api.js';
import { suggestSettlements, formatMoney } from '../logic.js';
import { Avatar } from './ui.jsx';

export default function Balances({ people, byId, stats, me, currency, code, flash, onRecord }) {
  const [busyKey, setBusyKey] = useState(null);
  const { balances, paid, spent } = stats;
  const suggestions = suggestSettlements(balances);
  const max = Math.max(1, ...Object.values(balances).map(Math.abs));
  const name = (id) => (id === me ? 'You' : byId[id]?.name || 'Someone');

  async function settle(s) {
    const key = `${s.from}-${s.to}`;
    if (!confirm(`Mark ${formatMoney(s.amount, currency)} from ${byId[s.from]?.name} to ${byId[s.to]?.name} as paid?`)) return;
    setBusyKey(key);
    try {
      await addEntry(code, {
        type: 'payment', from: s.from, to: s.to, amount: s.amount,
        date: new Date().toLocaleDateString('en-CA'), note: '', createdBy: me || null,
      });
      flash('Marked as paid');
    } catch (e) {
      flash(`Failed: ${e.message}`);
    } finally {
      setBusyKey(null);
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
          <strong>{name(s.from)}</strong> {s.from === me ? 'owe' : 'owes'} <strong>{name(s.to)}</strong>
        </div>
        <div className="amount neg">{formatMoney(s.amount, currency)}</div>
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
        <h2>How to settle up</h2>
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
