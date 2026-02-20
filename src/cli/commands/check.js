import fs from 'fs/promises';
import path from 'path';
import { hasExistingAnalysis } from '#layer-c/storage/setup/index.js';
import { normalizePath } from '../utils/paths.js';

const SEPARATOR = '------------------------------------------------------------';

// ============================================================================
// REFACTORED HELPER FUNCTIONS
// ============================================================================

/**
 * Validates input parameters
 */
function validateInputs(filePath, silent) {
  if (!filePath) {
    if (!silent) {
      console.error('\nError: No file specified!');
      console.error('\nUsage: omnysystem check <file-path>');
      console.error('   Example: omnysystem check src/api.js\n');
    }
    return { valid: false, error: 'No file specified', exitCode: 1 };
  }
  return { valid: true };
}

/**
 * Loads file data from system map
 */
async function loadFileData(projectPath, filePath) {
  const hasAnalysis = await hasExistingAnalysis(projectPath);
  if (!hasAnalysis) {
    return {
      success: false,
      error: 'No analysis data found',
      exitCode: 1,
      hint: 'Run first: omnysystem analyze .'
    };
  }

  const systemMapPath = path.join(projectPath, 'system-map-enhanced.json');
  const systemMapContent = await fs.readFile(systemMapPath, 'utf-8');
  const systemMap = JSON.parse(systemMapContent);

  const normalizedFilePath = normalizePath(filePath);
  let fileData = null;
  let matchedPath = null;

  for (const [key, value] of Object.entries(systemMap.files || {})) {
    const normalizedKey = normalizePath(key);
    if (normalizedKey.endsWith(normalizedFilePath) || normalizedFilePath.endsWith(normalizedKey)) {
      fileData = value;
      matchedPath = key;
      break;
    }
  }

  if (!fileData) {
    const availableFiles = Object.keys(systemMap.files || {}).slice(0, 10);
    return {
      success: false,
      error: `File not found in analysis: ${filePath}`,
      exitCode: 1,
      availableFiles
    };
  }

  return { success: true, fileData, matchedPath, systemMap };
}

/**
 * Formats file metrics section
 */
function formatFileMetrics(fileData) {
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
 */
function formatDependencies(fileData) {
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
 */
function formatSemanticConnections(fileData) {
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
 */
function formatMetadataSection(fileData) {
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
 */
function formatBrokenConnections(fileData) {
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
 */
function formatSideEffects(fileData) {
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
 */
function generateRecommendations(fileData) {
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

// ============================================================================
// MAIN FUNCTION (ORCHESTRATOR)
// ============================================================================

export async function checkLogic(filePath, options = {}) {
  const { silent = false } = options;

  // 1. Validate inputs
  const validation = validateInputs(filePath, silent);
  if (!validation.valid) {
    return { success: false, error: validation.error, exitCode: validation.exitCode };
  }

  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const projectPath = process.cwd();

  try {
    // 2. Load file data
    const loadResult = await loadFileData(projectPath, filePath);
    if (!loadResult.success) {
      if (!silent) {
        console.error(`\n${loadResult.error}`);
        if (loadResult.availableFiles) {
          console.error('\nAvailable files:');
          for (const f of loadResult.availableFiles) {
            console.error(`   - ${f}`);
          }
          console.error('   ...\n');
        }
        if (loadResult.hint) {
          console.error(`\n${loadResult.hint}`);
        }
      }
      return { success: false, error: loadResult.error, exitCode: loadResult.exitCode };
    }

    const { fileData, matchedPath } = loadResult;

    // 3. Build output using extracted formatters
    const output = [];

    if (matchedPath && matchedPath !== filePath) {
      output.push(`Resolved file path: ${matchedPath}\n`);
    }

    output.push(`${SEPARATOR}\n`);
    
    // File metrics
    output.push(...formatFileMetrics(fileData));
    
    // Dependencies
    output.push(...formatDependencies(fileData));
    
    // Semantic connections
    output.push(...formatSemanticConnections(fileData));
    
    // Metadata
    output.push(...formatMetadataSection(fileData));
    
    // Broken connections
    output.push(...formatBrokenConnections(fileData));
    
    // Side effects
    output.push(...formatSideEffects(fileData));

    output.push(SEPARATOR);
    output.push('RECOMMENDATIONS\n');
    
    // Recommendations
    output.push(...generateRecommendations(fileData));

    output.push(SEPARATOR + '\n');

    if (!silent) {
      output.forEach(line => console.log(line));
    }

    return {
      success: true,
      exitCode: 0,
      fileData,
      matchedPath,
      output: output.join('\n')
    };
  } catch (error) {
    if (!silent) {
      console.error('\nCheck failed:');
      console.error(`   ${error.message}\n`);
    }
    return { success: false, error: error.message, exitCode: 1 };
  }
}

export async function check(filePath) {
  const result = await checkLogic(filePath);
  process.exit(result.exitCode);
}
