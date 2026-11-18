import { useEffect, useMemo, useState } from 'react';
import { addEntry, updateEntry, deleteEntry } from '../api.js';
import { parseAmount, toInput, formatMoney, expenseShares, validateExpense } from '../logic.js';
import { Modal, Avatar } from './ui.jsx';

const today = () => new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd in local time

const MODES = [
  ['equal', 'Equally'],
  ['exact', 'Exact amounts'],
  ['shares', 'By shares'],
];

export default function ExpenseForm({ code, people, me, currency, entry, onClose, flash }) {
  const isEdit = Boolean(entry);
  const initParts = entry?.split?.parts || {};
  const [title, setTitle] = useState(entry?.title || '');
  const [amountStr, setAmountStr] = useState(entry ? toInput(entry.amount) : '');
  const [paidBy, setPaidBy] = useState(entry?.paidBy || me || people[0]?.id || '');
  const [date, setDate] = useState(entry?.date || today());
  const [mode, setMode] = useState(entry?.split?.mode || 'equal');
  const [included, setIncluded] = useState(() =>
    Object.fromEntries(people.map((p) => [p.id, entry ? Boolean(initParts[p.id]) : true])),
  );
  const [exact, setExact] = useState(() =>
    Object.fromEntries(people.map((p) => [p.id, entry?.split?.mode === 'exact' ? toInput(initParts[p.id] || 0) : ''])),
  );
  const [shares, setShares] = useState(() =>
    Object.fromEntries(people.map((p) => [p.id, entry?.split?.mode === 'shares' ? String(initParts[p.id] || '') : '1'])),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const amount = parseAmount(amountStr);

  const draft = useMemo(() => {
    const parts = {};
    for (const p of people) {
      if (!included[p.id]) continue;
      if (mode === 'equal') parts[p.id] = 1;
      else if (mode === 'exact') {
        const v = parseAmount(exact[p.id]);
        if (v > 0) parts[p.id] = v;
      } else {
        const v = Number(shares[p.id]);
        if (v > 0) parts[p.id] = Math.round(v * 100) / 100;
      }
    }
    return { type: 'expense', title: title.trim(), amount: Number.isNaN(amount) ? 0 : amount, paidBy, date, split: { mode, parts } };
  }, [people, included, mode, exact, shares, title, amount, paidBy, date]);

  useEffect(() => setError(''), [draft]);

  const computed = useMemo(() => (draft.amount > 0 ? expenseShares(draft) : {}), [draft]);
  const exactSum = mode === 'exact' ? Object.values(draft.split.parts).reduce((a, b) => a + b, 0) : 0;
  const allIncluded = people.every((p) => included[p.id]);

  async function save(e) {
    e.preventDefault();
    const err = validateExpense(draft);
    if (err) return setError(err);
    setBusy(true);
    try {
      if (isEdit) {
        await updateEntry(code, entry.id, { ...draft, createdAt: entry.createdAt, createdBy: entry.createdBy ?? null });
      } else {
        // Don't block the UI on the server round-trip; Firestore applies it locally right away.
        addEntry(code, { ...draft, createdBy: me || null }).catch((er) => flash(`Failed to save: ${er.message}`));
      }
      flash(isEdit ? 'Expense updated' : 'Expense added');
      onClose();
    } catch (er) {
      setError(er.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${entry.title}"? This can't be undone.`)) return;
    await deleteEntry(code, entry.id);
    flash('Expense deleted');
    onClose();
  }

  const footer = (
    <>
      {isEdit && <button type="button" className="btn danger" onClick={remove}>Delete</button>}
      <span className="grow" />
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="expense-form" className="btn primary" disabled={busy}>{isEdit ? 'Save' : 'Add'}</button>
    </>
  );

  return (
    <Modal title={isEdit ? 'Edit expense' : 'Add expense'} onClose={onClose} footer={footer}>
      <form id="expense-form" onSubmit={save}>
        <label className="field">
          <span>What was it for?</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner, taxi, hotel…" maxLength={100} autoFocus={!isEdit} />
        </label>
        <div className="row">
          <label className="field grow">
            <span>Amount</span>
            <div className="money-input">
              {currency && <span className="prefix">{currency}</span>}
              <input value={amountStr} onChange={(e) => setAmountStr(e.target.value)} inputMode="decimal" placeholder="0.00" />
            </div>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Paid by</span>
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.id === me ? ' (you)' : ''}</option>)}
          </select>
        </label>

        <div className="field">
          <span>Split</span>
          <div className="segmented">
            {MODES.map(([id, label]) => (
              <button type="button" key={id} className={mode === id ? 'active' : ''} onClick={() => setMode(id)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="split-head">
          <button
            type="button"
            className="link-btn"
            onClick={() => setIncluded(Object.fromEntries(people.map((p) => [p.id, !allIncluded])))}
          >
            {allIncluded ? 'Select none' : 'Select all'}
          </button>
          {mode === 'exact' && amount > 0 && (
            <span className={`small ${exactSum === amount ? 'pos' : 'neg'}`}>
              {exactSum === amount
                ? 'Adds up ✓'
                : exactSum < amount
                  ? `${formatMoney(amount - exactSum, currency)} left`
                  : `${formatMoney(exactSum - amount, currency)} over`}
            </span>
          )}
        </div>
        <ul className="split-list">
          {people.map((p) => (
            <li key={p.id} className={included[p.id] ? '' : 'off'}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={included[p.id]}
                  onChange={(e) => setIncluded({ ...included, [p.id]: e.target.checked })}
                />
                <Avatar person={p} size={26} />
                <span className="grow">{p.name}</span>
              </label>
              {mode === 'exact' && included[p.id] && (
                <div className="money-input small-input">
                  {currency && <span className="prefix">{currency}</span>}
                  <input
                    value={exact[p.id]}
                    onChange={(e) => setExact({ ...exact, [p.id]: e.target.value })}
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label={`${p.name}'s amount`}
                  />
                </div>
              )}
              {mode === 'shares' && included[p.id] && (
                <input
                  className="share-input"
                  value={shares[p.id]}
                  onChange={(e) => setShares({ ...shares, [p.id]: e.target.value })}
                  inputMode="decimal"
                  aria-label={`${p.name}'s shares`}
                />
              )}
              {mode !== 'exact' && included[p.id] && (
                <span className="muted small share-amt">{computed[p.id] ? formatMoney(computed[p.id], currency) : '–'}</span>
              )}
            </li>
          ))}
        </ul>
        {error && <p className="error">{error}</p>}
      </form>
    </Modal>
  );
}
