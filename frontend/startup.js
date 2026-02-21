const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendDir = __dirname;

console.log('Installing dependencies...');
try {
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
} catch (e) {
  console.error('Installation failed:', e.message);
  process.exit(1);
}

console.log('Starting Vite dev server...');
execSync('npm run dev', { cwd: frontendDir, stdio: 'inherit' });
