/**
 * @fileoverview File Culture Classifier
 * 
 * Classifies each file into a "culture" based on static deterministic rules,
 * without needing LLM.
 * 
 * Cultures:
 * - gatekeeper: Barrel files (index.js that only re-export)
 * - laws: Config/Constants (files with constants but no functions)
 * - auditor: Tests (testing files)
 * - script: Automation (automation scripts)
 * - citizen: Worker/Logic (business logic)
 * 
 * @module layer-a-static/analysis/file-culture-classifier
 */

/**
 * Classifies a file into a "culture" based on static rules
 * 
 * @param {Object} fileNode - File node with metadata
 * @param {string} fileNode.filePath - File path
 * @param {Array} fileNode.functions - List of functions (atoms)
 * @param {Array} fileNode.exports - List of exports
 * @param {Array} fileNode.objectExports - Exported constants as object
 * @param {Array} fileNode.constantExports - Exported constants
 * @param {Array} fileNode.classes - List of classes
 * @returns {Object} - Culture and classification metadata
 */
export function classifyFileCulture(fileNode) {
  // Support both 'path' and 'filePath' keys
  const filePath = fileNode.filePath || fileNode.path || '';
  
  // Support multiple key names for atoms/functions/definitions
  const functions = fileNode.functions || fileNode.atoms || fileNode.definitions || [];
  const classes = fileNode.classes || [];
  const exports = fileNode.exports || [];
  const objectExports = fileNode.objectExports || [];
  const constantExports = fileNode.constantExports || [];
  
  const atomCount = functions.length;
  const hasParticles = objectExports.length > 0 || constantExports.length > 0;
  const exportCount = exports.length;
  
  // THE ENTRY POINT (CLI/Server/Main)
  // Files at root that are executable entry points
  if (isEntryPoint(filePath)) {
    return {
      culture: 'entrypoint',
      role: 'System entry point (CLI, server, main)',
      atoms: atomCount,
      imports: fileNode.imports?.length || 0,
      symbol: '🚀'
    };
  }
  
  // THE AUDITOR (Tests) - Location-based detection
  if (isTestFile(filePath)) {
    return {
      culture: 'auditor',
      role: 'Observes and validates production atoms',
      atoms: atomCount,
      symbol: '🔍'
    };
  }
  
  // THE GATEKEEPER (Barrel Files)
  if (atomCount === 0 && exportCount > 0 && filePath.endsWith('index.js')) {
    return {
      culture: 'gatekeeper',
      role: 'Organizes module exports',
      exportsCount: exportCount,
      symbol: '🏛️'
    };
  }
  
  // THE LAWS (Config/Constants/Static Data)
  // Includes: config files, constants, templates, schemas, type definitions
  // Any file that exports static data without functions
  if (atomCount === 0 && classes.length === 0 && (hasParticles || exportCount > 0)) {
    return {
      culture: 'laws',
      role: 'Defines constants/templates that condition the system',
      particles: [...objectExports, ...constantExports],
      exports: exportCount,
      symbol: '⚖️'
    };
  }
  
  // THE SCRIPT (Automation)
  if (isScriptFile(filePath) && atomCount > 0) {
    return {
      culture: 'script',
      role: 'Automates maintenance tasks',
      atoms: atomCount,
      symbol: '🛠️'
    };
  }
  
  // THE CITIZEN (Worker/Logic)
  if (atomCount > 0) {
    return {
      culture: 'citizen',
      role: 'Productive business logic',
      atoms: atomCount,
      symbol: '👷'
    };
  }
  
  // Unknown (empty files, assets, styles)
  return {
    culture: 'unknown',
    role: 'Unclassified',
    note: 'File without atoms or significant particles',
    symbol: '❓'
  };
}

/**
 * Checks if a file is a test file
 * @param {string} filePath - File path
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.js$/.test(filePath) || 
         /^tests?\//.test(filePath) ||
         /\/tests?\//.test(filePath) ||
         /__tests__/.test(filePath);
}

/**
 * Checks if a file is an automation script
 * @param {string} filePath - File path
 * @returns {boolean}
 */
function isScriptFile(filePath) {
  return /^scripts?\//.test(filePath);
}

/**
 * Checks if a file is a system entry point
 * Entry points are typically: main.js, index.js at root, CLI files, server files
 * @param {string} filePath - File path
 * @returns {boolean}
 */
function isEntryPoint(filePath) {
  // Root level entry points
  const rootEntryPoints = [
    'main.js', 'main.mjs', 'index.js', 'server.js', 'app.js',
    'omny.js', 'omnysystem.js', 'cli.js'
  ];
  
  // Check if it's a root level file that matches entry point patterns
  const fileName = filePath.split('/').pop();
  const isRootFile = !filePath.includes('/') || filePath.indexOf('/') === filePath.lastIndexOf('/');
  
  if (isRootFile && rootEntryPoints.includes(fileName)) {
    return true;
  }
  
  // Common entry point patterns
  if (/^src\/(cli|server|app|main|index)\.js$/.test(filePath)) {
    return true;
  }
  
  // bin/ directory files
  if (/^bin\//.test(filePath)) {
    return true;
  }
  
  return false;
}

/**
 * Classifies all files in a systemMap
 * 
 * @param {Object} systemMap - System map with files
 * @returns {Object} - Map of filePath -> culture
 */
export function classifyAllFiles(systemMap) {
  const cultures = {};
  const stats = {
    entrypoint: 0,
    gatekeeper: 0,
    laws: 0,
    auditor: 0,
    script: 0,
    citizen: 0,
    unknown: 0
  };
  
  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    const classification = classifyFileCulture(fileNode);
    cultures[filePath] = classification;
    stats[classification.culture]++;
  }
  
  return { cultures, stats };
}

/**
 * Adds culture field to each fileNode in systemMap
 * 
 * @param {Object} systemMap - System map to enrich
 * @returns {Object} - System map with culture field added
 */
export function enrichWithCulture(systemMap) {
  if (!systemMap?.files) return systemMap;
  
  const { cultures, stats } = classifyAllFiles(systemMap);
  
  for (const [filePath, classification] of Object.entries(cultures)) {
    if (systemMap.files[filePath]) {
      systemMap.files[filePath].culture = classification.culture;
      systemMap.files[filePath].cultureRole = classification.role;
    }
  }
  
  // Add stats to metadata
  if (!systemMap.metadata) systemMap.metadata = {};
  systemMap.metadata.cultureStats = stats;
  
  return systemMap;
}

// Culture constants for external use
export const CULTURES = {
  ENTRYPOINT: 'entrypoint',
  GATEKEEPER: 'gatekeeper',
  LAWS: 'laws',
  AUDITOR: 'auditor',
  SCRIPT: 'script',
  CITIZEN: 'citizen',
  UNKNOWN: 'unknown'
};

// Culture descriptions
export const CULTURE_DESCRIPTIONS = {
  [CULTURES.ENTRYPOINT]: {
    name: 'EntryPoint',
    description: 'System entry points (CLI, server, main files)',
    pattern: 'root level: main.js, cli.js, server.js, app.js, omny.js, omnysystem.js'
  },
  [CULTURES.GATEKEEPER]: {
    name: 'Gatekeeper',
    description: 'Barrel files that organize exports without containing logic',
    pattern: 'atoms=0 AND exports>0 AND filename=index.js'
  },
  [CULTURES.LAWS]: {
    name: 'Laws',
    description: 'Config/constant files that define system constraints',
    pattern: 'atoms=0 AND (objectExports>0 OR constantExports>0)'
  },
  [CULTURES.AUDITOR]: {
    name: 'Auditor',
    description: 'Test files that validate production code',
    pattern: 'filepath matches /.test.|.spec.|tests?//'
  },
  [CULTURES.SCRIPT]: {
    name: 'Script',
    description: 'Automation scripts for maintenance tasks',
    pattern: 'filepath starts with scripts/ AND atoms>0'
  },
  [CULTURES.CITIZEN]: {
    name: 'Citizen',
    description: 'Business logic files that do the real work',
    pattern: 'atoms>0 AND not matching other patterns'
  },
  [CULTURES.UNKNOWN]: {
    name: 'Unknown',
    description: 'Unclassified files (empty, assets, etc.)',
    pattern: 'no atoms or particles'
  }
};