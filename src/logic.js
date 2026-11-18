// Pure money logic. All amounts are integer minor units (cents/paise).

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateCode(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(input) {
  let s = String(input || '').trim();
  // Accept a full share link as well as a bare code
  const m = s.match(/\/t\/([A-Za-z0-9]+)/);
  if (m) s = m[1];
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function newId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Parse a user-entered amount like "12.5" or "1,234.56" into minor units. Returns NaN if invalid. */
export function parseAmount(str) {
  const s = String(str ?? '').replace(/[,\s]/g, '');
  if (!/^\d*(\.\d{0,2})?$/.test(s) || s === '' || s === '.') return NaN;
  const [whole, frac = ''] = s.split('.');
  return Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2));
}

export function toInput(cents) {
  if (!cents) return '';
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return frac ? `${whole}.${String(frac).padStart(2, '0')}` : String(whole);
}

export function formatMoney(cents, currency = '') {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100).toLocaleString('en-US');
  const frac = String(abs % 100).padStart(2, '0');
  return `${neg ? '−' : ''}${currency}${whole}.${frac}`;
}

/**
 * Distribute `total` across `weights` ({id: weight>0}) proportionally,
 * using largest-remainder so the parts always sum exactly to total.
 */
export function distribute(total, weights) {
  const ids = Object.keys(weights).filter((id) => weights[id] > 0);
  const sum = ids.reduce((a, id) => a + weights[id], 0);
  const out = {};
  if (!ids.length || sum <= 0) return out;
  let assigned = 0;
  const rems = ids.map((id) => {
    const exact = (total * weights[id]) / sum;
    const base = Math.floor(exact);
    out[id] = base;
    assigned += base;
    return { id, rem: exact - base };
  });
  // Stable tie-break by original order
  rems.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < total - assigned; i++) out[rems[i % rems.length].id] += 1;
  return out;
}

/** Returns {personId: cents owed} for an expense entry. */
export function expenseShares(expense) {
  const { amount, split } = expense;
  const parts = split?.parts || {};
  if (split?.mode === 'exact') {
    const out = {};
    for (const [id, v] of Object.entries(parts)) if (v > 0) out[id] = v;
    return out;
  }
  if (split?.mode === 'shares') return distribute(amount, parts);
  // equal
  const eq = {};
  for (const [id, v] of Object.entries(parts)) if (v) eq[id] = 1;
  return distribute(amount, eq);
}

/** Validate a draft expense; returns error string or null. */
export function validateExpense(e) {
  if (!e.title?.trim()) return 'Give the expense a name';
  if (!Number.isInteger(e.amount) || e.amount <= 0) return 'Enter a valid amount';
  if (!e.paidBy) return 'Choose who paid';
  const shares = expenseShares(e);
  const ids = Object.keys(shares);
  if (!ids.length) return 'Select at least one person involved';
  const sum = ids.reduce((a, id) => a + shares[id], 0);
  if (sum !== e.amount) {
    const diff = e.amount - sum;
    return diff > 0
      ? `Split amounts are ${formatMoney(diff)} short of the total`
      : `Split amounts exceed the total by ${formatMoney(-diff)}`;
  }
  return null;
}

/**
 * Net balance per person: positive = should receive, negative = owes.
 * Payments: `from` paid `to`, so from's balance goes up, to's goes down.
 */
export function computeBalances(people, entries) {
  const bal = {};
  const paid = {};
  const spent = {};
  for (const p of people) {
    bal[p.id] = 0;
    paid[p.id] = 0;
    spent[p.id] = 0;
  }
  const add = (obj, id, v) => {
    obj[id] = (obj[id] || 0) + v;
  };
  for (const e of entries) {
    if (e.type === 'payment') {
      add(bal, e.from, e.amount);
      add(bal, e.to, -e.amount);
    } else {
      add(bal, e.paidBy, e.amount);
      add(paid, e.paidBy, e.amount);
      for (const [id, v] of Object.entries(expenseShares(e))) {
        add(bal, id, -v);
        add(spent, id, v);
      }
    }
  }
  return { balances: bal, paid, spent };
}

/** Greedy minimal-ish settlement: repeatedly match the largest debtor with the largest creditor. */
export function suggestSettlements(balances) {
  const debtors = [];
  const creditors = [];
  for (const [id, v] of Object.entries(balances)) {
    if (v < 0) debtors.push({ id, amt: -v });
    else if (v > 0) creditors.push({ id, amt: v });
  }
  const out = [];
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.amt - a.amt);
    creditors.sort((a, b) => b.amt - a.amt);
    const d = debtors[0];
    const c = creditors[0];
    const amt = Math.min(d.amt, c.amt);
    out.push({ from: d.id, to: c.id, amount: amt });
    d.amt -= amt;
    c.amt -= amt;
    if (!d.amt) debtors.shift();
    if (!c.amt) creditors.shift();
  }
  return out;
}

export function isPersonUsed(personId, entries) {
  return entries.some((e) =>
    e.type === 'payment'
      ? e.from === personId || e.to === personId
      : e.paidBy === personId || (e.split?.parts && e.split.parts[personId]),
  );
}

/**
 * Direct (un-simplified) debts: who owes whom based on who actually paid for what,
 * netted per pair and reduced by recorded payments. Returns [{from, to, amount}].
 */
export function pairwiseDebts(entries) {
  const owe = {}; // owe[a][b] = amount a owes b (before netting)
  const add = (a, b, v) => {
    if (a === b || !v) return;
    owe[a] ??= {};
    owe[a][b] = (owe[a][b] || 0) + v;
  };
  for (const e of entries) {
    if (e.type === 'payment') add(e.to, e.from, e.amount); // paying back = the receiver now "owes" it back
    else for (const [id, v] of Object.entries(expenseShares(e))) add(id, e.paidBy, v);
  }
  const out = [];
  const seen = new Set();
  for (const a of Object.keys(owe)) {
    for (const b of Object.keys(owe[a])) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const net = (owe[a]?.[b] || 0) - (owe[b]?.[a] || 0);
      if (net > 0) out.push({ from: a, to: b, amount: net });
      else if (net < 0) out.push({ from: b, to: a, amount: -net });
    }
  }
  return out.sort((x, y) => y.amount - x.amount);
}
