import { describe, it, expect } from 'vitest';
import {
  parseAmount, formatMoney, distribute, expenseShares, validateExpense,
  computeBalances, suggestSettlements, normalizeCode, generateCode,
} from './logic.js';

describe('amounts', () => {
  it('parses', () => {
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount('1,234.56')).toBe(123456);
    expect(parseAmount('.5')).toBe(50);
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('1.234')).toBeNaN();
    expect(parseAmount('')).toBeNaN();
  });
  it('formats', () => {
    expect(formatMoney(123456, '₹')).toBe('₹1,234.56');
    expect(formatMoney(-5)).toBe('−0.05');
  });
});

describe('splits', () => {
  it('distributes remainder cents', () => {
    const d = distribute(100, { a: 1, b: 1, c: 1 });
    expect(Object.values(d).reduce((x, y) => x + y)).toBe(100);
    expect(Object.values(d).sort()).toEqual([33, 33, 34]);
  });
  it('shares mode', () => {
    expect(expenseShares({ amount: 900, split: { mode: 'shares', parts: { a: 2, b: 1 } } })).toEqual({ a: 600, b: 300 });
  });
  it('exact mode validation', () => {
    const e = { title: 'x', amount: 1000, paidBy: 'a', split: { mode: 'exact', parts: { a: 400, b: 500 } } };
    expect(validateExpense(e)).toMatch(/short/);
    e.split.parts.b = 600;
    expect(validateExpense(e)).toBeNull();
  });
});

describe('balances', () => {
  const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const entries = [
    { type: 'expense', amount: 3000, paidBy: 'a', split: { mode: 'equal', parts: { a: 1, b: 1, c: 1 } } },
    { type: 'expense', amount: 600, paidBy: 'b', split: { mode: 'equal', parts: { b: 1, c: 1 } } },
  ];
  it('nets to zero and settles', () => {
    const { balances } = computeBalances(people, entries);
    expect(balances).toEqual({ a: 2000, b: -700, c: -1300 });
    const s = suggestSettlements(balances);
    expect(s).toEqual([{ from: 'c', to: 'a', amount: 1300 }, { from: 'b', to: 'a', amount: 700 }]);
    const after = computeBalances(people, [...entries, ...s.map((x) => ({ type: 'payment', ...x }))]);
    expect(Object.values(after.balances).every((v) => v === 0)).toBe(true);
  });
});

describe('codes', () => {
  it('normalizes links', () => {
    expect(normalizeCode('https://x.web.app/t/ab12cd34')).toBe('AB12CD34');
    expect(normalizeCode(' ab12-cd34 ')).toBe('AB12CD34');
    expect(generateCode()).toMatch(/^[2-9A-Z]{8}$/);
  });
});

import { pairwiseDebts } from './logic.js';
describe('pairwise debts', () => {
  it('keeps direct debts and agrees with net balances', () => {
    const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const entries = [
      { type: 'expense', amount: 3000, paidBy: 'a', split: { mode: 'equal', parts: { a: 1, b: 1, c: 1 } } },
      { type: 'expense', amount: 600, paidBy: 'b', split: { mode: 'equal', parts: { b: 1, c: 1 } } },
      { type: 'expense', amount: 400, paidBy: 'c', split: { mode: 'equal', parts: { a: 1, b: 1 } } },
      { type: 'payment', from: 'b', to: 'a', amount: 500 },
    ];
    const d = pairwiseDebts(entries);
    // b owes a 1000-500=500; c owes a 1000, a owes c 200 -> c owes a 800; c owes b 300, b owes c 200 -> c owes b 100
    expect(d).toEqual([
      { from: 'c', to: 'a', amount: 800 },
      { from: 'b', to: 'a', amount: 500 },
      { from: 'c', to: 'b', amount: 100 },
    ]);
    const { balances } = computeBalances(people, entries);
    const net = { a: 0, b: 0, c: 0 };
    for (const x of d) { net[x.from] -= x.amount; net[x.to] += x.amount; }
    expect(net).toEqual(balances);
  });
});
