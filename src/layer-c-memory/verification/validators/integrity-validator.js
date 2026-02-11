/**
 * @fileoverview integrity-validator.js
 * 
 * Valida la integridad de los datos:
 * - JSONs bien formados
 * - Campos requeridos presentes
 * - Tipos de datos correctos
 * 
 * @module verification/validators/integrity
 */

import fs from 'fs/promises';
import path from 'path';
import { Severity, IssueCategory, DataSystem, VerificationStatus } from '../types/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:verification:integrity');

/**
 * Esquema de campos requeridos por tipo de átomo
 */
const ATOM_REQUIRED_FIELDS = [
  'id', 'name', 'type', 'filePath', 'line', 
  'complexity', 'archetype', 'extractedAt'
];

/**
 * Esquema de campos requeridos por tipo de archivo
 */
const FILE_REQUIRED_FIELDS = [
  'path', 'imports', 'exports', 'definitions'
];

export class IntegrityValidator {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.dataDir = path.join(projectPath, '.omnysysdata');
    this.issues = [];
  }

  /**
   * Valida la integridad de todos los sistemas
   */
  async validate() {
    logger.info('🔍 Starting integrity validation...');
    
    // Validar átomos
    await this.validateAtoms();
    
    // Validar archivos
    await this.validateFiles();
    
    // Validar conexiones
    await this.validateConnections();
    
    // Validar cache
    await this.validateCache();
    
    logger.info(`✅ Integrity validation complete: ${this.issues.length} issues found`);
    
    return {
      status: this.issues.length === 0 ? VerificationStatus.PASSED : 
              this.issues.some(i => i.severity === Severity.CRITICAL) ? VerificationStatus.FAILED :
              VerificationStatus.WARNING,
      issues: this.issues,
      stats: this.calculateStats()
    };
  }

  /**
   * Obtiene todos los archivos JSON recursivamente
   */
  async getJsonFiles(dir, baseDir = dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.getJsonFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(path.relative(baseDir, fullPath));
      }
    }
    
    return files;
  }

  /**
   * Valida integridad de átomos
   */
  async validateAtoms() {
    logger.debug('Validating atoms...');
    const atomsDir = path.join(this.dataDir, 'atoms');
    
    try {
      const atomFiles = await this.getJsonFiles(atomsDir);
      
      for (const atomFile of atomFiles) {
        const fullPath = path.join(atomsDir, atomFile);
        await this.validateAtomFile(fullPath, atomFile);
      }
      
      logger.debug(`✓ Validated ${atomFiles.length} atom files`);
    } catch (error) {
      logger.error('Failed to validate atoms:', error.message);
      this.addIssue({
        category: IssueCategory.STRUCTURE,
        severity: Severity.CRITICAL,
        system: DataSystem.ATOMS,
        path: atomsDir,
        message: `Cannot read atoms directory: ${error.message}`
      });
    }
  }

  /**
   * Valida un archivo de átomo individual
   */
  async validateAtomFile(fullPath, relativePath) {
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // 1. Verificar JSON válido
      let atom;
      try {
        atom = JSON.parse(content);
      } catch (parseError) {
        this.addIssue({
          category: IssueCategory.INTEGRITY,
          severity: Severity.CRITICAL,
          system: DataSystem.ATOMS,
          path: relativePath,
          message: `Invalid JSON: ${parseError.message}`,
          suggestion: 'Re-run analysis to regenerate this atom'
        });
        return;
      }
      
      // 2. Verificar campos requeridos
      const missingFields = ATOM_REQUIRED_FIELDS.filter(field => !(field in atom));
      if (missingFields.length > 0) {
        this.addIssue({
          category: IssueCategory.COMPLETENESS,
          severity: Severity.HIGH,
          system: DataSystem.ATOMS,
          path: relativePath,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          expected: ATOM_REQUIRED_FIELDS.join(', '),
          actual: Object.keys(atom).join(', ')
        });
      }
      
      // 3. Verificar tipos de datos
      if (atom.complexity !== undefined && typeof atom.complexity !== 'number') {
        this.addIssue({
          category: IssueCategory.INTEGRITY,
          severity: Severity.MEDIUM,
          system: DataSystem.ATOMS,
          path: relativePath,
          message: `Invalid type for 'complexity': expected number, got ${typeof atom.complexity}`,
          expected: 'number',
          actual: typeof atom.complexity
        });
      }
      
      // 4. Verificar archetype válido
      if (atom.archetype && typeof atom.archetype === 'object') {
        if (!atom.archetype.type) {
          this.addIssue({
            category: IssueCategory.COMPLETENESS,
            severity: Severity.MEDIUM,
            system: DataSystem.ATOMS,
            path: relativePath,
            message: 'Archetype missing type field',
            suggestion: 'Archetype should have type, severity, and confidence'
          });
        }
      }
      
    } catch (error) {
      this.addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.HIGH,
        system: DataSystem.ATOMS,
        path: relativePath,
        message: `Failed to read atom: ${error.message}`
      });
    }
  }

  /**
   * Valida integridad de archivos
   */
  async validateFiles() {
    logger.debug('Validating files...');
    const filesDir = path.join(this.dataDir, 'files');
    
    try {
      const fileJsons = await this.getJsonFiles(filesDir);
      
      for (const fileJson of fileJsons) {
        const fullPath = path.join(filesDir, fileJson);
        await this.validateFileJson(fullPath, fileJson);
      }
      
      logger.debug(`✓ Validated ${fileJsons.length} file JSONs`);
    } catch (error) {
      logger.error('Failed to validate files:', error.message);
    }
  }

  /**
   * Valida un archivo JSON individual
   */
  async validateFileJson(fullPath, relativePath) {
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      
      let fileData;
      try {
        fileData = JSON.parse(content);
      } catch (parseError) {
        this.addIssue({
          category: IssueCategory.INTEGRITY,
          severity: Severity.CRITICAL,
          system: DataSystem.FILES,
          path: relativePath,
          message: `Invalid JSON: ${parseError.message}`
        });
        return;
      }
      
      // Verificar campos requeridos
      const missingFields = FILE_REQUIRED_FIELDS.filter(field => !(field in fileData));
      if (missingFields.length > 0) {
        this.addIssue({
          category: IssueCategory.COMPLETENESS,
          severity: Severity.HIGH,
          system: DataSystem.FILES,
          path: relativePath,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
      
    } catch (error) {
      this.addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.HIGH,
        system: DataSystem.FILES,
        path: relativePath,
        message: `Failed to read file: ${error.message}`
      });
    }
  }

  /**
   * Valida conexiones
   */
  async validateConnections() {
    logger.debug('Validating connections...');
    const connectionsDir = path.join(this.dataDir, 'connections');
    
    try {
      const connectionFiles = await fs.readdir(connectionsDir);
      
      for (const connFile of connectionFiles) {
        if (connFile.endsWith('.json')) {
          const fullPath = path.join(connectionsDir, connFile);
          await this.validateConnectionFile(fullPath, connFile);
        }
      }
    } catch (error) {
      logger.debug('No connections directory or empty');
    }
  }

  /**
   * Valida archivo de conexiones
   */
  async validateConnectionFile(fullPath, relativePath) {
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const connData = JSON.parse(content);
      
      if (!connData.connections || !Array.isArray(connData.connections)) {
        this.addIssue({
          category: IssueCategory.INTEGRITY,
          severity: Severity.HIGH,
          system: DataSystem.CONNECTIONS,
          path: relativePath,
          message: 'Missing or invalid connections array'
        });
      }
    } catch (error) {
      this.addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.HIGH,
        system: DataSystem.CONNECTIONS,
        path: relativePath,
        message: `Invalid connections file: ${error.message}`
      });
    }
  }

  /**
   * Valida cache
   */
  async validateCache() {
    logger.debug('Validating cache...');
    const cacheIndex = path.join(this.dataDir, 'cache', 'index.json');
    
    try {
      const content = await fs.readFile(cacheIndex, 'utf-8');
      const cache = JSON.parse(content);
      
      if (!cache.entries || typeof cache.entries !== 'object') {
        this.addIssue({
          category: IssueCategory.INTEGRITY,
          severity: Severity.HIGH,
          system: DataSystem.CACHE,
          path: 'cache/index.json',
          message: 'Cache index missing entries object'
        });
      }
    } catch (error) {
      this.addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.MEDIUM,
        system: DataSystem.CACHE,
        path: 'cache/index.json',
        message: `Cache index issue: ${error.message}`
      });
    }
  }

  /**
   * Agrega un issue a la lista
   */
  addIssue({ category, severity, system, path, message, expected, actual, suggestion }) {
    this.issues.push({
      id: `integrity-${Date.now()}-${this.issues.length}`,
      category,
      severity,
      system,
      path,
      message,
      expected,
      actual,
      suggestion,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Calcula estadísticas
   */
  calculateStats() {
    const stats = {};
    
    Object.values(DataSystem).forEach(system => {
      const systemIssues = this.issues.filter(i => i.system === system);
      stats[system] = {
        total: systemIssues.length,
        bySeverity: {
          critical: systemIssues.filter(i => i.severity === Severity.CRITICAL).length,
          high: systemIssues.filter(i => i.severity === Severity.HIGH).length,
          medium: systemIssues.filter(i => i.severity === Severity.MEDIUM).length,
          low: systemIssues.filter(i => i.severity === Severity.LOW).length
        }
      };
    });
    
    return stats;
  }
}

export default IntegrityValidator;
