import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as Mac

const DISMISS_KEY = 'installHintDismissed';
const getDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};
const setDismissed = () => {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
};

/** Banner shown when a new version has been deployed. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new version every hour while the app is open
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version of Splitbox is available.</span>
      <button className="btn small-btn primary" onClick={() => updateServiceWorker(true)}>Update</button>
      <button className="icon-btn" aria-label="Later" onClick={() => setNeedRefresh(false)}>✕</button>
    </div>
  );
}

/** "Install app" card for the home page: native prompt on Android/desktop Chrome, instructions on iOS. */
export function InstallCard() {
  const [deferred, setDeferred] = useState(null);
  const [hidden, setHidden] = useState(() => isStandalone() || getDismissed());
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const ios = isIos();
  if (hidden || (!deferred && !ios)) return null;

  async function install() {
    if (ios) return setShowIosSteps(true);
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setHidden(true);
  }

  function dismiss() {
    setDismissed();
    setHidden(true);
  }

  return (
    <div className="card install-card">
      <img src="/icons/icon-192.png" alt="" width="44" height="44" />
      <div className="grow">
        <div className="strong">Install Splitbox</div>
        {showIosSteps ? (
          <div className="small">
            Tap <strong>Share</strong>{' '}
            <svg className="ios-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>{' '}
            in Safari, then <strong>Add to Home Screen</strong>.
          </div>
        ) : (
          <div className="muted small">Open it from your home screen like an app. Works offline.</div>
        )}
      </div>
      {!showIosSteps && <button className="btn small-btn primary" onClick={install}>Install</button>}
      <button className="icon-btn" aria-label="Dismiss" onClick={dismiss}>✕</button>
    </div>
  );
}
