import { useState } from 'react';
import { addPerson } from '../api.js';
import { formatMoney } from '../logic.js';
import { Avatar } from './ui.jsx';

/** Horizontal list of trip members with a quick "+ Add" right on the main screen. */
export default function PeopleStrip({ people, me, balances, code, currency, flash }) {
  const [adding, setAdding] = useState(people.length === 0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await addPerson(code, name);
      flash(`${name.trim()} added`);
      setName(''); // stay open so several people can be added in a row
    } catch (er) {
      setError(er.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="people-strip card">
      <div className="strip-head">
        <span className="small muted strong">People · {people.length}</span>
      </div>
      <div className="strip">
        {people.map((p) => {
          const b = balances[p.id] || 0;
          return (
            <div key={p.id} className="strip-person" title={`${p.name}: ${formatMoney(b, currency)}`}>
              <Avatar person={p} size={40} />
              <span className="strip-name">{p.id === me ? 'You' : p.name}</span>
              <span className={`strip-bal ${b > 0 ? 'pos' : b < 0 ? 'neg' : 'muted'}`}>
                {b === 0 ? 'settled' : `${b > 0 ? '+' : ''}${formatMoney(b, currency)}`}
              </span>
            </div>
          );
        })}
        {!adding && (
          <button className="strip-person strip-add" onClick={() => setAdding(true)} aria-label="Add person">
            <span className="add-circle">＋</span>
            <span className="strip-name">Add</span>
          </button>
        )}
      </div>
      {adding && (
        <form className="row top-gap" onSubmit={submit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            maxLength={40}
            autoFocus
            aria-label="New person's name"
          />
          <button className="btn primary" disabled={busy || !name.trim()}>Add</button>
          {people.length > 0 && (
            <button type="button" className="btn" onClick={() => { setAdding(false); setName(''); setError(''); }}>Done</button>
          )}
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
