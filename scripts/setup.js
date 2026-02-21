const { spawn } = require('child_process');
const path = require('path');

// Calculate paths
const scriptPath = __filename;
const scriptsDir = path.dirname(scriptPath);
const projectRoot = path.dirname(scriptsDir);
const frontendDir = path.join(projectRoot, 'frontend');

console.log('[v0] Project root:', projectRoot);
console.log('[v0] Frontend directory:', frontendDir);

// Step 1: Install dependencies
console.log('[v0] Installing npm dependencies...');
const npmInstall = spawn('npm', ['install'], { 
  cwd: frontendDir,
  stdio: 'inherit'
});

npmInstall.on('close', (code) => {
  if (code !== 0) {
    console.error('[v0] npm install failed with code', code);
    process.exit(1);
  }
  
  console.log('[v0] Dependencies installed successfully');
  console.log('[v0] Starting Vite dev server on port 5173...');
  
  // Step 2: Start dev server
  const npmDev = spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: 'inherit'
  });
  
  npmDev.on('close', (code) => {
    if (code !== 0) {
      console.error('[v0] Dev server failed with code', code);
      process.exit(1);
    }
  });
});
