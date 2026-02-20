/**
 * @fileoverview analyze-dead-code-atoms.js
 * 
 * Deep analysis of atoms flagged as "dead code" (not called and not exported).
 * Uses existing metadata to deduce the actual purpose of each atom.
 * 
 * Categories:
 * - API_EXPORT: Exported but not called internally (public API)
 * - EVENT_HANDLER: Has lifecycle hooks or event listeners
 * - TEST_HELPER: In test files
 * - TIMER_ASYNC: Has timers or async patterns
 * - NETWORK_HANDLER: Has network calls
 * - INTERNAL_HELPER: Called by other atoms in same file
 * - CONFIG_SETUP: In config files
 * - SCRIPT_MAIN: Entry point in scripts
 * - POTENTIAL_DEAD: None of the above - needs review
 * 
 * Usage: node scripts/analyze-dead-code-atoms.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// PURPOSE CATEGORIES
// ============================================================================

const PURPOSES = {
  API_EXPORT: {
    name: 'API Export',
    description: 'Exported function - part of public API',
    isDead: false,
    icon: '📤'
  },
  EVENT_HANDLER: {
    name: 'Event Handler',
    description: 'Handles events/lifecycle hooks',
    isDead: false,
    icon: '⚡'
  },
  TEST_HELPER: {
    name: 'Test Helper',
    description: 'Function in test file',
    isDead: false,
    icon: '🧪'
  },
  TIMER_ASYNC: {
    name: 'Timer/Async',
    description: 'Timer callback or async pattern',
    isDead: false,
    icon: '⏱️'
  },
  NETWORK_HANDLER: {
    name: 'Network Handler',
    description: 'Makes network calls',
    isDead: false,
    icon: '🌐'
  },
  INTERNAL_HELPER: {
    name: 'Internal Helper',
    description: 'Helper called within file',
    isDead: false,
    icon: '🔧'
  },
  CONFIG_SETUP: {
    name: 'Config/Setup',
    description: 'Configuration or setup function',
    isDead: false,
    icon: '⚙️'
  },
  SCRIPT_MAIN: {
    name: 'Script Entry',
    description: 'Main function in script',
    isDead: false,
    icon: '🚀'
  },
  DEAD_CODE: {
    name: 'Potential Dead Code',
    description: 'No evidence of use - review needed',
    isDead: true,
    icon: '💀'
  }
};

// ============================================================================
// DATA LOADING
// ============================================================================

async function readAllAtoms() {
  const atomsDir = path.join(ROOT_PATH, '.omnysysdata', 'atoms');
  const atoms = new Map();
  
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
            if (data.id) {
              atoms.set(data.id, data);
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(atomsDir);
  return atoms;
}

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

// ============================================================================
// PURPOSE DEDUCTION
// ============================================================================

/**
 * Deduces the purpose of an atom based on its metadata
 */
function deduceAtomPurpose(atom, allAtoms, files) {
  const filePath = atom.filePath || '';
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  
  // Get file culture if available
  const fileData = files.get(filePath);
  const culture = fileData?.culture || '';
  
  // Check 1: Is it exported? → API_EXPORT
  if (atom.isExported === true) {
    return {
      purpose: 'API_EXPORT',
      reason: 'Function is exported (public API)',
      confidence: 1.0
    };
  }
  
  // Check 2: Is it in a test file? → TEST_HELPER
  if (filePath.includes('.test.') || 
      filePath.includes('.spec.') || 
      filePath.includes('tests/') ||
      filePath.includes('test-cases/') ||
      filePath.includes('__tests__/')) {
    return {
      purpose: 'TEST_HELPER',
      reason: 'Function in test file',
      confidence: 1.0
    };
  }
  
  // Check 3: Is it in scripts/? → SCRIPT_MAIN
  if (filePath.startsWith('scripts/')) {
    return {
      purpose: 'SCRIPT_MAIN',
      reason: 'Function in script file',
      confidence: 0.9
    };
  }
  
  // Check 4: Is it a config file? → CONFIG_SETUP
  if (culture === 'laws' || 
      filePath.includes('/config/') || 
      filePath.startsWith('src/config/')) {
    return {
      purpose: 'CONFIG_SETUP',
      reason: 'Function in config/constants file',
      confidence: 0.9
    };
  }
  
  // Check 5: Has lifecycle hooks? → EVENT_HANDLER
  const lifecycleHooks = atom.lifecycleHooks || [];
  const temporal = atom.temporal || {};
  const hasLifecycle = lifecycleHooks.length > 0;
  const hasEventListeners = temporal?.patterns?.events?.length > 0;
  const hasEventEmitters = atom.hasEventEmitters;
  
  if (hasLifecycle || hasEventListeners || hasEventEmitters) {
    return {
      purpose: 'EVENT_HANDLER',
      reason: `Has lifecycle hooks (${lifecycleHooks.length}) or events`,
      confidence: 0.95
    };
  }
  
  // Check 6: Has timers? → TIMER_ASYNC
  const timers = temporal?.patterns?.timers || [];
  const asyncPatterns = temporal?.patterns?.asyncPatterns || {};
  const hasTimers = timers.length > 0;
  const isAsync = asyncPatterns?.isAsync || atom.isAsync;
  
  if (hasTimers || (isAsync && atom.hasSideEffects)) {
    return {
      purpose: 'TIMER_ASYNC',
      reason: `Has timers (${timers.length}) or async pattern with side effects`,
      confidence: 0.85
    };
  }
  
  // Check 7: Has network calls? → NETWORK_HANDLER
  if (atom.hasNetworkCalls || (atom.networkEndpoints && atom.networkEndpoints.length > 0)) {
    return {
      purpose: 'NETWORK_HANDLER',
      reason: `Has network calls (${atom.networkEndpoints?.length || 0} endpoints)`,
      confidence: 0.9
    };
  }
  
  // Check 8: Called by other atoms in same file? → INTERNAL_HELPER
  const sameFileAtoms = Array.from(allAtoms.values())
    .filter(a => a.filePath === filePath && a.id !== atom.id);
  
  for (const otherAtom of sameFileAtoms) {
    const calls = otherAtom.calls || [];
    const callsThisAtom = calls.some(c => {
      const callName = c.name || c.callee;
      return callName === atom.name;
    });
    
    if (callsThisAtom) {
      return {
        purpose: 'INTERNAL_HELPER',
        reason: `Called by ${otherAtom.name} in same file`,
        confidence: 0.95
      };
    }
  }
  
  // Check 9: Has DOM manipulation? → Could be UI handler
  if (atom.hasDomManipulation) {
    return {
      purpose: 'EVENT_HANDLER',
      reason: 'Has DOM manipulation (UI handler)',
      confidence: 0.8
    };
  }
  
  // Check 10: Has error handling? → Could be error handler
  if (atom.hasErrorHandling && !atom.calledBy?.length) {
    return {
      purpose: 'EVENT_HANDLER',
      reason: 'Has error handling (error handler)',
      confidence: 0.7
    };
  }
  
  // Check 11: Check archetype for clues
  const archetype = atom.archetype?.type;
  if (archetype === 'hot-path') {
    return {
      purpose: 'API_EXPORT',
      reason: 'Hot path atom (likely entry point)',
      confidence: 0.8
    };
  }
  
  if (archetype === 'validator') {
    return {
      purpose: 'INTERNAL_HELPER',
      reason: 'Validator function',
      confidence: 0.85
    };
  }
  
  if (archetype === 'transformer') {
    return {
      purpose: 'INTERNAL_HELPER',
      reason: 'Transformer function',
      confidence: 0.85
    };
  }
  
  // Default: Potential dead code
  return {
    purpose: 'DEAD_CODE',
    reason: 'No evidence of use found in metadata',
    confidence: 0.5
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🔬 Deep Analysis of "Dead Code" Atoms');
  console.log('═'.repeat(70));
  
  // Load data
  console.log('\n📁 Loading data...');
  const atoms = await readAllAtoms();
  const files = await readAllFiles();
  
  console.log(`   Atoms loaded: ${atoms.size}`);
  console.log(`   Files loaded: ${files.size}`);
  
  // Find atoms with no calledBy
  console.log('\n' + '─'.repeat(70));
  console.log('📊 Finding atoms with no callers...');
  console.log('─'.repeat(70));
  
  const atomsWithNoCallers = [];
  const atomsWithCallers = [];
  
  for (const [id, atom] of atoms) {
    const calledBy = atom.calledBy || [];
    if (calledBy.length === 0) {
      atomsWithNoCallers.push(atom);
    } else {
      atomsWithCallers.push(atom);
    }
  }
  
  console.log(`   Atoms WITH callers: ${atomsWithCallers.length}`);
  console.log(`   Atoms WITHOUT callers: ${atomsWithNoCallers.length}`);
  
  // Analyze each atom with no callers
  console.log('\n' + '─'.repeat(70));
  console.log('🔬 Deducing purpose for atoms without callers...');
  console.log('─'.repeat(70));
  
  const byPurpose = {};
  const deadCodeAtoms = [];
  
  for (const atom of atomsWithNoCallers) {
    const result = deduceAtomPurpose(atom, atoms, files);
    const purpose = result.purpose;
    
    if (!byPurpose[purpose]) {
      byPurpose[purpose] = [];
    }
    
    byPurpose[purpose].push({
      id: atom.id,
      name: atom.name,
      filePath: atom.filePath,
      reason: result.reason,
      confidence: result.confidence,
      archetype: atom.archetype?.type
    });
    
    if (purpose === 'DEAD_CODE') {
      deadCodeAtoms.push({
        id: atom.id,
        name: atom.name,
        filePath: atom.filePath,
        archetype: atom.archetype?.type,
        complexity: atom.complexity,
        linesOfCode: atom.linesOfCode
      });
    }
  }
  
  // Print results
  console.log('\n' + '═'.repeat(70));
  console.log('📊 CLASSIFICATION RESULTS');
  console.log('═'.repeat(70));
  
  const sortedPurposes = Object.entries(byPurpose)
    .sort((a, b) => b[1].length - a[1].length);
  
  let totalAtoms = 0;
  let nonDeadCount = 0;
  
  for (const [purpose, items] of sortedPurposes) {
    const info = PURPOSES[purpose];
    const icon = info?.icon || '❓';
    const isDead = info?.isDead || false;
    
    totalAtoms += items.length;
    if (!isDead) nonDeadCount += items.length;
    
    console.log(`\n   ${icon} ${purpose} (${items.length} atoms)`);
    console.log(`      ${info?.description || 'Unknown purpose'}`);
    console.log(`      Is dead code: ${isDead ? '🔴 YES' : '🟢 NO'}`);
    
    // Show sample
    const sample = items.slice(0, 3);
    for (const item of sample) {
      console.log(`      • ${item.name} in ${item.filePath}`);
    }
    if (items.length > 3) {
      console.log(`      ... and ${items.length - 3} more`);
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(70));
  
  const deadCount = byPurpose['DEAD_CODE']?.length || 0;
  const realDeadPercentage = (deadCount / atomsWithNoCallers.length * 100).toFixed(1);
  
  console.log(`\n   📊 Total atoms analyzed: ${atomsWithNoCallers.length}`);
  console.log(`   ✅ Atoms with valid purpose: ${nonDeadCount}`);
  console.log(`   💀 Potential dead code: ${deadCount} (${realDeadPercentage}%)`);
  
  console.log(`\n   🎯 Improvement in CalledBy coverage:`);
  console.log(`      Before: ${(atomsWithCallers.length/atoms.size*100).toFixed(1)}%`);
  console.log(`      After deduction: ${((atomsWithCallers.length + nonDeadCount)/atoms.size*100).toFixed(1)}%`);
  console.log(`      (Assuming ${nonDeadCount} atoms have valid purposes)`);
  
  // Show real dead code details
  if (deadCodeAtoms.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('💀 REAL DEAD CODE ATOMS (need review)');
    console.log('═'.repeat(70));
    
    // Group by file
    const byFile = {};
    for (const atom of deadCodeAtoms) {
      const file = atom.filePath;
      if (!byFile[file]) byFile[file] = [];
      byFile[file].push(atom);
    }
    
    const sortedFiles = Object.entries(byFile)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    console.log(`\n   Files with most dead code atoms:`);
    for (const [file, atoms] of sortedFiles) {
      console.log(`\n   📄 ${file} (${atoms.length} atoms)`);
      for (const atom of atoms.slice(0, 3)) {
        console.log(`      • ${atom.name} (complexity: ${atom.complexity}, LOC: ${atom.linesOfCode})`);
      }
      if (atoms.length > 3) {
        console.log(`      ... and ${atoms.length - 3} more`);
      }
    }
    
    // Dead code by archetype
    console.log(`\n   Dead code by archetype:`);
    const byArchetype = {};
    for (const atom of deadCodeAtoms) {
      const arch = atom.archetype || 'unknown';
      if (!byArchetype[arch]) byArchetype[arch] = 0;
      byArchetype[arch]++;
    }
    
    for (const [arch, count] of Object.entries(byArchetype).sort((a, b) => b[1] - a[1])) {
      console.log(`      • ${arch}: ${count}`);
    }
  }
  
  // Recommendations
  console.log('\n' + '═'.repeat(70));
  console.log('💡 RECOMMENDATIONS');
  console.log('═'.repeat(70));
  
  console.log(`\n   1. Add PURPOSE field to atoms during extraction`);
  console.log(`   2. Create DerivationRule: deduceAtomPurpose()`);
  console.log(`   3. Filter dead code in reports by purpose`);
  console.log(`   4. Review ${deadCount} atoms flagged as DEAD_CODE`);
  
  console.log('\n');
}

main().catch(console.error);