import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const frontendDir = dirname(__filename);

console.log('Installing dependencies...');
try {
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
} catch (e) {
  console.error('Installation failed:', e.message);
  process.exit(1);
}

console.log('Starting Vite dev server...');
try {
  execSync('npm run dev', { cwd: frontendDir, stdio: 'inherit' });
} catch (e) {
  console.error('Server error:', e.message);
  process.exit(1);
}
