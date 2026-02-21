#!/usr/bin/env python3
import subprocess
import os
import sys

# Change to frontend directory
frontend_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend')
os.chdir(frontend_dir)

print(f"Working directory: {os.getcwd()}")
print("Installing dependencies...")

# Install dependencies
result = subprocess.run(['npm', 'install'], capture_output=False)
if result.returncode != 0:
    print("Installation failed")
    sys.exit(1)

print("\nStarting Vite dev server on port 5173...")
print("Preview will be available at http://localhost:5173")

# Start dev server
subprocess.run(['npm', 'run', 'dev'])
