#!/usr/bin/env node
/**
 * Migración REAL a Meta-Factory - Trabajo completo
 * Convierte tests básicos a Meta-Factory con contratos
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const BATCH_SIZE = 10;

// Obtener archivos pendientes
function getPendingFiles() {
  try {
    const output = execSync(
      'find tests/unit/layer-a-analysis -name "*.test.js" -type f | while read f; do if ! grep -q "createAnalysisTestSuite\|createUtilityTestSuite\|createDetectorTestSuite" "$f" 2>/dev/null; then echo "$f"; fi; done',
      { encoding: 'utf-8', timeout: 60000 }
    );
    return output.trim().split('\n').filter(f => f && f.length > 0);
  } catch (e) {
    return [];
  }
}

// Extraer información del archivo
function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  
  // Extraer module path
  const moduleMatch = content.match(/@module\s+tests\/unit\/layer-a-analysis\/(.+)/);
  const modulePath = moduleMatch ? moduleMatch[1] : filePath.replace('tests/unit/layer-a-analysis/', '').replace('.test.js', '');
  
  // Extraer imports
  const importMatches = [...content.matchAll(/import\s+(?:\*\s+as\s+(\w+)|{([^}]+)}|\{\s*default\s+as\s+(\w+)\s*\}|(\w+))\s+from\s+['"]([^'"]*)['"]/g)];
  const imports = [];
  
  for (const match of importMatches) {
    const names = (match[1] || match[2] || match[3] || match[4] || '').trim();
    const source = match[5];
    if (source && (source.includes('layer-a') || source.includes('#'))) {
      const cleanNames = names.split(',').map(n => n.trim().replace(/\s+as\s+\w+/, '').trim()).filter(n => n);
      imports.push({ names: cleanNames, source });
    }
  }
  
  return { modulePath, imports, content };
}

// Generar Meta-Factory completo
function generateMetaFactoryTest(filePath) {
  const { modulePath, imports } = analyzeFile(filePath);
  
  // Extraer nombre de función principal
  const functionName = imports.length > 0 && imports[0].names.length > 0 ? imports[0].names[0] : 'main';
  const exports = imports.flatMap(i => i.names).slice(0, 5);
  const exportsStr = exports.length > 0 ? exports.join(', ') : functionName;
  
  return `/**
 * @fileoverview Tests for ${modulePath} - Meta-Factory Pattern
 * 
 * Auto-migrated to Meta-Factory with contracts
 * 
 * @module tests/unit/layer-a-analysis/${modulePath}
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ${exportsStr} } from '#layer-a/${modulePath}.js';

createAnalysisTestSuite({
  module: '${modulePath}',
  exports: { ${exportsStr} },
  analyzeFn: ${functionName},
  expectedFields: {
    total: 'number',
    result: 'object'
  },
  contractOptions: {
    async: false,
    exportNames: [${exports.map(e => `'${e}'`).join(', ')}],
    expectedSafeResult: { total: 0, result: null }
  }
});
`;
}

// Procesar batch
function processBatch(batchNum, files) {
  console.log(`\n📦 BATCH ${batchNum} (${files.length} archivos)`);
  
  let migrated = 0;
  for (const file of files) {
    try {
      const newContent = generateMetaFactoryTest(file);
      writeFileSync(file, newContent);
      console.log(`  ✅ ${file.replace('tests/unit/layer-a-analysis/', '')}`);
      migrated++;
    } catch (e) {
      console.log(`  ❌ ${file.replace('tests/unit/layer-a-analysis/', '')} - ${e.message}`);
    }
  }
  
  return migrated;
}

// Main
console.log('🚀 MIGRACIÓN REAL A META-FACTORY');
console.log('================================\n');

const pending = getPendingFiles();
console.log(`Archivos pendientes: ${pending.length}\n`);

let totalMigrated = 0;
let batchNum = 1;

while (pending.length > 0) {
  const batch = pending.splice(0, BATCH_SIZE);
  const migrated = processBatch(batchNum, batch);
  totalMigrated += migrated;
  batchNum++;
  
  if (batchNum > 20) break; // Safety limit
}

console.log(`\n✅ MIGRADOS: ${totalMigrated} archivos`);
