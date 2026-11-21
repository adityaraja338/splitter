import { useState } from 'react';
import { addPerson, renamePerson, removePerson, updateTrip } from '../api.js';
import { isPersonUsed, formatMoney } from '../logic.js';
import { Avatar, CURRENCIES } from './ui.jsx';

export default function People({ trip, code, entries, me, stats, flash, onPickMe }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState(false);
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
    <div className="people-grid">
      <section className="card">
        <div className="summary-head">
          <h2>Cost per person</h2>
          <button className="link-btn" onClick={() => { setEditMode(!editMode); setEditingId(null); }}>
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
        <ul className="list cost-list">
          {trip.people.map((p) => {
            const cost = stats.spent[p.id] || 0;
            return (
              <li key={p.id} className="cost-row">
                <Avatar person={p} size={36} />
                {editingId === p.id ? (
                  <form className="row grow" onSubmit={(e) => { e.preventDefault(); saveRename(p.id); }}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus maxLength={40} aria-label="New name" />
                    <button className="btn small-btn">Save</button>
                  </form>
                ) : (
                  <>
                    <span className="grow strong ellipsis">
                      {p.name}{p.id === me && <span className="muted small"> (you)</span>}
                    </span>
                    {editMode ? (
                      <span className="row-actions">
                        <button className="icon-btn" aria-label={`Rename ${p.name}`} title="Rename" onClick={() => { setEditingId(p.id); setEditName(p.name); }}>✎</button>
                        <button className="icon-btn" aria-label={`Remove ${p.name}`} title="Remove" onClick={() => remove(p)}>🗑</button>
                      </span>
                    ) : (
                      <span className="cost-amt">{formatMoney(cost, cur)}</span>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {!editMode && trip.people.length > 0 && (
          <div className="cost-total">
            <span>Total</span>
            <span>{formatMoney(Object.values(stats.spent).reduce((a, b) => a + b, 0), cur)}</span>
          </div>
        )}
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
