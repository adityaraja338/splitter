import { useState } from 'react';
import { addPerson, renamePerson, removePerson, updateTrip } from '../api.js';
import { isPersonUsed, formatMoney } from '../logic.js';
import { Avatar, CURRENCIES } from './ui.jsx';

export default function People({ trip, code, entries, me, stats, flash, onPickMe }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [tripName, setTripName] = useState(trip.name);
  const cur = trip.currency ?? '';

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await addPerson(code, name);
      setName('');
    } catch (er) {
      setError(er.message);
    }
  }

  async function saveRename(id) {
    if (editName.trim()) {
      try {
        await renamePerson(code, id, editName);
      } catch (er) {
        flash(er.message);
      }
    }
    setEditingId(null);
  }

  async function remove(p) {
    if (isPersonUsed(p.id, entries)) {
      flash(`${p.name} is part of some expenses. Delete or edit those first.`);
      return;
    }
    if (!confirm(`Remove ${p.name} from this trip?`)) return;
    await removePerson(code, p.id);
  }

  async function saveTrip(fields) {
    try {
      await updateTrip(code, fields);
      flash('Saved');
    } catch (er) {
      flash(er.message);
    }
  }

  return (
    <div>
      <section className="card">
        <h2>People</h2>
        <ul className="list">
          {trip.people.map((p) => (
            <li key={p.id} className="list-item">
              <Avatar person={p} />
              {editingId === p.id ? (
                <form className="row grow" onSubmit={(e) => { e.preventDefault(); saveRename(p.id); }}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus maxLength={40} />
                  <button className="btn small-btn">Save</button>
                </form>
              ) : (
                <>
                  <div className="grow">
                    <div className="strong">{p.name}{p.id === me && <span className="muted small"> (you)</span>}</div>
                    <div className="muted small">balance {formatMoney(stats.balances[p.id] || 0, cur)}</div>
                  </div>
                  <button className="icon-btn" aria-label={`Rename ${p.name}`} title="Rename" onClick={() => { setEditingId(p.id); setEditName(p.name); }}>✎</button>
                  <button className="icon-btn" aria-label={`Remove ${p.name}`} title="Remove" onClick={() => remove(p)}>🗑</button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form className="row top-gap" onSubmit={add}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a person" maxLength={40} />
          <button className="btn" disabled={!name.trim()}>Add</button>
        </form>
        {error && <p className="error">{error}</p>}
        <button className="link-btn top-gap" onClick={onPickMe}>{me ? 'Change who you are' : 'Choose who you are'}</button>
      </section>

      <section className="card">
        <h2>Trip settings</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (tripName.trim()) saveTrip({ name: tripName.trim() }); }}>
          <input value={tripName} onChange={(e) => setTripName(e.target.value)} maxLength={80} aria-label="Trip name" />
          <button className="btn" disabled={!tripName.trim() || tripName.trim() === trip.name}>Rename</button>
        </form>
        <label className="field top-gap">
          <span>Currency</span>
          <select value={cur} onChange={(e) => saveTrip({ currency: e.target.value })}>
            {CURRENCIES.map(([sym, label]) => <option key={label} value={sym}>{label}</option>)}
          </select>
        </label>
        <p className="muted small">
          Trip code <span className="mono">{code}</span>. Anyone with the link can view and edit this trip, so only share it with
          your group.
        </p>
      </section>
    </div>
  );
}
