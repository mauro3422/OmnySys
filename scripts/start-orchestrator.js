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

logger.info('🚀 Starting OmnySys Orchestrator...');
logger.info(`📁 Project: ${rootPath}\n`);

const orchestratorPath = path.join(__dirname, '..', 'src', 'core', 'orchestrator-server.js');

const child = spawn('node', [orchestratorPath, rootPath], {
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger('OmnySys:start:orchestrator');


  stdio: 'inherit',
  detached: false
});

child.on('error', (error) => {
  logger.error('Failed to start orchestrator:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  logger.info('\n👋 Stopping orchestrator...');
  child.kill('SIGINT');
});
