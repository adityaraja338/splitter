import { useState } from 'react';
import { addPerson } from '../api.js';
import { Modal, Avatar } from './ui.jsx';

export default function WhoAreYou({ people, code, current, onPick, onClose, flash }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function addMe(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const id = await addPerson(code, name);
      flash(`Welcome, ${name.trim()}!`);
      onPick(id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Who are you?" onClose={onClose}>
      <p className="muted small">Pick your name so we can show what you owe. This is only remembered on this device.</p>
      <div className="pick-grid">
        {people.map((p) => (
          <button key={p.id} className={`pick ${current === p.id ? 'selected' : ''}`} onClick={() => onPick(p.id)}>
            <Avatar person={p} size={40} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <form onSubmit={addMe} className="row top-gap">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Not listed? Add your name" maxLength={40} />
        <button className="btn" disabled={busy || !name.trim()}>Add me</button>
      </form>
      {error && <p className="error">{error}</p>}
      {current && (
        <button className="link-btn top-gap" onClick={() => onPick(null)}>I'm just looking (don't pick anyone)</button>
      )}
    </Modal>
  );
}
