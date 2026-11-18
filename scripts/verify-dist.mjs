// Deploy guard: refuse to ship a build that points at the local Firestore emulator.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/assets';
const bad = readdirSync(dir)
  .filter((f) => f.endsWith('.js'))
  .filter((f) => /VITE_USE_EMULATOR:`true`|VITE_USE_EMULATOR:"true"/.test(readFileSync(join(dir, f), 'utf8')));

if (bad.length) {
  console.error(`\n✖ Build is configured for the Firestore emulator (${bad.join(', ')}).`);
  console.error('  Remove .env.local (or set VITE_USE_EMULATOR=false) and deploy again.\n');
  process.exit(1);
}
console.log('✔ dist uses the production Firebase project');
