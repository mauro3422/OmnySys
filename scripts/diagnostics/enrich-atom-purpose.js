/**
 * @fileoverview enrich-atom-purpose.js
 * 
 * Enriches ALL atoms with a purpose field based on their existing metadata.
 * This provides a clear classification of what each atom does in the system.
 * 
 * Usage: node scripts/enrich-atom-purpose.js
 * 
 * After running, every atom will tener:
 * - purpose: The deduced purpose (API_EXPORT, TEST_HELPER, CLASS_METHOD, etc.)
 * - purposeReason: Why this purpose was deduced
 * - purposeConfidence: How confident the deduction is (0.0-1.0)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readAllAtoms, readAllFiles } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// PURPOSE CATEGORIES (same as derivation rule)
// ============================================================================

const ATOM_PURPOSES = {
  API_EXPORT: { name: 'API Export', description: 'Exported function - part of public API', isDead: false, icon: '📤' },
  EVENT_HANDLER: { name: 'Event Handler', description: 'Handles events/lifecycle hooks', isDead: false, icon: '⚡' },
  TEST_HELPER: { name: 'Test Helper', description: 'Function in test file', isDead: false, icon: '🧪' },
  TIMER_ASYNC: { name: 'Timer/Async', description: 'Timer callback or async pattern', isDead: false, icon: '⏱️' },
  NETWORK_HANDLER: { name: 'Network Handler', description: 'Makes network calls', isDead: false, icon: '🌐' },
  INTERNAL_HELPER: { name: 'Internal Helper', description: 'Helper called within file', isDead: false, icon: '🔧' },
  CONFIG_SETUP: { name: 'Config/Setup', description: 'Configuration or setup function', isDead: false, icon: '⚙️' },
  SCRIPT_MAIN: { name: 'Script Entry', description: 'Main function in script', isDead: false, icon: '🚀' },
  CLASS_METHOD: { name: 'Class Method', description: 'Method in a class (may be called dynamically)', isDead: false, icon: '📦' },
  DEAD_CODE: { name: 'Potential Dead Code', description: 'No evidence of use - review needed', isDead: true, icon: '💀' }
};

// ============================================================================
// PURPOSE DEDUCTION (same logic as derivation rule)
// ============================================================================

function deduceAtomPurpose(atom, allAtoms, files) {
  const filePath = atom.filePath || '';
  const fileData = files?.get(filePath);
  const culture = fileData?.culture || '';
  
  // Check 1: Is it exported? → API_EXPORT
  if (atom.isExported === true) {
    return { purpose: 'API_EXPORT', reason: 'Function is exported (public API)', confidence: 1.0, isDead: false };
  }
  
  // Check 2: Is it in a test file? → TEST_HELPER
  if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('tests/') || filePath.includes('test-cases/') || filePath.includes('__tests__/')) {
    return { purpose: 'TEST_HELPER', reason: 'Function in test file', confidence: 1.0, isDead: false };
  }
  
  // Check 3: Is it in scripts/? → SCRIPT_MAIN
  if (filePath.startsWith('scripts/')) {
    return { purpose: 'SCRIPT_MAIN', reason: 'Function in script file', confidence: 0.9, isDead: false };
  }
  
  // Check 4: Is it a config file? → CONFIG_SETUP
  if (culture === 'laws' || filePath.includes('/config/') || filePath.startsWith('src/config/')) {
    return { purpose: 'CONFIG_SETUP', reason: 'Function in config/constants file', confidence: 0.9, isDead: false };
  }
  
  // Check 5: Is it a class method? → CLASS_METHOD
  if (atom.functionType === 'class-method' || atom.className || (atom.archetype?.type === 'class-method')) {
    return { purpose: 'CLASS_METHOD', reason: `Class method${atom.className ? ` in ${atom.className}` : ''}`, confidence: 0.85, isDead: false };
  }
  
  // Check 6: Has lifecycle hooks? → EVENT_HANDLER
  const lifecycleHooks = atom.lifecycleHooks || [];
  const temporal = atom.temporal || {};
  const hasLifecycle = lifecycleHooks.length > 0;
  const hasEventListeners = temporal?.patterns?.events?.length > 0;
  const hasEventEmitters = atom.hasEventEmitters;
  
  if (hasLifecycle || hasEventListeners || hasEventEmitters) {
    return { purpose: 'EVENT_HANDLER', reason: `Has lifecycle hooks (${lifecycleHooks.length}) or events`, confidence: 0.95, isDead: false };
  }
  
  // Check 7: Has timers? → TIMER_ASYNC
  const timers = temporal?.patterns?.timers || [];
  const asyncPatterns = temporal?.patterns?.asyncPatterns || {};
  const hasTimers = timers.length > 0;
  const isAsync = asyncPatterns?.isAsync || atom.isAsync;
  
  if (hasTimers || (isAsync && atom.hasSideEffects)) {
    return { purpose: 'TIMER_ASYNC', reason: `Has timers (${timers.length}) or async pattern with side effects`, confidence: 0.85, isDead: false };
  }
  
  // Check 8: Has network calls? → NETWORK_HANDLER
  if (atom.hasNetworkCalls || (atom.networkEndpoints && atom.networkEndpoints.length > 0)) {
    return { purpose: 'NETWORK_HANDLER', reason: `Has network calls (${atom.networkEndpoints?.length || 0} endpoints)`, confidence: 0.9, isDead: false };
  }
  
  // Check 9: Has DOM manipulation? → EVENT_HANDLER
  if (atom.hasDomManipulation) {
    return { purpose: 'EVENT_HANDLER', reason: 'Has DOM manipulation (UI handler)', confidence: 0.8, isDead: false };
  }
  
  // Check 10: Check archetype for clues
  const archetype = atom.archetype?.type;
  if (archetype === 'hot-path') {
    return { purpose: 'API_EXPORT', reason: 'Hot path atom (likely entry point)', confidence: 0.8, isDead: false };
  }
  if (archetype === 'validator' || archetype === 'transformer') {
    return { purpose: 'INTERNAL_HELPER', reason: `${archetype} function`, confidence: 0.85, isDead: false };
  }
  
  // Default: Potential dead code
  return { purpose: 'DEAD_CODE', reason: 'No evidence of use found in metadata', confidence: 0.5, isDead: true };
}

// ============================================================================
// DATA LOADING
// ============================================================================

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🚀 Enriching ALL Atoms with Purpose');
  console.log('═'.repeat(70));
  
  // Load data
  console.log('\n📁 Loading data...');
  const atoms = await readAllAtoms(ROOT_PATH);
  const files = await readAllFiles(ROOT_PATH);
  
  console.log(`   Atoms loaded: ${atoms.size}`);
  console.log(`   Files loaded: ${files.size}`);
  
  // Analyze and enrich all atoms
  console.log('\n' + '─'.repeat(70));
  console.log('🔬 Analyzing and enriching atoms...');
  console.log('─'.repeat(70));
  
  const byPurpose = {};
  let enriched = 0;
  let updated = 0;
  
  for (const [id, { data, path: atomPath }] of atoms) {
    const result = deduceAtomPurpose(data, atoms, files);
    const purpose = result.purpose;
    
    // Track by purpose
    if (!byPurpose[purpose]) {
      byPurpose[purpose] = [];
    }
    byPurpose[purpose].push({ id, name: data.name, filePath: data.filePath });
    
    // Add purpose fields to atom
    data.purpose = purpose;
    data.purposeReason = result.reason;
    data.purposeConfidence = result.confidence;
    data.isDeadCode = result.isDead;
    
    // Save updated atom
    try {
      await fs.writeFile(atomPath, JSON.stringify(data, null, 2));
      updated++;
    } catch (e) {
      console.error(`   Error saving ${id}: ${e.message}`);
    }
    
    enriched++;
    if (enriched % 1000 === 0) {
      console.log(`   Processed ${enriched}/${atoms.size} atoms...`);
    }
  }
  
  // Print results
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ENRICHMENT RESULTS');
  console.log('═'.repeat(70));
  
  const sortedPurposes = Object.entries(byPurpose)
    .sort((a, b) => b[1].length - a[1].length);
  
  console.log(`\n   ✅ Atoms enriched: ${enriched}`);
  console.log(`   💾 Atoms saved: ${updated}`);
  
  console.log(`\n   📋 Breakdown by purpose:`);
  for (const [purpose, items] of sortedPurposes) {
    const info = ATOM_PURPOSES[purpose];
    const icon = info?.icon || '❓';
    const pct = (items.length / atoms.size * 100).toFixed(1);
    console.log(`      ${icon} ${purpose}: ${items.length} (${pct}%)`);
  }
  
  // Summary stats
  const totalAtoms = atoms.size;
  const nonDeadAtoms = Object.entries(byPurpose)
    .filter(([p]) => p !== 'DEAD_CODE')
    .reduce((sum, [_, items]) => sum + items.length, 0);
  const deadAtoms = byPurpose['DEAD_CODE']?.length || 0;
  
  console.log('\n' + '═'.repeat(70));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(70));
  
  console.log(`\n   📊 Total atoms: ${totalAtoms}`);
  console.log(`   ✅ Atoms with valid purpose: ${nonDeadAtoms} (${(nonDeadAtoms/totalAtoms*100).toFixed(1)}%)`);
  console.log(`   💀 Potential dead code: ${deadAtoms} (${(deadAtoms/totalAtoms*100).toFixed(1)}%)`);
  
  console.log(`\n   🎯 Every atom now has:`);
  console.log(`      - purpose: The deduced purpose`);
  console.log(`      - purposeReason: Why this purpose was deduced`);
  console.log(`      - purposeConfidence: Confidence level (0.0-1.0)`);
  console.log(`      - isDeadCode: Whether it's potential dead code`);
  
  console.log('\n');
}

main().catch(console.error);