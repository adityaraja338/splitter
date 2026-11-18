import { addEntry } from './api.js';
import { formatMoney } from './logic.js';

/** Ask for confirmation, then record that `s.from` paid `s.to` `s.amount`. Returns true if recorded. */
export async function markPaid({ code, s, me, byId, currency, flash }) {
  const from = s.from === me ? 'you' : byId[s.from]?.name;
  const to = s.to === me ? 'you' : byId[s.to]?.name;
  if (!confirm(`Record that ${from} paid ${to} ${formatMoney(s.amount, currency)}?`)) return false;
  try {
    await addEntry(code, {
      type: 'payment', from: s.from, to: s.to, amount: s.amount,
      date: new Date().toLocaleDateString('en-CA'), note: '', createdBy: me || null,
    });
    flash('Payment recorded');
    return true;
  } catch (e) {
    flash(`Failed: ${e.message}`);
    return false;
  }
}
