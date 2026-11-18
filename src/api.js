import {
  doc, collection, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, runTransaction, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { generateCode, newId } from './logic.js';

const tripRef = (code) => doc(db, 'trips', code);
const entriesRef = (code) => collection(db, 'trips', code, 'entries');

export async function createTrip({ name, currency, people }) {
  // Retry in the (astronomically unlikely) event of a code collision.
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const ref = tripRef(code);
    const created = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false;
      tx.set(ref, {
        name: name.trim(),
        currency,
        people: people.map((n) => ({ id: newId(), name: n.trim() })),
        createdAt: serverTimestamp(),
      });
      return true;
    });
    if (created) return code;
  }
  throw new Error('Could not create trip, please try again');
}

export async function tripExists(code) {
  const snap = await getDoc(tripRef(code));
  return snap.exists();
}

/**
 * onData(trip, { fromCache }): trip is null when the document doesn't exist.
 * A missing trip with fromCache=true means "couldn't reach the server yet", not "not found".
 */
export function watchTrip(code, onData, onError) {
  return onSnapshot(
    tripRef(code),
    { includeMetadataChanges: true },
    (snap) => onData(snap.exists() ? { code, ...snap.data() } : null, { fromCache: snap.metadata.fromCache }),
    onError,
  );
}

export function watchEntries(code, onData, onError) {
  return onSnapshot(
    query(entriesRef(code), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
    onError,
  );
}

export function updateTrip(code, fields) {
  return updateDoc(tripRef(code), fields);
}

/** Mutate the people list atomically so concurrent edits from different phones don't clobber each other. */
async function mutatePeople(code, fn) {
  return runTransaction(db, async (tx) => {
    const ref = tripRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Trip not found');
    const people = fn([...(snap.data().people || [])]);
    tx.update(ref, { people });
  });
}

export function addPerson(code, name) {
  const id = newId();
  return mutatePeople(code, (people) => {
    if (people.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`${name.trim()} is already in this trip`);
    }
    return [...people, { id, name: name.trim() }];
  }).then(() => id);
}

export function renamePerson(code, id, name) {
  return mutatePeople(code, (people) => people.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)));
}

export function removePerson(code, id) {
  return mutatePeople(code, (people) => people.filter((p) => p.id !== id));
}

export function addEntry(code, entry) {
  return addDoc(entriesRef(code), { ...entry, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function updateEntry(code, id, entry) {
  // setDoc (not merge) so switching split modes doesn't leave stale parts behind
  const { id: _omit, ...rest } = entry;
  return setDoc(doc(entriesRef(code), id), { ...rest, updatedAt: serverTimestamp() });
}

export function deleteEntry(code, id) {
  return deleteDoc(doc(entriesRef(code), id));
}
