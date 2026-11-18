import { useState } from 'react';
import { addEntry, updateEntry, deleteEntry } from '../api.js';
import { parseAmount, toInput } from '../logic.js';
import { Modal } from './ui.jsx';

const today = () => new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd in local time

export default function PaymentForm({ code, people, me, currency, entry, preset, onClose, flash }) {
  const isEdit = Boolean(entry);
  const init = entry || preset || {};
  const [from, setFrom] = useState(init.from || me || people[0]?.id || '');
  const [to, setTo] = useState(init.to || people.find((p) => p.id !== (init.from || me))?.id || '');
  const [amountStr, setAmountStr] = useState(init.amount ? toInput(init.amount) : '');
  const [date, setDate] = useState(entry?.date || today());
  const [note, setNote] = useState(entry?.note || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    const amount = parseAmount(amountStr);
    if (!from || !to) return setError('Choose both people');
    if (from === to) return setError('Pick two different people');
    if (!(amount > 0)) return setError('Enter a valid amount');
    setBusy(true);
    const data = { type: 'payment', from, to, amount, date, note: note.trim() };
    try {
      if (isEdit) await updateEntry(code, entry.id, { ...data, createdAt: entry.createdAt, createdBy: entry.createdBy ?? null });
      else addEntry(code, { ...data, createdBy: me || null }).catch((er) => flash(`Failed to save: ${er.message}`));
      flash(isEdit ? 'Payment updated' : 'Payment recorded');
      onClose();
    } catch (er) {
      setError(er.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this payment?')) return;
    await deleteEntry(code, entry.id);
    flash('Payment deleted');
    onClose();
  }

  const footer = (
    <>
      {isEdit && <button type="button" className="btn danger" onClick={remove}>Delete</button>}
      <span className="grow" />
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="payment-form" className="btn primary" disabled={busy}>{isEdit ? 'Save' : 'Record payment'}</button>
    </>
  );

  return (
    <Modal title={isEdit ? 'Edit payment' : 'Record a payment'} onClose={onClose} footer={footer}>
      <form id="payment-form" onSubmit={save}>
        <p className="muted small">Use this when someone pays back money they owe (cash, UPI, bank transfer…).</p>
        <div className="row">
          <label className="field grow">
            <span>From</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.id === me ? ' (you)' : ''}</option>)}
            </select>
          </label>
          <span className="arrow">→</span>
          <label className="field grow">
            <span>To</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.id === me ? ' (you)' : ''}</option>)}
            </select>
          </label>
        </div>
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
          <span>Note <span className="muted small">(optional)</span></span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="via UPI" maxLength={100} />
        </label>
        {error && <p className="error">{error}</p>}
      </form>
    </Modal>
  );
}
