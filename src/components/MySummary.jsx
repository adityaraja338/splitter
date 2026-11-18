import { useState } from 'react';
import { formatMoney } from '../logic.js';
import { markPaid } from '../settle.js';
import { Avatar } from './ui.jsx';

/** "Who do I owe / who owes me" card for the current person, shown on the trip's main screen. */
export default function MySummary({ me, byId, settlements, currency, code, flash, onPickMe, onEdit, onSeeAll }) {
  const [busy, setBusy] = useState(null);

  if (!me) {
    return (
      <section className="card my-summary">
        <h2>Your balance</h2>
        <p className="muted small">Choose who you are to see whom you owe and who owes you.</p>
        <button className="btn primary top-gap" onClick={onPickMe}>Choose who I am</button>
      </section>
    );
  }

  const iOwe = settlements.filter((s) => s.from === me);
  const owedToMe = settlements.filter((s) => s.to === me);
  const totalOwe = iOwe.reduce((a, s) => a + s.amount, 0);
  const totalOwed = owedToMe.reduce((a, s) => a + s.amount, 0);

  async function settle(s) {
    const key = `${s.from}-${s.to}`;
    setBusy(key);
    await markPaid({ code, s, me, byId, currency, flash });
    setBusy(null);
  }

  const row = (s, mine) => {
    const other = byId[mine ? s.to : s.from];
    const key = `${s.from}-${s.to}`;
    return (
      <li key={key} className="list-item">
        <Avatar person={other} size={34} />
        <div className="grow">
          {mine ? (
            <div>You owe <strong>{other?.name}</strong></div>
          ) : (
            <div><strong>{other?.name}</strong> owes you</div>
          )}
          <div className={`amount ${mine ? 'neg' : 'pos'}`}>{formatMoney(s.amount, currency)}</div>
        </div>
        <button className="btn small-btn" disabled={busy === key} onClick={() => settle(s)}>
          {mine ? 'I paid' : 'Got it'}
        </button>
        <button className="icon-btn" title="Record a different amount" aria-label="Record a different amount" onClick={() => onEdit(s)}>✎</button>
      </li>
    );
  };

  return (
    <section className="card my-summary">
      <div className="summary-head">
        <h2>Your balance</h2>
        {settlements.length > 0 && <button className="link-btn" onClick={onSeeAll}>Everyone →</button>}
      </div>
      {!iOwe.length && !owedToMe.length ? (
        <p className="muted">🎉 You're all settled up.</p>
      ) : (
        <>
          {iOwe.length > 0 && (
            <>
              <div className="group-label neg">You owe {formatMoney(totalOwe, currency)}</div>
              <ul className="list">{iOwe.map((s) => row(s, true))}</ul>
            </>
          )}
          {owedToMe.length > 0 && (
            <>
              <div className="group-label pos">You are owed {formatMoney(totalOwed, currency)}</div>
              <ul className="list">{owedToMe.map((s) => row(s, false))}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
