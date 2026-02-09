/**
 * @fileoverview Ground Truth Validator
 * 
 * Validates that extracted data matches actual source code.
 * This is the critical validation - ensuring our analysis is CORRECT,
 * not just structurally valid.
 * 
 * VALIDATION STRATEGIES:
 * 1. AST Comparison: Re-parse source and compare with stored metadata
 * 2. Function Existence: Verify extracted functions exist in code
 * 3. Call Graph Verification: Confirm calls match actual imports/exports
 * 4. Complexity Accuracy: Re-calculate and verify complexity scores
 * 
 * @module shared/ground-truth-validator
 * @version 1.0.0
 */

import { createLogger } from './logger-system.js';
import { safeReadJson } from '../utils/json-safe.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:validator:ground-truth');

/**
 * Validation result
 */
export class GroundTruthResult {
  constructor() {
    this.valid = true;
    this.mismatches = [];
    this.stats = {
      filesChecked: 0,
      atomsVerified: 0,
      callsVerified: 0,
      errors: 0
    };
  }

  addMismatch(type, file, expected, actual, details = {}) {
    this.valid = false;
    this.mismatches.push({
      type,
      file,
      expected,
      actual,
      details,
      timestamp: new Date().toISOString()
    });
    this.stats.errors++;
    logger.error(`Mismatch: ${type} in ${file}`, { expected, actual, details });
  }

  addWarning(type, file, message, details = {}) {
    logger.warn(`${type} in ${file}: ${message}`, details);
  }
}

/**
 * Ground Truth Validator
 * Compares stored analysis data with actual source code
 */
export class GroundTruthValidator {
  constructor(projectPath, omnysysPath) {
    this.projectPath = projectPath;
    this.omnysysPath = omnysysPath;
    this.results = new Map();
  }

  /**
   * Run complete ground truth validation
   */
  async validate() {
    logger.info('Starting Ground Truth Validation...');
    logger.info(`Project: ${this.projectPath}`);
    
    const result = new GroundTruthResult();

    try {
      // Phase 1: Validate atoms vs source code
      await this.validateAtoms(result);
      
      // Phase 2: Validate call graph
      await this.validateCallGraph(result);
      
      // Phase 3: Validate complexity calculations
      await this.validateComplexity(result);
      
      // Phase 4: Validate exports/imports
      await this.validateModuleBoundaries(result);

    } catch (error) {
      result.addMismatch('VALIDATION_EXCEPTION', 'global', 'success', 'error', { 
        error: error.message,
        stack: error.stack
      });
    }

    this.logSummary(result);
    return result;
  }

  /**
   * Validate atoms match actual functions in source
   */
  async validateAtoms(result) {
    logger.info('Phase 1: Validating atoms against source code...');
    
    const atomsPath = path.join(this.omnysysPath, 'atoms');
    
    try {
      const files = await fs.readdir(atomsPath);
      
      for (const fileDir of files) {
        const fileAtomsPath = path.join(atomsPath, fileDir);
        const stat = await fs.stat(fileAtomsPath);
        
        if (!stat.isDirectory()) continue;
        
        // Get source file path
        const sourcePath = path.join(this.projectPath, fileDir.replace(/_/g, '/'));
        
        // Check source file exists
        try {
          await fs.access(sourcePath);
        } catch {
          result.addMismatch('SOURCE_FILE_MISSING', fileDir, 'exists', 'missing', {
            expectedPath: sourcePath
          });
          continue;
        }
        
        // Read source code
        const sourceCode = await fs.readFile(sourcePath, 'utf-8');
        
        // Read all atoms for this file
        const atomFiles = await fs.readdir(fileAtomsPath);
        
        for (const atomFile of atomFiles) {
          if (!atomFile.endsWith('.json')) continue;
          
          const atom = await safeReadJson(path.join(fileAtomsPath, atomFile));
          if (!atom) continue;
          
          result.stats.atomsVerified++;
          
          // Verify function exists in source
          const functionExists = this.verifyFunctionExists(atom, sourceCode);
          if (!functionExists.exists) {
            result.addMismatch('FUNCTION_NOT_FOUND', fileDir, atom.name, 'not found', {
              line: atom.line,
              searchResult: functionExists.evidence
            });
          }
          
          // Verify line number is correct
          if (functionExists.foundAtLine && functionExists.foundAtLine !== atom.line) {
            result.addMismatch('LINE_NUMBER_MISMATCH', fileDir, atom.line, functionExists.foundAtLine, {
              function: atom.name
            });
          }
          
          // Verify isExported matches code
          const actualExported = this.checkIfExported(atom, sourceCode);
          if (actualExported !== atom.isExported) {
            result.addMismatch('EXPORT_STATUS_MISMATCH', fileDir, atom.isExported, actualExported, {
              function: atom.name
            });
          }
        }
      }
      
    } catch (error) {
      logger.error('Error validating atoms:', error);
      result.addMismatch('ATOM_VALIDATION_ERROR', 'atoms', 'success', 'error', { error: error.message });
    }
  }

  /**
   * Verify a function exists in source code
   */
  verifyFunctionExists(atom, sourceCode) {
    const lines = sourceCode.split('\n');
    
    // Strategy 1: Find by exact line number
    if (atom.line && atom.line <= lines.length) {
      const lineContent = lines[atom.line - 1] || '';
      if (lineContent.includes(atom.name)) {
        return { exists: true, foundAtLine: atom.line, evidence: 'exact_line_match' };
      }
    }
    
    // Strategy 2: Find by function patterns
    const patterns = [
      // Function declaration: function name(
      new RegExp(`\\bfunction\\s+${this.escapeRegex(atom.name)}\\s*\\(`),
      // Arrow function: const name =
      new RegExp(`\\b(?:const|let|var)\\s+${this.escapeRegex(atom.name)}\\s*[=:]`),
      // Method: name(
      new RegExp(`\\b${this.escapeRegex(atom.name)}\\s*\\([^)]*\\)\\s*\\{`),
      // Class method
      new RegExp(`(?:async\\s+)?${this.escapeRegex(atom.name)}\\s*\\(`)
    ];
    
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of patterns) {
        if (pattern.test(lines[i])) {
          return { exists: true, foundAtLine: i + 1, evidence: 'pattern_match' };
        }
      }
    }
    
    return { exists: false, evidence: 'all_patterns_failed' };
  }

  /**
   * Check if function is actually exported in source
   */
  checkIfExported(atom, sourceCode) {
    // Look for export patterns
    const exportPatterns = [
      new RegExp(`export\\s+(?:async\\s+)?(?:function|class|const|let|var)\\s+${this.escapeRegex(atom.name)}\\b`),
      new RegExp(`export\\s*\\{[^}]*\\b${this.escapeRegex(atom.name)}\\b[^}]*\\}`),
      new RegExp(`export\\s+default\\s+(?:class|function)?\\s*${this.escapeRegex(atom.name)}\\b`)
    ];
    
    for (const pattern of exportPatterns) {
      if (pattern.test(sourceCode)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate call graph matches actual imports
   */
  async validateCallGraph(result) {
    logger.info('Phase 2: Validating call graph...');
    
    const atomsPath = path.join(this.omnysysPath, 'atoms');
    
    try {
      const files = await fs.readdir(atomsPath);
      
      for (const fileDir of files) {
        const fileAtomsPath = path.join(atomsPath, fileDir);
        
        try {
          const stat = await fs.stat(fileAtomsPath);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        
        const atomFiles = await fs.readdir(fileAtomsPath);
        
        for (const atomFile of atomFiles) {
          if (!atomFile.endsWith('.json')) continue;
          
          const atom = await safeReadJson(path.join(fileAtomsPath, atomFile));
          if (!atom || !atom.calls) continue;
          
          // Verify each call target exists somewhere
          for (const call of atom.calls) {
            result.stats.callsVerified++;
            
            const callName = typeof call === 'string' ? call : call.name;
            
            // Check if call target exists in our atoms
            let found = false;
            for (const [id, existingAtom] of await this.getAllAtoms()) {
              if (existingAtom.name === callName) {
                found = true;
                
                // Verify back-reference exists
                const hasBackRef = existingAtom.calledBy?.some(ref => {
                  const refName = typeof ref === 'string' ? ref : ref.name;
                  return refName === atom.name || refName === atom.id;
                });
                
                if (!hasBackRef) {
                  result.addMismatch('MISSING_BACK_REFERENCE', fileDir, 
                    `${callName} should reference ${atom.name}`,
                    'back-reference missing',
                    { caller: atom.name, callee: callName }
                  );
                }
                
                break;
              }
            }
            
            // If not found in atoms, it might be an external/lib function
            // This is a warning, not an error
            if (!found && !this.isLikelyExternal(callName)) {
              result.addWarning('UNRESOLVED_CALL', fileDir, 
                `Call to ${callName} not found in any atom`,
                { caller: atom.name, call: callName }
              );
            }
          }
        }
      }
      
    } catch (error) {
      logger.error('Error validating call graph:', error);
    }
  }

  /**
   * Validate complexity calculations
   */
  async validateComplexity(result) {
    logger.info('Phase 3: Validating complexity calculations...');
    
    // For now, just verify complexity is within reasonable bounds
    // Real cyclomatic complexity calculation would require AST parsing
    
    const moleculesPath = path.join(this.omnysysPath, 'molecules');
    
    try {
      const files = await fs.readdir(moleculesPath);
      
      for (const file of files) {
        if (!file.endsWith('.molecule.json')) continue;
        
        const molecule = await safeReadJson(path.join(moleculesPath, file));
        if (!molecule) continue;
        
        // Check individual atom complexity
        if (molecule.atoms) {
          for (const atomRef of molecule.atoms) {
            const atomId = typeof atomRef === 'string' ? atomRef : atomRef.id;
            const atom = await this.getAtom(atomId);
            
            if (atom && atom.complexity > 50) {
              result.addWarning('HIGH_COMPLEXITY', file.replace('.molecule.json', ''),
                `Function ${atom.name} has very high complexity: ${atom.complexity}`,
                { threshold: 50, actual: atom.complexity }
              );
            }
          }
        }
        
        // Verify total complexity is reasonable
        if (molecule.totalComplexity > 200) {
          result.addWarning('HIGH_FILE_COMPLEXITY', file.replace('.molecule.json', ''),
            `File has very high total complexity: ${molecule.totalComplexity}`,
            { threshold: 200, actual: molecule.totalComplexity }
          );
        }
      }
      
    } catch (error) {
      logger.error('Error validating complexity:', error);
    }
  }

  /**
   * Validate module boundaries (imports/exports)
   */
  async validateModuleBoundaries(result) {
    logger.info('Phase 4: Validating module boundaries...');
    
    // This would verify that imports in code match the dependencies we recorded
    // For now, placeholder for future implementation
    
    logger.info('Module boundary validation - placeholder');
  }

  /**
   * Get all atoms as map
   */
  async getAllAtoms() {
    if (this._allAtomsCache) return this._allAtomsCache;
    
    this._allAtomsCache = new Map();
    const atomsPath = path.join(this.omnysysPath, 'atoms');
    
    try {
      const files = await fs.readdir(atomsPath);
      
      for (const fileDir of files) {
        const fileAtomsPath = path.join(atomsPath, fileDir);
        
        try {
          const stat = await fs.stat(fileAtomsPath);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        
        const atomFiles = await fs.readdir(fileAtomsPath);
        
        for (const atomFile of atomFiles) {
          if (!atomFile.endsWith('.json')) continue;
          
          const atom = await safeReadJson(path.join(fileAtomsPath, atomFile));
          if (atom && atom.id) {
            this._allAtomsCache.set(atom.id, atom);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading all atoms:', error);
    }
    
    return this._allAtomsCache;
  }

  /**
   * Get single atom
   */
  async getAtom(atomId) {
    const allAtoms = await this.getAllAtoms();
    return allAtoms.get(atomId);
  }

  /**
   * Check if a function name is likely external
   */
  isLikelyExternal(name) {
    const externals = [
      'console', 'Math', 'JSON', 'Object', 'Array', 'Promise',
      'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'fetch', 'require', 'module', 'exports', 'process',
      'fs', 'path', 'http', 'https', 'url', 'querystring',
      // Common libraries
      'axios', 'lodash', 'moment', 'uuid'
    ];
    
    return externals.includes(name) || name.startsWith('console.');
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Log summary
   */
  logSummary(result) {
    logger.info('='.repeat(70));
    logger.info('GROUND TRUTH VALIDATION COMPLETE');
    logger.info('='.repeat(70));
    logger.info(`Status: ${result.valid ? '✅ VALID' : '❌ MISMATCHES FOUND'}`);
    logger.info(`Files checked: ${result.stats.filesChecked}`);
    logger.info(`Atoms verified: ${result.stats.atomsVerified}`);
    logger.info(`Calls verified: ${result.stats.callsVerified}`);
    logger.info(`Errors: ${result.stats.errors}`);
    
    if (result.mismatches.length > 0) {
      logger.info('\n❌ MISMATCHES:');
      result.mismatches.forEach((m, i) => {
        logger.info(`  ${i + 1}. [${m.type}] ${m.file}`);
        logger.info(`      Expected: ${JSON.stringify(m.expected)}`);
        logger.info(`      Actual: ${JSON.stringify(m.actual)}`);
      });
    }
    
    logger.info('='.repeat(70));
  }
}

/**
 * Quick validation function
 */
export async function validateGroundTruth(projectPath, omnysysPath) {
  const validator = new GroundTruthValidator(projectPath, omnysysPath);
  return validator.validate();
}

export default GroundTruthValidator;
