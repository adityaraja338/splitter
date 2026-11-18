// Per-device preferences (no accounts): which person you are in each trip, and recently opened trips.
const safe = (fn, fallback) => {
  try { return fn(); } catch { return fallback; }
};

export function getMe(code) {
  return safe(() => localStorage.getItem(`me:${code}`), null);
}
export function setMe(code, personId) {
  safe(() => (personId ? localStorage.setItem(`me:${code}`, personId) : localStorage.removeItem(`me:${code}`)));
}

export function getRecent() {
  return safe(() => JSON.parse(localStorage.getItem('recentTrips') || '[]'), []);
}
export function rememberTrip(code, name) {
  const list = getRecent().filter((t) => t.code !== code);
  list.unshift({ code, name, at: Date.now() });
  safe(() => localStorage.setItem('recentTrips', JSON.stringify(list.slice(0, 20))));
}
export function forgetTrip(code) {
  safe(() => localStorage.setItem('recentTrips', JSON.stringify(getRecent().filter((t) => t.code !== code))));
}
