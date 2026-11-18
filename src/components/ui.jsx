import { useEffect } from 'react';

export const CURRENCIES = [
  ['₹', 'INR ₹'], ['$', 'USD $'], ['€', 'EUR €'], ['£', 'GBP £'], ['¥', 'JPY ¥'],
  ['A$', 'AUD A$'], ['C$', 'CAD C$'], ['S$', 'SGD S$'], ['AED ', 'AED'], ['฿', 'THB ฿'],
  ['Rp ', 'IDR Rp'], ['RM ', 'MYR RM'], ['CHF ', 'CHF'], ['', 'None'],
];

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Ordered so neighbouring people in a trip get clearly different hues
const COLORS = ['#0f766e', '#7c3aed', '#ea580c', '#2563eb', '#db2777', '#65a30d', '#0891b2', '#b45309', '#c026d3', '#4f46e5', '#be123c', '#4d7c0f'];

// Colour by position in the current trip, so people never share a colour (up to 12 people)
let tripOrder = {};
export function setTripPeople(people) {
  tripOrder = Object.fromEntries(people.map((p, i) => [p.id, i]));
}

export function colorFor(id = '') {
  if (id in tripOrder) return COLORS[tripOrder[id] % COLORS.length];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ person, size = 32 }) {
  const name = person?.name || '?';
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className="avatar" style={{ background: colorFor(person?.id), width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
