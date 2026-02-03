#!/usr/bin/env node

/**
 * start-orchestrator.js
 * Script para iniciar el orchestrator fácilmente
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = process.argv[2] || process.cwd();

console.log('🚀 Starting CogniSystem Orchestrator...');
console.log(`📁 Project: ${rootPath}\n`);

const orchestratorPath = path.join(__dirname, '..', 'src', 'core', 'orchestrator-server.js');

const child = spawn('node', [orchestratorPath, rootPath], {
  stdio: 'inherit',
  detached: false
});

child.on('error', (error) => {
  console.error('Failed to start orchestrator:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Stopping orchestrator...');
  child.kill('SIGINT');
});
