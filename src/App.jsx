import { usePath } from './router.js';
import { isConfigured } from './firebase.js';
import Home from './components/Home.jsx';
import Trip from './components/Trip.jsx';
import { UpdatePrompt } from './components/Pwa.jsx';

export default function App() {
  const path = usePath();
  if (!isConfigured) {
    return (
      <div className="page narrow">
        <div className="card">
          <h2>Firebase not configured</h2>
          <p className="muted">
            Copy <code>.env.example</code> to <code>.env</code> and fill in your Firebase web app config, then restart
            the dev server. See README.md.
          </p>
        </div>
      </div>
    );
  }
  const m = path.match(/^\/t\/([A-Za-z0-9]+)\/?$/);
  return (
    <>
      {m ? <Trip key={m[1].toUpperCase()} code={m[1].toUpperCase()} /> : <Home />}
      <UpdatePrompt />
    </>
  );
}
