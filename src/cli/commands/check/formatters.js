/**
 * Output formatting utilities for check command
 * @module src/cli/commands/check/formatters
 */

/**
 * Formats file metrics section
 * @param {object} fileData - File analysis data
 * @returns {string[]} Formatted output lines
 */
export function formatFileMetrics(fileData) {
  const output = [];
  output.push('FILE METRICS');
  output.push(`   Functions: ${fileData.functions?.length || 0}`);
  output.push(`   Exports: ${fileData.exports?.length || 0}`);
  output.push(`   Imports: ${fileData.imports?.length || 0}`);
  output.push(`   Risk Score: ${fileData.riskScore?.total || 0}/10 (${fileData.riskScore?.severity || 'low'})`);
  output.push('');
  return output;
}

/**
 * Formats dependencies section
 * @param {object} fileData - File analysis data
 * @returns {string[]} Formatted output lines
 */
export function formatDependencies(fileData) {
  const output = [];
  output.push('DEPENDENCIES');
  
  if (fileData.dependsOn?.length > 0) {
    output.push('   This file imports from:');
    for (const dep of fileData.dependsOn.slice(0, 10)) {
      output.push(`     - ${dep}`);
    }
    if (fileData.dependsOn.length > 10) {
      output.push(`     ... and ${fileData.dependsOn.length - 10} more`);
    }
  } else {
    output.push('   No imports (standalone file)');
  }
  output.push('');

  if (fileData.usedBy?.length > 0) {
    output.push('IMPORTED BY:');
    for (const user of fileData.usedBy.slice(0, 10)) {
      output.push(`     - ${user}`);
    }
    if (fileData.usedBy.length > 10) {
      output.push(`     ... and ${fileData.usedBy.length - 10} more`);
    }
    output.push(`\n   Changing exports will break ${fileData.usedBy.length} file(s)\n`);
  } else {
    output.push('   Not imported by any file\n');
  }
  
  return output;
}

/**
 * Formats semantic connections section
 * @param {object} fileData - File analysis data
 * @returns {string[]} Formatted output lines
 */
export function formatSemanticConnections(fileData) {
  const output = [];
  const connections = fileData.semanticConnections || [];
  
  if (connections.length > 0) {
    output.push('SEMANTIC CONNECTIONS (Hidden Dependencies)');

    const byType = {};
    for (const conn of connections) {
      if (!byType[conn.type]) byType[conn.type] = [];
      byType[conn.type].push(conn);
    }

    for (const [type, conns] of Object.entries(byType)) {
      output.push(`   ${type.toUpperCase()}:`);
      for (const conn of conns.slice(0, 5)) {
        output.push(`     - ${conn.target} ${conn.key ? `(${conn.key})` : ''}`);
      }
      if (conns.length > 5) {
        output.push(`     ... and ${conns.length - 5} more`);
      }
    }
    output.push('');
  }
  
  return output;
}

/**
 * Formats metadata section (JSDoc, async, error handling, etc.)
 * @param {object} fileData - File analysis data
 * @returns {string[]} Formatted output lines
 */
export function formatMetadataSection(fileData) {
  const output = [];
  
  if (!fileData.metadata) return output;
  
  const md = fileData.metadata;

  if (md.jsdocContracts?.all?.length > 0) {
    output.push('JSDoc CONTRACTS');
    output.push(`   Documented functions: ${md.jsdocContracts.all.length}`);
    for (const contract of md.jsdocContracts.all.slice(0, 3)) {
      if (contract.params?.length > 0) {
        const params = contract.params.map(p => `${p.name}: ${p.type}`).join(', ');
        output.push(`     - params: ${params}`);
      }
    }
    output.push('');
  }

  if (md.asyncPatterns?.all?.length > 0) {
    output.push('ASYNC PATTERNS');
    output.push(`   Async functions: ${md.asyncPatterns.asyncFunctions?.length || 0}`);
    output.push(`   Promise chains: ${md.asyncPatterns.promiseChains?.length || 0}`);
    if (md.asyncPatterns.raceConditions?.length > 0) {
      output.push(`   Potential race conditions: ${md.asyncPatterns.raceConditions.length}`);
    }
    output.push('');
  }

  if (md.errorHandling?.all?.length > 0) {
    output.push('ERROR HANDLING');
    output.push(`   Try blocks: ${md.errorHandling.tryBlocks?.length || 0}`);
    output.push(`   Custom errors: ${md.errorHandling.customErrors?.length || 0}`);
    output.push('');
  }

  if (md.buildTimeDeps?.devFlags?.length > 0) {
    output.push('BUILD-TIME DEPENDENCIES');
    const flags = md.buildTimeDeps.devFlags.map(f => f.name || f.type).join(', ');
    output.push(`   Flags: ${flags}`);
    output.push('');
  }
  
  return output;
}

/**
 * Formats broken connections section
 * @param {object} fileData - File analysis data
 * @returns {string[]} Formatted output lines
 */
export function formatBrokenConnections(fileData) {
  const output = [];
  
  if (fileData.brokenConnections?.length > 0) {
    output.push('BROKEN CONNECTIONS');
    for (const broken of fileData.brokenConnections.slice(0, 5)) {
      output.push(`   - ${broken.type}: ${broken.reason}`);
    }
    output.push('');
  }
  
  return output;
}

/**
 * Formats side effects section
 * @param {object} fileData - File analysis data
 * @returns {string[]} Formatted output lines
 */
export function formatSideEffects(fileData) {
  const output = [];
  
  if (!fileData.sideEffects) return output;
  
  const se = fileData.sideEffects;
  const hasSideEffects = se.hasGlobalAccess || se.usesLocalStorage ||
    se.makesNetworkCalls || se.hasEventListeners ||
    se.accessesWindow;

  if (hasSideEffects) {
    output.push('SIDE EFFECTS');
    if (se.usesLocalStorage) output.push('   - Uses localStorage/sessionStorage');
    if (se.makesNetworkCalls) output.push('   - Makes network calls');
    if (se.accessesWindow) output.push('   - Accesses window object');
    if (se.hasEventListeners) output.push('   - Adds event listeners');
    if (se.hasGlobalAccess) output.push('   - Accesses global variables');
    output.push('');
  }
  
  return output;
}

/**
 * Generates recommendations based on file analysis
 * @param {object} fileData - File analysis data
 * @returns {string[]} Formatted output lines
 */
export function generateRecommendations(fileData) {
  const output = [];
  const connections = fileData.semanticConnections || [];
  
  if (fileData.riskScore?.severity === 'high' || fileData.riskScore?.severity === 'critical') {
    output.push('   HIGH RISK: This file is complex and widely used.');
    output.push('      Consider splitting into smaller modules.\n');
  }

  if (fileData.usedBy?.length > 5) {
    output.push('   WIDELY USED: Changing this file affects many others.');
    output.push('      Review all dependents before making changes.\n');
  }

  if (connections.length > 0) {
    output.push('   HIDDEN CONNECTIONS: This file has semantic connections');
    output.push('      that static analysis alone would not detect.\n');
  }

  if (!fileData.usedBy || fileData.usedBy.length === 0) {
    output.push('   ORPHAN FILE: Not used by any other file.');
    if (!fileData.imports || fileData.imports.length === 0) {
      output.push('      Consider removing if truly dead code.\n');
    }
  }
  
  return output;
}
