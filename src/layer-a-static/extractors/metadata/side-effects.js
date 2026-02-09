/**
 * @fileoverview side-effects.js
 *
 * Side Effects Extractor - Detects I/O, network, DOM, storage operations
 * Part of the metadata extraction pipeline
 *
 * ARCHITECTURE: Layer A (Static Extraction)
 * Pure function that analyzes code strings to detect side effects
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Side Effect Detection
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To detect a new type of side effect (e.g., file system operations,
 * database queries, external process spawning):
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION A: Add Pattern to Existing Categories
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use for variations of existing side effects (e.g., new HTTP library, new DB API)
 *
 * 1️⃣  ADD PATTERN to existing array (line ~24-30 for network, ~44-50 for DOM, etc.)
 *
 *     EXAMPLE - Adding 'ky' HTTP library detection:
 *     
 *     // Network calls patterns (line ~25-30)
 *     const networkPatterns = [
 *       { pattern: /fetch\s*\(/g, type: 'fetch' },
 *       { pattern: /axios\./g, type: 'axios' },
 *       // NEW: ky HTTP library
 *       { pattern: /ky\.(get|post|put|delete)\s*\(/g, type: 'ky' },
 *       { pattern: /ky\s*\(\s*['"`]/g, type: 'ky' },
 *       // ...
 *     ];
 *
 * 2️⃣  UPDATE RETURN OBJECT (line ~85-95) - Add new array if needed:
 *
 *     return {
 *       all: [...networkCalls, ...domManipulations, ...storageAccess, ...fileOperations],
 *       networkCalls,
 *       domManipulations,
 *       storageAccess,
 *       fileOperations,  // NEW category
 *       consoleUsage,
 *       timerUsage
 *     };
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION B: Create New Extractor for Complex Side Effects
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use when the detection requires AST analysis (not just regex),
 * or when you need to track complex patterns across multiple lines.
 *
 * 1️⃣  CREATE NEW FILE in: src/layer-a-static/extractors/metadata/
 *
 *     // database-operations.js
 *     /**
 *      * Detects database operations (SQL, NoSQL)
 *      * @module extractors/metadata/database-operations
 *      * /
 *     export function extractDatabaseOperations(functionCode, functionAst) {
 *       const operations = [];
 *       
 *       // Use AST for precise detection
 *       if (functionAst) {
 *         traverse(functionAst, {
 *           CallExpression(path) {
 *             const callee = path.node.callee;
 *             
 *             // Detect SQL query builders
 *             if (isQueryBuilder(callee)) {
 *               operations.push({
 *                 type: 'sql',
 *                 operation: getOperationType(callee),
 *                 table: extractTableName(path),
 *                 line: path.node.loc?.start?.line
 *               });
 *             }
 *             
 *             // Detect ORM calls
 *             if (isORMCall(callee)) {
 *               operations.push({
 *                 type: 'orm',
 *                 orm: detectORMType(callee),
 *                 operation: path.node.callee.property?.name,
 *                 line: path.node.loc?.start?.line
 *               });
 *             }
 *           }
 *         });
 *       }
 *       
 *       return {
 *         hasDatabaseOperations: operations.length > 0,
 *         operations,
 *         tablesAccessed: [...new Set(operations.map(o => o.table).filter(Boolean))]
 *       };
 *     }
 *
 * 2️⃣  INTEGRATE in molecular-extractor.js (see EXTENSION GUIDE there, line ~11-19):
 *
 *     import { extractDatabaseOperations } from '../extractors/metadata/database-operations.js';
 *     
 *     // In extractAtomMetadata():
 *     const dbOperations = extractDatabaseOperations(functionCode, functionInfo.node);
 *
 * 3️⃣  ADD TO ATOM METADATA (in molecular-extractor.js):
 *
 *     {
 *       // ... existing metadata ...
 *       hasDatabaseOperations: dbOperations.hasDatabaseOperations,
 *       databaseOperations: dbOperations.operations,
 *       tablesAccessed: dbOperations.tablesAccessed,
 *     }
 *
 * 4️⃣  ADD DERIVATION RULE in derivation-engine.js:
 *
 *     moleculeDatabaseAccess: (atoms) => {
 *       const dbAtoms = atoms.filter(a => a.hasDatabaseOperations);
 *       return {
 *         hasDatabaseAccess: dbAtoms.length > 0,
 *         tables: [...new Set(dbAtoms.flatMap(a => a.tablesAccessed))],
 *         totalOperations: dbAtoms.reduce((sum, a) => sum + a.databaseOperations.length, 0)
 *       };
 *     }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  PRINCIPLES TO MAINTAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ Pure function: Same code input = same output, no side effects (ironic, eh?)
 * ✓ Fast regex: Keep patterns simple, avoid backtracking
 * ✓ Line numbers: Always include line for each detection (for IDE integration)
 * ✓ SSOT: This is the ONLY place that defines what constitutes a side effect
 * ✓ Layer A only: Return RAW detections, don't interpret (that's Layer B)
 *   BAD: { isDangerous: true }  // Interpretation
 *   GOOD: { method: 'eval', code: 'eval(userInput)' }  // Raw data
 *
 * 📊  PERFORMANCE NOTES:
 *     - Regex compilation: Patterns are compiled once per call
 *     - For large files: Consider adding early bailout if code is too large
 *     - Caching: molecular-extractor.js caches results, so this runs once per function
 *
 * 🔗  RELATED FILES:
 *     - molecular-extractor.js: Calls this function for each atom
 *     - derivation-engine.js: Derives molecular side effect properties from atoms
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module extractors/metadata/side-effects
 * @phase Layer A (Static Extraction)
 * @dependencies NONE (pure function)
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts side effect patterns from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Categorized side effects
 */
export function extractSideEffects(code) {
  const networkCalls = [];
  const domManipulations = [];
  const storageAccess = [];
  const consoleUsage = [];
  const timerUsage = [];

  // Network calls patterns
  const networkPatterns = [
    { pattern: /fetch\s*\(/g, type: 'fetch' },
    { pattern: /axios\.(get|post|put|delete|patch|request)\s*\(/g, type: 'axios' },
    { pattern: /new\s+XMLHttpRequest\s*\(/g, type: 'xhr' },
    { pattern: /\$\.(get|post|ajax)\s*\(/g, type: 'jquery' }
  ];

  for (const { pattern, type } of networkPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      networkCalls.push({
        type,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // DOM manipulation patterns
  const domPatterns = [
    { pattern: /document\.(getElementById|querySelector|querySelectorAll|createElement|write)\s*\(/g, method: 'access' },
    { pattern: /\.innerHTML\s*=/g, method: 'innerHTML' },
    { pattern: /\.textContent\s*=/g, method: 'textContent' },
    { pattern: /\.appendChild\s*\(/g, method: 'appendChild' },
    { pattern: /\.removeChild\s*\(/g, method: 'removeChild' },
    { pattern: /\.setAttribute\s*\(/g, method: 'setAttribute' }
  ];

  for (const { pattern, method } of domPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      domManipulations.push({
        method,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // Storage access patterns
  const storagePatterns = [
    { pattern: /(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\s*\(/g, type: 'webStorage' },
    { pattern: /document\.cookie/g, type: 'cookie' },
    { pattern: /indexedDB\./g, type: 'indexedDB' }
  ];

  for (const { pattern, type } of storagePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      storageAccess.push({
        type,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // Console usage patterns
  const consolePattern = /console\.(log|warn|error|info|debug|trace)\s*\(/g;
  let match;
  while ((match = consolePattern.exec(code)) !== null) {
    consoleUsage.push({
      method: match[1],
      line: getLineNumber(code, match.index),
      code: match[0]
    });
  }

  // Timer usage patterns
  const timerPatterns = [
    { pattern: /setTimeout\s*\(/g, type: 'setTimeout' },
    { pattern: /setInterval\s*\(/g, type: 'setInterval' },
    { pattern: /requestAnimationFrame\s*\(/g, type: 'requestAnimationFrame' },
    { pattern: /clearTimeout\s*\(/g, type: 'clearTimeout' },
    { pattern: /clearInterval\s*\(/g, type: 'clearInterval' }
  ];

  for (const { pattern, type } of timerPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      timerUsage.push({
        type,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // Combine all
  const all = [
    ...networkCalls.map(c => ({ ...c, category: 'network' })),
    ...domManipulations.map(c => ({ ...c, category: 'dom' })),
    ...storageAccess.map(c => ({ ...c, category: 'storage' })),
    ...consoleUsage.map(c => ({ ...c, category: 'console' })),
    ...timerUsage.map(c => ({ ...c, category: 'timer' }))
  ];

  return {
    networkCalls,
    domManipulations,
    storageAccess,
    consoleUsage,
    timerUsage,
    all
  };
}
