/**
 * @fileoverview audit-files-without-atoms.js
 * 
 * Analyzes files without extracted atoms using the NEW CULTURE classification.
 * Now distinguishes between EXPECTED files without atoms (gatekeepers, laws) 
 * and PROBLEMATIC files (citizens without atoms).
 * 
 * Usage: node scripts/audit-files-without-atoms.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

/**
 * Reads all files from storage
 */
async function readAllFiles() {
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const files = new Map();
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            const filePath = data.path || data.filePath;
            if (filePath) {
              files.set(filePath, data);
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(filesDir);
  return files;
}

/**
 * Main
 */
async function main() {
  console.log('\n🔍 Analysis of Files by Culture');
  console.log('═'.repeat(70));
  
  const files = await readAllFiles();
  console.log(`\n📁 Total files in storage: ${files.size}`);
  
  // Group by culture
  const byCulture = {
    citizen: { withAtoms: 0, withoutAtoms: [] },
    auditor: { withAtoms: 0, withoutAtoms: [] },
    gatekeeper: { withAtoms: 0, withoutAtoms: [] },
    laws: { withAtoms: 0, withoutAtoms: [] },
    script: { withAtoms: 0, withoutAtoms: [] },
    unknown: { withAtoms: 0, withoutAtoms: [] }
  };
  
  for (const [filePath, data] of files) {
    const culture = data.culture || 'unknown';
    const definitions = data.definitions || [];
    const objectExports = data.objectExports || [];
    const hasAtoms = definitions.length > 0;
    const hasParticles = objectExports.length > 0;
    
    if (!byCulture[culture]) {
      byCulture[culture] = { withAtoms: 0, withoutAtoms: [] };
    }
    
    if (hasAtoms) {
      byCulture[culture].withAtoms++;
    } else {
      byCulture[culture].withoutAtoms.push({
        filePath,
        hasParticles,
        data
      });
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 BY CULTURE:');
  console.log('─'.repeat(70));
  
  const cultureSymbols = {
    citizen: '👷',
    auditor: '🔍',
    gatekeeper: '🏛️',
    laws: '⚖️',
    script: '🛠️',
    unknown: '❓'
  };
  
  for (const [culture, stats] of Object.entries(byCulture)) {
    const symbol = cultureSymbols[culture] || '❓';
    const total = stats.withAtoms + stats.withoutAtoms.length;
    console.log(`\n   ${symbol} ${culture.toUpperCase()} (${total} files)`);
    console.log(`      With atoms: ${stats.withAtoms}`);
    console.log(`      Without atoms: ${stats.withoutAtoms.length}`);
  }
  
  // Analysis of problematic files
  console.log('\n' + '═'.repeat(70));
  console.log('⚠️  PROBLEMATIC FILES (CITIZENS without atoms):');
  console.log('═'.repeat(70));
  
  const citizensWithoutAtoms = byCulture.citizen.withoutAtoms;
  console.log(`\n   Total problematic: ${citizensWithoutAtoms.length} files`);
  
  if (citizensWithoutAtoms.length > 0 && citizensWithoutAtoms.length <= 20) {
    console.log('\n   Files:');
    for (const f of citizensWithoutAtoms) {
      console.log(`      - ${f.filePath}`);
    }
  } else if (citizensWithoutAtoms.length > 20) {
    console.log('\n   First 20 files:');
    for (const f of citizensWithoutAtoms.slice(0, 20)) {
      console.log(`      - ${f.filePath}`);
    }
    console.log(`      ... and ${citizensWithoutAtoms.length - 20} more`);
  }
  
  // Analysis of EXPECTED files without atoms
  console.log('\n' + '═'.repeat(70));
  console.log('✅ EXPECTED FILES WITHOUT ATOMS:');
  console.log('═'.repeat(70));
  
  const gatekeepers = byCulture.gatekeeper.withoutAtoms.length;
  const laws = byCulture.laws.withoutAtoms.length;
  const auditors = byCulture.auditor.withoutAtoms.length;
  
  console.log(`\n   🏛️ Gatekeepers (barrel files): ${gatekeepers}`);
  console.log(`      → These organize exports, no atoms expected`);
  
  console.log(`\n   ⚖️ Laws (config/constants): ${laws}`);
  console.log(`      → These define constants, no atoms expected`);
  
  console.log(`\n   🔍 Auditors (tests): ${auditors}`);
  console.log(`      → Test files without atoms (may have only mocks/fixtures)`);
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📋 SUMMARY:');
  console.log('═'.repeat(70));
  
  const expectedWithoutAtoms = gatekeepers + laws + auditors + byCulture.unknown.withoutAtoms.length;
  const problematic = citizensWithoutAtoms.length;
  
  console.log(`\n   ✅ Expected without atoms: ${expectedWithoutAtoms}`);
  console.log(`      - Gatekeepers: ${gatekeepers}`);
  console.log(`      - Laws: ${laws}`);
  console.log(`      - Auditors without atoms: ${auditors}`);
  console.log(`      - Unknown: ${byCulture.unknown.withoutAtoms.length}`);
  
  console.log(`\n   ⚠️  Potentially problematic: ${problematic}`);
  console.log(`      - Citizens without atoms: ${problematic}`);
  
  if (problematic === 0) {
    console.log('\n   🎉 ALL CITIZENS HAVE ATOMS! Zero LLM needed for classification.');
  } else if (problematic < 10) {
    console.log('\n   ✅ Very few problematic files - excellent coverage!');
  } else if (problematic < 50) {
    console.log('\n   ✅ Good coverage - minor issues expected');
  } else {
    console.log('\n   ⚠️  Many citizens without atoms - may need parser improvements');
  }
  
  // Final verdict
  const healthScore = byCulture.citizen.withAtoms / (byCulture.citizen.withAtoms + citizensWithoutAtoms.length) * 100;
  console.log(`\n   🏥 Citizen Health Score: ${healthScore.toFixed(1)}%`);
  
  console.log('\n');
}

main().catch(console.error);