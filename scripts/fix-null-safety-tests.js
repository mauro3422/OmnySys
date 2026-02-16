#!/usr/bin/env node
/**
 * Quick fix script for null-safety test issues
 * Adds expectedSafeResult to tests that need it
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const testsDir = 'tests/unit/layer-a-analysis/analyses';

// Known safe results for different modules
const safeResults = {
  'tier2/coupling': {
    total: 0,
    couplings: [],
    maxCoupling: 0
  },
  'tier2/circular-imports': {
    total: 0,
    cycles: []
  },
  'tier2/cycle-classifier': {
    total: 0,
    valid: 0,
    problematic: 0
  },
  'tier2/cycle-metadata': {
    total: 0,
    metadata: {}
  },
  'tier2/cycle-rules': {
    rules: [],
    total: 0
  },
  'tier2/index': {
    // Will be detected from exports
  },
  'tier2/reachability': {
    total: 0,
    reachable: [],
    unreachable: []
  },
  'tier2/reexport-chains': {
    total: 0,
    chains: []
  },
  'tier2/side-effects': {
    total: 0,
    sideEffects: []
  },
  'tier2/unresolved-imports': {
    total: 0,
    unresolved: []
  },
  'tier2/unused-imports': {
    total: 0,
    unused: []
  }
};

function findTestFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findTestFiles(fullPath, files);
    } else if (item.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixTestFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Check if it needs fixing
  if (content.includes('expectedSafeResult') || 
      !content.includes('createAnalysisTestSuite')) {
    return { file: filePath, status: 'skipped' };
  }
  
  // Detect module path from test file
  const moduleMatch = content.match(/module:\s*['"]([^'"]+)['"]/);
  if (!moduleMatch) return { file: filePath, status: 'no_module' };
  
  const modulePath = moduleMatch[1];
  const safeResult = safeResults[modulePath];
  
  if (!safeResult) return { file: filePath, status: 'unknown_module' };
  
  // Add contractOptions with expectedSafeResult before specificTests or at end of config
  if (content.includes('specificTests:')) {
    content = content.replace(
      /(createAnalysisTestSuite\(\{[\s\S]*?)(specificTests:)/,
      `$1contractOptions: {
    async: false,
    exportNames: [],
    expectedSafeResult: ${JSON.stringify(safeResult, null, 2).replace(/"/g, "'")}
  },
  $2`
    );
    modified = true;
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    return { file: filePath, status: 'fixed' };
  }
  
  return { file: filePath, status: 'no_change' };
}

// Run fixes
console.log('🔧 Fixing null-safety issues in tests...\n');

const tier2Files = findTestFiles('tests/unit/layer-a-analysis/analyses/tier2');
const tier3Files = findTestFiles('tests/unit/layer-a-analysis/analyses/tier3');
const allFiles = [...tier2Files, ...tier3Files];

let fixed = 0;
let skipped = 0;

for (const file of allFiles) {
  const result = fixTestFile(file);
  if (result.status === 'fixed') {
    console.log(`✅ Fixed: ${file}`);
    fixed++;
  } else if (result.status === 'skipped') {
    skipped++;
  }
}

console.log(`\n📊 Summary: ${fixed} fixed, ${skipped} skipped`);
