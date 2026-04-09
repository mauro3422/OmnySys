/**
 * @fileoverview audit-relationships.js
 * 
 * Comprehensive audit of relationships and metadata in OmnySystem.
 * Validates:
 * - usedBy ↔ dependsOn consistency (bidirectional)
 * - calledBy accuracy for atoms
 * - Metadata completeness
 * - Culture classification coverage
 * - Semantic connections
 * 
 * Usage: node scripts/audit-relationships.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readAllAtoms, readAllFiles } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// DATA LOADING
// ============================================================================

async function readConnections() {
  const connectionsDir = path.join(ROOT_PATH, '.omnysysdata', 'connections');
  const connections = {};
  
  try {
    const entries = await fs.readdir(connectionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const fullPath = path.join(connectionsDir, entry.name);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const data = JSON.parse(content);
          connections[entry.name.replace('.json', '')] = data;
        } catch {}
      }
    }
  } catch {}
  
  return connections;
}

// ============================================================================
// AUDIT CHECKS
// ============================================================================

/**
 * Check 1: usedBy ↔ dependsOn consistency
 * For each file A that depends on file B, file B should have A in usedBy
 */
function checkDependencyConsistency(files) {
  const issues = [];
  let checked = 0;
  let consistent = 0;
  
  for (const [filePath, data] of files) {
    const dependsOn = data.dependsOn || [];
    const usedBy = data.usedBy || [];
    
    // Check each dependency
    for (const depPath of dependsOn) {
      checked++;
      const depFile = files.get(depPath);
      
      if (depFile) {
        const depUsedBy = depFile.usedBy || [];
        if (depUsedBy.includes(filePath)) {
          consistent++;
        } else {
          issues.push({
            type: 'missing_usedBy',
            file: filePath,
            dependsOn: depPath,
            message: `${filePath} depends on ${depPath}, but ${depPath} doesn't list it in usedBy`
          });
        }
      }
    }
    
    // Check each usedBy
    for (const userPath of usedBy) {
      checked++;
      const userFile = files.get(userPath);
      
      if (userFile) {
        const userDependsOn = userFile.dependsOn || [];
        if (userDependsOn.includes(filePath)) {
          consistent++;
        } else {
          issues.push({
            type: 'missing_dependsOn',
            file: filePath,
            usedBy: userPath,
            message: `${filePath} is used by ${userPath}, but ${userPath} doesn't list it in dependsOn`
          });
        }
      }
    }
  }
  
  return { checked, consistent, issues };
}

/**
 * Check 2: calledBy accuracy for atoms
 * Verify that calledBy references point to valid atoms
 */
function checkCalledByConsistency(atoms) {
  const issues = [];
  let totalCalledBy = 0;
  let validCalledBy = 0;
  
  for (const [atomId, atom] of atoms) {
    const calledBy = atom.calledBy || [];
    
    for (const callerId of calledBy) {
      totalCalledBy++;
      
      // Check if the caller atom exists
      if (atoms.has(callerId)) {
        validCalledBy++;
        
        // Verify the caller actually calls this atom
        const callerAtom = atoms.get(callerId);
        const callerCalls = callerAtom.calls || [];
        const callsThisAtom = callerCalls.some(c => {
          // Try to match by name
          const callName = c.name || c.callee;
          return callName === atom.name;
        });
        
        if (!callsThisAtom) {
          issues.push({
            type: 'calledBy_not_in_calls',
            atom: atomId,
            caller: callerId,
            message: `${callerId} lists ${atomId} in calledBy, but doesn't call ${atom.name}`
          });
        }
      } else {
        issues.push({
          type: 'invalid_calledBy_reference',
          atom: atomId,
          caller: callerId,
          message: `${atomId} has calledBy reference to non-existent atom: ${callerId}`
        });
      }
    }
  }
  
  return { totalCalledBy, validCalledBy, issues };
}

/**
 * Check 3: Metadata completeness
 */
function checkMetadataCompleteness(files, atoms) {
  const fileStats = {
    total: files.size,
    withCulture: 0,
    withRiskScore: 0,
    withSemanticAnalysis: 0,
    withDefinitions: 0,
    withCalls: 0
  };
  
  const atomStats = {
    total: atoms.size,
    withCalledBy: 0,
    withComplexity: 0,
    withDataFlow: 0,
    withDna: 0,
    withArchetype: 0,
    withTypeContracts: 0,
    withPerformance: 0
  };
  
  for (const [_, data] of files) {
    if (data.culture) fileStats.withCulture++;
    if (data.riskScore) fileStats.withRiskScore++;
    if (data.semanticAnalysis) fileStats.withSemanticAnalysis++;
    if (data.definitions && data.definitions.length > 0) fileStats.withDefinitions++;
    if (data.calls && data.calls.length > 0) fileStats.withCalls++;
  }
  
  for (const [_, atom] of atoms) {
    if (atom.calledBy && atom.calledBy.length > 0) atomStats.withCalledBy++;
    if (atom.complexity !== undefined) atomStats.withComplexity++;
    if (atom.dataFlow) atomStats.withDataFlow++;
    if (atom.dna) atomStats.withDna++;
    if (atom.archetype) atomStats.withArchetype++;
    if (atom.typeContracts) atomStats.withTypeContracts++;
    if (atom.performance) atomStats.withPerformance++;
  }
  
  return { fileStats, atomStats };
}

/**
 * Check 4: Semantic connections
 */
function checkSemanticConnections(files, connections) {
  const stats = {
    filesWithConnections: 0,
    totalConnections: 0,
    connectionTypes: {}
  };
  
  for (const [_, data] of files) {
    const conn = data.semanticConnections;
    if (conn && conn.length > 0) {
      stats.filesWithConnections++;
      stats.totalConnections += conn.length;
      
      for (const c of conn) {
        const type = c.type || 'unknown';
        stats.connectionTypes[type] = (stats.connectionTypes[type] || 0) + 1;
      }
    }
  }
  
  // Check shared-state.json and event-listeners.json
  for (const [connName, connData] of Object.entries(connections)) {
    if (Array.isArray(connData)) {
      stats.connectionTypes[connName] = connData.length;
    }
  }
  
  return stats;
}

/**
 * Check 5: Orphan atoms (atoms with no callers and not exported)
 */
function checkOrphanAtoms(atoms, files) {
  const orphans = [];
  const deadCode = [];
  
  for (const [atomId, atom] of atoms) {
    const calledBy = atom.calledBy || [];
    const isExported = atom.isExported;
    
    if (calledBy.length === 0) {
      if (isExported) {
        // Exported but not called - could be API entry point
        orphans.push({
          id: atomId,
          name: atom.name,
          filePath: atom.filePath,
          isExported: true,
          reason: 'exported_but_not_called'
        });
      } else {
        // Not exported and not called - potential dead code
        deadCode.push({
          id: atomId,
          name: atom.name,
          filePath: atom.filePath,
          isExported: false,
          reason: 'not_exported_not_called'
        });
      }
    }
  }
  
  return { orphans, deadCode };
}

/**
 * Check 6: Cross-file call resolution
 */
function checkCrossFileCalls(atoms, files) {
  const stats = {
    totalExternalCalls: 0,
    resolvedCalls: 0,
    unresolvedCalls: 0,
    unresolvedExamples: []
  };
  
  for (const [atomId, atom] of atoms) {
    const externalCalls = atom.externalCalls || atom.calls?.filter(c => c.type === 'external') || [];
    
    for (const call of externalCalls) {
      stats.totalExternalCalls++;
      const callName = call.name || call.callee;
      
      // Try to find this function in other atoms
      let found = false;
      for (const [otherId, otherAtom] of atoms) {
        if (otherAtom.name === callName && otherAtom.filePath !== atom.filePath) {
          found = true;
          break;
        }
      }
      
      if (found) {
        stats.resolvedCalls++;
      } else {
        stats.unresolvedCalls++;
        if (stats.unresolvedExamples.length < 10) {
          stats.unresolvedExamples.push({
            from: atomId,
            callName,
            line: call.line
          });
        }
      }
    }
  }
  
  return stats;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🔍 OmnySystem — Relationships & Metadata Audit');
  console.log('═'.repeat(70));
  
  // Load data
  console.log('\n📁 Loading data...');
const files = await readAllFiles(ROOT_PATH);
  const atoms = await readAllAtoms(ROOT_PATH);
  const connections = await readConnections();
  
  console.log(`   Files loaded: ${files.size}`);
  console.log(`   Atoms loaded: ${atoms.size}`);
  console.log(`   Connection files: ${Object.keys(connections).length}`);
  
  // Run checks
  console.log('\n' + '─'.repeat(70));
  console.log('📊 CHECK 1: usedBy ↔ dependsOn Consistency');
  console.log('─'.repeat(70));
  const depCheck = checkDependencyConsistency(files);
  console.log(`   Checked: ${depCheck.checked} relationships`);
  console.log(`   Consistent: ${depCheck.consistent}`);
  console.log(`   Issues: ${depCheck.issues.length}`);
  if (depCheck.issues.length > 0 && depCheck.issues.length <= 5) {
    for (const issue of depCheck.issues) {
      console.log(`   ⚠️  ${issue.message}`);
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 CHECK 2: calledBy Accuracy');
  console.log('─'.repeat(70));
  const calledByCheck = checkCalledByConsistency(atoms);
  console.log(`   Total calledBy references: ${calledByCheck.totalCalledBy}`);
  console.log(`   Valid references: ${calledByCheck.validCalledBy}`);
  console.log(`   Issues: ${calledByCheck.issues.length}`);
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 CHECK 3: Metadata Completeness');
  console.log('─'.repeat(70));
  const metaCheck = checkMetadataCompleteness(files, atoms);
  
  console.log('\n   📄 FILE METADATA:');
  console.log(`      Culture:         ${metaCheck.fileStats.withCulture}/${metaCheck.fileStats.total} (${(metaCheck.fileStats.withCulture/metaCheck.fileStats.total*100).toFixed(1)}%)`);
  console.log(`      Risk Score:      ${metaCheck.fileStats.withRiskScore}/${metaCheck.fileStats.total} (${(metaCheck.fileStats.withRiskScore/metaCheck.fileStats.total*100).toFixed(1)}%)`);
  console.log(`      Semantic:        ${metaCheck.fileStats.withSemanticAnalysis}/${metaCheck.fileStats.total} (${(metaCheck.fileStats.withSemanticAnalysis/metaCheck.fileStats.total*100).toFixed(1)}%)`);
  console.log(`      Definitions:     ${metaCheck.fileStats.withDefinitions}/${metaCheck.fileStats.total} (${(metaCheck.fileStats.withDefinitions/metaCheck.fileStats.total*100).toFixed(1)}%)`);
  console.log(`      Calls:           ${metaCheck.fileStats.withCalls}/${metaCheck.fileStats.total} (${(metaCheck.fileStats.withCalls/metaCheck.fileStats.total*100).toFixed(1)}%)`);
  
  console.log('\n   ⚛️  ATOM METADATA:');
  console.log(`      CalledBy:        ${metaCheck.atomStats.withCalledBy}/${metaCheck.atomStats.total} (${(metaCheck.atomStats.withCalledBy/metaCheck.atomStats.total*100).toFixed(1)}%)`);
  console.log(`      Complexity:      ${metaCheck.atomStats.withComplexity}/${metaCheck.atomStats.total} (${(metaCheck.atomStats.withComplexity/metaCheck.atomStats.total*100).toFixed(1)}%)`);
  console.log(`      Data Flow:       ${metaCheck.atomStats.withDataFlow}/${metaCheck.atomStats.total} (${(metaCheck.atomStats.withDataFlow/metaCheck.atomStats.total*100).toFixed(1)}%)`);
  console.log(`      DNA:             ${metaCheck.atomStats.withDna}/${metaCheck.atomStats.total} (${(metaCheck.atomStats.withDna/metaCheck.atomStats.total*100).toFixed(1)}%)`);
  console.log(`      Archetype:       ${metaCheck.atomStats.withArchetype}/${metaCheck.atomStats.total} (${(metaCheck.atomStats.withArchetype/metaCheck.atomStats.total*100).toFixed(1)}%)`);
  console.log(`      Type Contracts:  ${metaCheck.atomStats.withTypeContracts}/${metaCheck.atomStats.total} (${(metaCheck.atomStats.withTypeContracts/metaCheck.atomStats.total*100).toFixed(1)}%)`);
  console.log(`      Performance:     ${metaCheck.atomStats.withPerformance}/${metaCheck.atomStats.total} (${(metaCheck.atomStats.withPerformance/metaCheck.atomStats.total*100).toFixed(1)}%)`);
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 CHECK 4: Semantic Connections');
  console.log('─'.repeat(70));
  const connCheck = checkSemanticConnections(files, connections);
  console.log(`   Files with connections: ${connCheck.filesWithConnections}`);
  console.log(`   Total connections: ${connCheck.totalConnections}`);
  console.log(`   Connection types:`);
  for (const [type, count] of Object.entries(connCheck.connectionTypes)) {
    console.log(`      - ${type}: ${count}`);
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 CHECK 5: Orphan & Dead Code Analysis');
  console.log('─'.repeat(70));
  const orphanCheck = checkOrphanAtoms(atoms, files);
  console.log(`   Exported but not called: ${orphanCheck.orphans.length}`);
  console.log(`   Potential dead code: ${orphanCheck.deadCode.length}`);
  
  if (orphanCheck.deadCode.length > 0 && orphanCheck.deadCode.length <= 10) {
    console.log('\n   ⚠️  Potential dead code:');
    for (const atom of orphanCheck.deadCode) {
      console.log(`      - ${atom.name} in ${atom.filePath}`);
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 CHECK 6: Cross-File Call Resolution');
  console.log('─'.repeat(70));
  const crossFileCheck = checkCrossFileCalls(atoms, files);
  console.log(`   Total external calls: ${crossFileCheck.totalExternalCalls}`);
  console.log(`   Resolved: ${crossFileCheck.resolvedCalls}`);
  console.log(`   Unresolved: ${crossFileCheck.unresolvedCalls}`);
  
  if (crossFileCheck.unresolvedExamples.length > 0) {
    console.log('\n   📋 Sample unresolved calls:');
    for (const ex of crossFileCheck.unresolvedExamples.slice(0, 5)) {
      console.log(`      - ${ex.callName}() from ${ex.from}`);
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📋 AUDIT SUMMARY');
  console.log('═'.repeat(70));
  
  // Calculate health score with weighted penalties
  // Dependency issues are critical (10 points each)
  // calledBy issues are minor (0.5 points each - usually method calls that don't match exactly)
  const criticalIssues = depCheck.issues.length;
  const minorIssues = calledByCheck.issues.length;
  const healthScore = Math.max(0, 100 - (criticalIssues * 10) - (minorIssues * 0.5));
  
  console.log(`\n   🏥 System Health Score: ${healthScore.toFixed(1)}/100`);
  console.log(`\n   Total issues found: ${criticalIssues + minorIssues}`);
  console.log(`      - Dependency consistency (critical): ${criticalIssues}`);
  console.log(`      - calledBy accuracy (minor): ${minorIssues}`);
  
  console.log(`\n   📊 Coverage:`);
  console.log(`      Files analyzed: ${files.size}`);
  console.log(`      Atoms extracted: ${atoms.size}`);
  console.log(`      Culture classification: ${(metaCheck.fileStats.withCulture/metaCheck.fileStats.total*100).toFixed(1)}%`);
  console.log(`      Average atoms per file: ${(atoms.size/files.size).toFixed(1)}`);
  
  if (healthScore >= 90) {
    console.log('\n   ✅ EXCELLENT - System is in great shape!');
  } else if (healthScore >= 70) {
    console.log('\n   ✅ GOOD - Minor issues, mostly healthy');
  } else if (healthScore >= 50) {
    console.log('\n   ⚠️  FAIR - Some issues need attention');
  } else {
    console.log('\n   🔴 CRITICAL - Major issues found');
  }
  
  console.log('\n');
}

main().catch(console.error);