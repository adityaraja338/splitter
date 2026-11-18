import { useState } from 'react';
import { updateTrip } from '../api.js';
import { formatMoney } from '../logic.js';
import { markPaid } from '../settle.js';
import { Avatar } from './ui.jsx';
import MySummary from './MySummary.jsx';

export default function Balances({ people, byId, stats, settlements, simplify, me, currency, code, flash, onRecord, onPickMe }) {
  const [busyKey, setBusyKey] = useState(null);
  const { balances, paid, spent } = stats;
  const max = Math.max(1, ...Object.values(balances).map(Math.abs));
  const name = (id) => byId[id]?.name || 'Someone';
  const who = (id, cap) => (id === me ? (cap ? 'You' : 'you') : name(id));

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

  return (
    <div className="balances-grid">
      <div className="col">
      <MySummary
        me={me}
        byId={byId}
        settlements={settlements}
        currency={currency}
        code={code}
        flash={flash}
        onPickMe={onPickMe}
        onEdit={onRecord}
      />

      <section className="card">
        <div className="summary-head">
          <h2>Everyone · who owes whom</h2>
        </div>
        <label className="switch small top-gap">
          <input type="checkbox" checked={simplify} onChange={toggleSimplify} />
          <span>Simplify debts</span>
        </label>
        <p className="muted small">
          {simplify
            ? 'On: fewest payments to settle everyone. Debts may be passed along, so you might pay someone other than the person who paid for you.'
            : 'Off: each person pays back exactly whoever paid for them.'}
        </p>
        {settlements.length === 0 ? (
          <p className="muted top-gap">🎉 Everyone is settled up.</p>
        ) : (
          <ul className="list">
            {settlements.map((s) => (
              <li key={`${s.from}-${s.to}`} className="list-item settle">
                <Avatar person={byId[s.from]} size={30} />
                <div className="grow">
                  <div>
                    <strong>{who(s.from, true)}</strong> {s.from === me ? 'owe' : 'owes'} <strong>{who(s.to)}</strong>
                  </div>
                  <div className={`amount ${s.to === me ? 'pos' : 'neg'}`}>{formatMoney(s.amount, currency)}</div>
                </div>
                <div className="row-actions">
                  <button className="btn small-btn" disabled={busyKey === `${s.from}-${s.to}`} onClick={() => settle(s)}>
                    Mark paid
                  </button>
                  <button className="icon-btn" title="Record a different amount" aria-label="Record a different amount" onClick={() => onRecord(s)}>✎</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button className="link-btn top-gap" onClick={() => onRecord(null)}>+ Record some other payment</button>
      </section>
      </div>

      <section className="card col">
        <h2>Per person</h2>
        <ul className="list">
          {people.map((p) => {
            const b = balances[p.id] || 0;
            const owes = settlements.filter((s) => s.from === p.id);
            const gets = settlements.filter((s) => s.to === p.id);
            return (
              <li key={p.id} className="balance-row">
                <div className="balance-name">
                  <Avatar person={p} size={26} />
                  <span>{p.name}{p.id === me && <span className="muted small"> (you)</span>}</span>
                </div>
                <div className={`balance-amt ${b > 0 ? 'pos' : b < 0 ? 'neg' : 'muted'}`}>
                  {b > 0 ? '+' : ''}{formatMoney(b, currency)}
                </div>
                <div className="bar-wrap">
                  <div className="bar-mid" />
                  <div
                    className={`bar ${b >= 0 ? 'bar-pos' : 'bar-neg'}`}
                    style={{ width: `${(Math.abs(b) / max) * 50}%`, [b >= 0 ? 'left' : 'right']: '50%' }}
                  />
                </div>
                <div className="balance-detail small">
                  <div className="muted">
                    paid {formatMoney(paid[p.id] || 0, currency)} · their share {formatMoney(spent[p.id] || 0, currency)}
                  </div>
                  {owes.map((s) => (
                    <div key={`o${s.to}`} className="neg">→ owes {who(s.to)} {formatMoney(s.amount, currency)}</div>
                  ))}
                  {gets.map((s) => (
                    <div key={`g${s.from}`} className="pos">← gets {formatMoney(s.amount, currency)} from {who(s.from)}</div>
                  ))}
                  {!owes.length && !gets.length && <div className="muted">settled up</div>}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="muted small">
          Green = gets money back, red = owes money. "Paid" is what they paid for the group, "their share" is what they used.
          Payments already made are included.
        </p>
      </section>
    </div>
  );
}
