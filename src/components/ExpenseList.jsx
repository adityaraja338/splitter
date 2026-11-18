import { expenseShares, formatMoney } from '../logic.js';
import { Avatar } from './ui.jsx';

function dateLabel(d) {
  if (!d) return 'Undated';
  const dt = new Date(`${d}T00:00:00`);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(dt, today)) return 'Today';
  if (same(dt, y)) return 'Yesterday';
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: dt.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export default function ExpenseList({ entries, byId, me, currency, onOpen, onAdd, hasPeople }) {
  if (!entries.length) {
    return (
      <div className="empty">
        <div className="empty-icon">🧾</div>
        <p>No expenses yet.</p>
        <button className="btn primary" onClick={onAdd}>{hasPeople ? 'Add the first expense' : 'Add people first'}</button>
      </div>
    );
  }
  const sorted = [...entries].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
  );
  const groups = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }
  const name = (id) => byId[id]?.name || 'Someone (removed)';

  return (
    <div className="expense-list">
      {groups.map((g) => (
        <section key={g.date || 'none'}>
          <h4 className="date-head">{dateLabel(g.date)}</h4>
          <ul className="list card flush">
            {g.items.map((e) => {
              if (e.type === 'payment') {
                return (
                  <li key={e.id} className="list-item clickable payment" onClick={() => onOpen(e)}>
                    <span className="pay-icon">💸</span>
                    <div className="grow">
                      <div><strong>{name(e.from)}</strong> paid <strong>{name(e.to)}</strong></div>
                      {e.note && <div className="muted small">{e.note}</div>}
                    </div>
                    <div className="amount">{formatMoney(e.amount, currency)}</div>
                  </li>
                );
              }
              const shares = expenseShares(e);
              const n = Object.keys(shares).length;
              let mine = null;
              if (me) {
                const owed = shares[me] || 0;
                const paid = e.paidBy === me ? e.amount : 0;
                const net = paid - owed;
                if (net > 0) mine = <span className="pos">you lent {formatMoney(net, currency)}</span>;
                else if (net < 0) mine = <span className="neg">you owe {formatMoney(-net, currency)}</span>;
                else if (owed) mine = <span className="muted">your share {formatMoney(owed, currency)}</span>;
                else mine = <span className="muted">not involved</span>;
              }
              return (
                <li key={e.id} className="list-item clickable" onClick={() => onOpen(e)}>
                  <Avatar person={byId[e.paidBy] || { id: e.paidBy, name: '?' }} />
                  <div className="grow">
                    <div className="strong">{e.title}</div>
                    <div className="muted small">
                      {e.paidBy === me ? 'You' : name(e.paidBy)} paid · {n === Object.keys(byId).length ? 'everyone' : `${n} ${n === 1 ? 'person' : 'people'}`}
                      {e.split?.mode !== 'equal' && ` · ${e.split?.mode === 'exact' ? 'exact amounts' : 'by shares'}`}
                    </div>
                  </div>
                  <div className="right">
                    <div className="amount">{formatMoney(e.amount, currency)}</div>
                    {mine && <div className="small">{mine}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
