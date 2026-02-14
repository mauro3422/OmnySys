#!/usr/bin/env node
/**
 * @fileoverview run-tests.js
 * 
 * Test runner para OmnySys - Organizado por fases
 * Usage: node run-tests.js [unit|integration|layer-a|all]
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testType = process.argv[2] || 'all';

const testSuites = {
  unit: [
    'tests/unit/config.test.js',
    'tests/unit/architecture-utils.test.js'
  ],
  'layer-a': [
    'tests/unit/layer-a/parser/parser.test.js',
    'tests/unit/layer-a/scanner.test.js',
    'tests/unit/layer-a/graph/graph.test.js'
  ],
  integration: [
    'tests/integration/smoke.test.js'
  ]
};

function getTestFiles() {
  switch (testType) {
    case 'unit':
      return testSuites.unit;
    case 'layer-a':
      return [...testSuites.unit, ...testSuites['layer-a']];
    case 'integration':
      return testSuites.integration;
    case 'all':
      return [...testSuites.unit, ...testSuites['layer-a'], ...testSuites.integration];
    default:
      console.log(`Unknown test type: ${testType}`);
      console.log('Usage: node run-tests.js [unit|layer-a|integration|all]');
      process.exit(1);
  }
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
  const testFiles = getTestFiles();
  
  console.log('\n🧪 OmnySys Test Suite');
  console.log(`Running: ${testType} tests`);
  console.log(`Files: ${testFiles.length}\n`);
  
  let failed = false;
  let passed = 0;
  
  for (const file of testFiles) {
    try {
      await runTest(file);
      passed++;
    } catch (error) {
      console.error(`\n❌ ${error.message}`);
      failed = true;
      // Continue with other tests even if one fails
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed}/${testFiles.length} test files passed`);
  
  if (failed) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

main();
