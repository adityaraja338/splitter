import { useMemo, useState } from 'react';
import { updateTrip } from '../api.js';
import { formatMoney, suggestSettlements } from '../logic.js';
import { markPaid } from '../settle.js';
import { Avatar } from './ui.jsx';
import MySummary from './MySummary.jsx';

const PREVIEW = 5; // rows shown in "Everyone" before "Show all"

export default function Balances({ people, byId, stats, settlements, simplify, me, currency, code, flash, onRecord, onPickMe }) {
  const [busyKey, setBusyKey] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(null); // expanded person id in "Per person"
  const { balances, paid, spent } = stats;
  const name = (id) => byId[id]?.name || 'Someone';
  const who = (id, cap) => (id === me ? (cap ? 'You' : 'you') : name(id));

  // How many payments simplifying would need, to nudge big groups toward it
  const simplifiedCount = useMemo(() => suggestSettlements(balances).length, [balances]);

  // Per-person list: you first, then biggest balances (owed or owing) first
  const ordered = useMemo(
    () => [...people].sort((a, b) => (b.id === me) - (a.id === me) || Math.abs(balances[b.id] || 0) - Math.abs(balances[a.id] || 0)),
    [people, balances, me],
  );

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

  const visible = showAll ? settlements : settlements.slice(0, PREVIEW);

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
            {settlements.length > 0 && <span className="muted small">{settlements.length} payments</span>}
          </div>
          <label className="switch small top-gap">
            <input type="checkbox" checked={simplify} onChange={toggleSimplify} />
            <span>Simplify debts</span>
          </label>
          <p className="muted small">
            {simplify
              ? 'On: fewest payments to settle everyone. You might pay someone other than the person who paid for you.'
              : 'Off: each person pays back exactly whoever paid for them.'}
          </p>
          {!simplify && settlements.length - simplifiedCount >= 3 && (
            <button className="hint" onClick={toggleSimplify}>
              💡 Turn on <strong>Simplify debts</strong> to settle with {simplifiedCount} payments instead of {settlements.length}.
            </button>
          )}
          {settlements.length === 0 ? (
            <p className="muted top-gap">🎉 Everyone is settled up.</p>
          ) : (
            <>
              <ul className="list">
                {visible.map((s) => (
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
              {settlements.length > PREVIEW && (
                <button className="btn block top-gap" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Show less' : `Show all ${settlements.length}`}
                </button>
              )}
            </>
          )}
          <button className="link-btn top-gap" onClick={() => onRecord(null)}>+ Record some other payment</button>
        </section>
      </div>

      <section className="card col">
        <h2>Per person</h2>
        <p className="muted small">Tap a person to see whom they owe and who owes them.</p>
        <ul className="list">
          {ordered.map((p) => {
            const b = balances[p.id] || 0;
            const owes = settlements.filter((s) => s.from === p.id);
            const gets = settlements.filter((s) => s.to === p.id);
            const isOpen = open === p.id;
            return (
              <li key={p.id} className={`person-row ${isOpen ? 'open' : ''}`}>
                <button
                  className="person-head"
                  onClick={() => setOpen(isOpen ? null : p.id)}
                  aria-expanded={isOpen}
                >
                  <Avatar person={p} size={34} />
                  <span className="grow">
                    <span className="strong ellipsis block">
                      {p.name}{p.id === me && <span className="muted small"> (you)</span>}
                    </span>
                    <span className="muted small block">
                      {owes.length + gets.length === 0
                        ? 'settled up'
                        : [owes.length && `owes ${owes.length}`, gets.length && `gets from ${gets.length}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="right">
                    <span className={`amount block ${b > 0 ? 'pos' : b < 0 ? 'neg' : 'muted'}`}>
                      {b > 0 ? '+' : ''}{formatMoney(b, currency)}
                    </span>
                    <span className="muted small block">{b > 0 ? 'gets back' : b < 0 ? 'owes' : ''}</span>
                  </span>
                  <span className="chevron" aria-hidden="true">›</span>
                </button>
                {isOpen && (
                  <div className="person-detail">
                    <div className="detail-stats">
                      <div><span className="muted small block">Paid for group</span><strong>{formatMoney(paid[p.id] || 0, currency)}</strong></div>
                      <div><span className="muted small block">Their share</span><strong>{formatMoney(spent[p.id] || 0, currency)}</strong></div>
                    </div>
                    {owes.length > 0 && (
                      <>
                        <div className="group-label neg">Owes · {formatMoney(owes.reduce((a, s) => a + s.amount, 0), currency)}</div>
                        <ul className="mini-table">
                          {owes.map((s) => (
                            <li key={s.to}><span className="ellipsis">{who(s.to, true)}</span><span className="neg">{formatMoney(s.amount, currency)}</span></li>
                          ))}
                        </ul>
                      </>
                    )}
                    {gets.length > 0 && (
                      <>
                        <div className="group-label pos">Gets back · {formatMoney(gets.reduce((a, s) => a + s.amount, 0), currency)}</div>
                        <ul className="mini-table">
                          {gets.map((s) => (
                            <li key={s.from}><span className="ellipsis">{who(s.from, true)}</span><span className="pos">{formatMoney(s.amount, currency)}</span></li>
                          ))}
                        </ul>
                      </>
                    )}
                    {!owes.length && !gets.length && <p className="muted small">Nothing to settle 🎉</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
