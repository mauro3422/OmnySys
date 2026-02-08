#!/usr/bin/env node

/**
 * @fileoverview run-tests.js
 * 
 * Simple test runner for OmnySys
 * Usage: node run-tests.js [unit|integration|all]
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testType = process.argv[2] || 'all';

const testFiles = [];

if (testType === 'unit' || testType === 'all') {
  testFiles.push(
    'tests/unit/config.test.js',
    'tests/unit/architecture-utils.test.js'
  );
}

if (testType === 'integration' || testType === 'all') {
  testFiles.push('tests/integration/smoke.test.js');
}

async function runTest(file) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Running ${file}...`);
    console.log('=' .repeat(50));
    
    const child = spawn('node', [file], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test ${file} failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function main() {
  console.log('\n🧪 OmnySys Test Suite');
  console.log(`Running: ${testType} tests\n`);
  
  let failed = false;
  
  for (const file of testFiles) {
    try {
      await runTest(file);
    } catch (error) {
      console.error(`\n❌ ${error.message}`);
      failed = true;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  if (failed) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

main();
