/**
 * @fileoverview consistency-validator.js
 * 
 * Valida la consistencia entre sistemas (SSOT - Single Source of Truth)
 * Detecta duplicación y discrepancias entre atoms, files, cache y connections
 * 
 * @module verification/validators/consistency
 */

import fs from 'fs/promises';
import path from 'path';
import { Severity, IssueCategory, DataSystem, VerificationStatus } from '../types/index.js';
import { createLogger } from '../../../utils/logger.js';
import { normalizePath, isTestFile, classifyFile } from '../utils/path-utils.js';

const logger = createLogger('OmnySys:verification:consistency');

export class ConsistencyValidator {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.dataDir = path.join(projectPath, '.omnysysdata');
    this.issues = [];
    
    // Caché de datos cargados
    this.cache = {
      atoms: new Map(),      // id -> atom
      files: new Map(),      // path -> fileData
      connections: []        // Array de conexiones
    };
  }

  /**
   * Valida consistencia entre todos los sistemas
   */
  async validate() {
    logger.info('🔄 Starting consistency validation (SSOT)...');
    
    // 1. Cargar todos los datos en memoria
    await this.loadAllData();
    
    // 2. Validar consistencia atoms <-> files
    await this.validateAtomsFilesConsistency();
    
    // 3. Validar consistencia files <-> connections
    await this.validateFilesConnectionsConsistency();
    
    // 4. Validar paths consistentes
    await this.validatePathConsistency();
    
    // 5. Detectar duplicación
    await this.detectDuplication();
    
    logger.info(`✅ Consistency validation complete: ${this.issues.length} issues found`);
    
    return {
      status: this.issues.length === 0 ? VerificationStatus.PASSED :
              this.issues.some(i => i.severity === Severity.CRITICAL) ? VerificationStatus.FAILED :
              VerificationStatus.WARNING,
      issues: this.issues,
      stats: this.calculateStats(),
      summary: this.generateSummary()
    };
  }

  /**
   * Obtiene todos los archivos JSON recursivamente
   */
  async getJsonFiles(dir, baseDir = dir) {
    const files = [];
    try {
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
    } catch (error) {
      // Directorio no existe o vacío
    }
    
    return files;
  }

  /**
   * Carga todos los datos en memoria para comparación
   */
  async loadAllData() {
    logger.debug('Loading all data for comparison...');
    
    // Cargar átomos
    const atomsDir = path.join(this.dataDir, 'atoms');
    try {
      const atomFiles = await this.getJsonFiles(atomsDir);
      for (const atomFile of atomFiles) {
        const fullPath = path.join(atomsDir, atomFile);
        const content = await fs.readFile(fullPath, 'utf-8');
        const atom = JSON.parse(content);
        this.cache.atoms.set(atom.id, atom);
      }
      logger.debug(`Loaded ${this.cache.atoms.size} atoms`);
    } catch (error) {
      logger.warn('Could not load atoms:', error.message);
    }
    
    // Cargar files
    const filesDir = path.join(this.dataDir, 'files');
    try {
      const fileJsons = await this.getJsonFiles(filesDir);
      for (const fileJson of fileJsons) {
        const fullPath = path.join(filesDir, fileJson);
        const content = await fs.readFile(fullPath, 'utf-8');
        const fileData = JSON.parse(content);
        const key = fileData.path || fileJson.replace('.json', '');
        this.cache.files.set(key, fileData);
      }
      logger.debug(`Loaded ${this.cache.files.size} files`);
    } catch (error) {
      logger.warn('Could not load files:', error.message);
    }
    
    // Cargar conexiones
    const connectionsDir = path.join(this.dataDir, 'connections');
    try {
      const connFiles = await fs.readdir(connectionsDir);
      for (const connFile of connFiles) {
        if (connFile.endsWith('.json')) {
          const fullPath = path.join(connectionsDir, connFile);
          const content = await fs.readFile(fullPath, 'utf-8');
          const connData = JSON.parse(content);
          if (connData.connections) {
            this.cache.connections.push(...connData.connections);
          }
        }
      }
      logger.debug(`Loaded ${this.cache.connections.length} connections`);
    } catch (error) {
      logger.debug('No connections loaded');
    }
  }

  /**
   * Valida consistencia entre atoms y files
   */
  async validateAtomsFilesConsistency() {
    logger.debug('Validating atoms <-> files consistency...');
    
    // Verificar que cada átomo tenga su archivo correspondiente
    for (const [atomId, atom] of this.cache.atoms) {
      const filePath = normalizePath(atom.filePath);
      const fileData = this.findFileByPath(filePath);
      
      if (!fileData) {
        // 🆕 Si es archivo de test o histórico, es evidencia no error
        if (this.isHistoricalOrTestFile(filePath)) {
          this.addIssue({
            category: IssueCategory.CONSISTENCY,
            severity: Severity.INFO, // Bajar a INFO, no es error real
            system: DataSystem.ATOMS,
            path: atomId,
            message: `Atom references historical/test file (evidence): ${filePath}`,
            suggestion: 'Historical metadata preserved for reference'
          });
        } else {
          this.addIssue({
            category: IssueCategory.CONSISTENCY,
            severity: Severity.HIGH,
            system: DataSystem.ATOMS,
            path: atomId,
            message: `Atom references non-existent file: ${filePath}`,
            suggestion: 'Remove orphaned atom or re-analyze the file'
          });
        }
        continue;
      }
      
      // Verificar que la función exista en el archivo
      const definitions = fileData.definitions || [];
      const funcDef = definitions.find(d => d.name === atom.name && d.type === 'function');
      
      if (!funcDef) {
        this.addIssue({
          category: IssueCategory.CONSISTENCY,
          severity: Severity.MEDIUM,
          system: DataSystem.ATOMS,
          path: atomId,
          message: `Atom function '${atom.name}' not found in file definitions`,
          actual: definitions.map(d => d.name).join(', '),
          suggestion: 'Atom may be stale, re-analysis needed'
        });
      }
      
      // Verificar isExported coincida
      const exportDef = fileData.exports?.find(e => e.name === atom.name);
      const isExportedInFile = !!exportDef;
      if (atom.isExported !== isExportedInFile) {
        this.addIssue({
          category: IssueCategory.CONSISTENCY,
          severity: Severity.MEDIUM,
          system: DataSystem.ATOMS,
          path: atomId,
          message: 'Export status mismatch between atom and file',
          expected: `isExported: ${isExportedInFile}`,
          actual: `isExported: ${atom.isExported}`
        });
      }
    }
    
    // Verificar archivos sin átomos
    for (const [filePath, fileData] of this.cache.files) {
      const definitions = fileData.definitions || [];
      const funcDefs = definitions.filter(d => d.type === 'function');
      
      if (funcDefs.length > 0) {
        // Contar átomos para este archivo
        const fileAtoms = Array.from(this.cache.atoms.values())
          .filter(a => normalizePath(a.filePath) === filePath);
        
        if (fileAtoms.length === 0) {
          // 🆕 Usar clasificación inteligente del archivo
          const classification = classifyFile(filePath);
          
          // Si es documentación o config, no requiere átomos
          if (!classification.extractable) {
            // No reportar issue - es correcto que no tenga átomos
            continue;
          }
          
          // Determinar severidad según tipo
          let severity = Severity.HIGH;
          let suggestion = 'Run atom extraction for this file';
          let note = '';
          
          if (classification.type === 'test') {
            severity = Severity.INFO;
            suggestion = 'Test files - atom extraction optional';
            note = ' (test file)';
          } else if (classification.type === 'script') {
            severity = Severity.MEDIUM; // Scripts deberían tener átomos pero no es crítico
            suggestion = 'Consider running atom extraction for scripts';
            note = ' (script)';
          }
          
          this.addIssue({
            category: IssueCategory.COMPLETENESS,
            severity: severity,
            system: DataSystem.FILES,
            path: filePath,
            message: `File has ${funcDefs.length} functions but no atoms extracted${note}`,
            suggestion: suggestion,
            metadata: {
              fileType: classification.type,
              priority: classification.priority,
              extractable: classification.extractable
            }
          });
        } else if (fileAtoms.length !== funcDefs.length) {
          this.addIssue({
            category: IssueCategory.CONSISTENCY,
            severity: Severity.MEDIUM,
            system: DataSystem.FILES,
            path: filePath,
            message: `Atom count mismatch`,
            expected: `${funcDefs.length} atoms`,
            actual: `${fileAtoms.length} atoms`
          });
        }
      }
    }
  }

  /**
   * Valida consistencia entre files y connections
   */
  async validateFilesConnectionsConsistency() {
    logger.debug('Validating files <-> connections consistency...');
    
    // Verificar que todas las conexiones referencien archivos existentes
    for (const conn of this.cache.connections) {
      const sourceFile = normalizePath(conn.sourceFile);
      const targetFile = normalizePath(conn.targetFile);
      
      // 🆕 Validar source file (con manejo de archivos históricos/test)
      if (!this.findFileByPath(sourceFile)) {
        if (this.isHistoricalOrTestFile(sourceFile)) {
          this.addIssue({
            category: IssueCategory.CONSISTENCY,
            severity: Severity.INFO,
            system: DataSystem.CONNECTIONS,
            path: conn.id,
            message: `Connection references historical/test source (evidence): ${sourceFile}`
          });
        } else {
          this.addIssue({
            category: IssueCategory.CONSISTENCY,
            severity: Severity.HIGH,
            system: DataSystem.CONNECTIONS,
            path: conn.id,
            message: `Connection references non-existent source file: ${sourceFile}`
          });
        }
      }
      
      // 🆕 Validar target file (con manejo de archivos históricos/test)
      if (!this.findFileByPath(targetFile)) {
        if (this.isHistoricalOrTestFile(targetFile)) {
          this.addIssue({
            category: IssueCategory.CONSISTENCY,
            severity: Severity.INFO,
            system: DataSystem.CONNECTIONS,
            path: conn.id,
            message: `Connection references historical/test target (evidence): ${targetFile}`
          });
        } else {
          this.addIssue({
            category: IssueCategory.CONSISTENCY,
            severity: Severity.HIGH,
            system: DataSystem.CONNECTIONS,
            path: conn.id,
            message: `Connection references non-existent target file: ${targetFile}`
          });
        }
      }
      
      // Verificar que la conexión esté reflejada en usedBy/dependsOn
      const sourceData = this.findFileByPath(sourceFile);
      const targetData = this.findFileByPath(targetFile);
      
      if (sourceData && targetData) {
        // Verificar bidireccionalidad básica
        const targetUsedBy = targetData.usedBy || [];
        const sourceInUsedBy = targetUsedBy.some(u => 
          normalizePath(u) === sourceFile
        );
        
        if (!sourceInUsedBy) {
          this.addIssue({
            category: IssueCategory.COHERENCE,
            severity: Severity.MEDIUM,
            system: DataSystem.FILES,
            path: targetFile,
            message: `Connection exists but not reflected in usedBy`,
            suggestion: 'Update file metadata to include connection'
          });
        }
      }
    }
  }

  /**
   * Valida consistencia de paths
   */
  async validatePathConsistency() {
    logger.debug('Validating path consistency...');
    
    const pathFormats = new Map();
    
    // Recopilar formatos de path
    for (const atom of this.cache.atoms.values()) {
      const format = this.detectPathFormat(atom.filePath);
      pathFormats.set(atom.id, { type: 'atom', format, path: atom.filePath });
    }
    
    for (const [filePath, fileData] of this.cache.files) {
      const path = fileData.path || filePath;
      const format = this.detectPathFormat(path);
      pathFormats.set(filePath, { type: 'file', format, path });
    }
    
    // Verificar que todos usen el mismo formato
    const formats = new Set(Array.from(pathFormats.values()).map(p => p.format));
    if (formats.size > 1) {
      const formatsList = Array.from(formats).join(', ');
      this.addIssue({
        category: IssueCategory.STRUCTURE,
        severity: Severity.HIGH,
        system: DataSystem.ATOMS,
        path: 'global',
        message: `Inconsistent path formats detected: ${formatsList}`,
        suggestion: 'Normalize all paths to relative format with forward slashes'
      });
    }
  }

  /**
   * Detecta duplicación de datos
   */
  async detectDuplication() {
    logger.debug('Detecting data duplication...');
    
    // Verificar duplicación: información de exports
    for (const [filePath, fileData] of this.cache.files) {
      const exportsInFile = fileData.exports || [];
      
      for (const exp of exportsInFile) {
        // Buscar átomo correspondiente
        const atomId = `${filePath}::${exp.name}`;
        const atom = this.cache.atoms.get(atomId);
        
        if (atom) {
          // Verificar duplicación de datos básicos
          if (atom.isExported !== true) {
            this.addIssue({
              category: IssueCategory.CONSISTENCY,
              severity: Severity.LOW,
              system: DataSystem.ATOMS,
              path: atomId,
              message: 'Export information duplicated but inconsistent',
              metadata: { atomHas: atom.isExported, fileHas: true }
            });
          }
        }
      }
    }
  }

  /**
   * Detecta el formato de un path
   */
  detectPathFormat(filePath) {
    if (filePath.includes(':\\\\')) return 'windows-absolute';
    if (filePath.includes('C:')) return 'windows-absolute';
    if (filePath.startsWith('/')) return 'unix-absolute';
    if (filePath.includes('\\\\')) return 'windows-relative';
    if (filePath.includes('/') && !filePath.includes('\\')) return 'unix-relative';
    return 'unknown';
  }

  /**
   * Busca un archivo por path (intentando varios formatos)
   */
  findFileByPath(filePath) {
    // Intentar match exacto
    if (this.cache.files.has(filePath)) {
      return this.cache.files.get(filePath);
    }
    
    // Intentar con normalización
    const normalized = normalizePath(filePath);
    if (this.cache.files.has(normalized)) {
      return this.cache.files.get(normalized);
    }
    
    // Buscar por comparación
    for (const [key, value] of this.cache.files) {
      if (normalizePath(key) === normalized) {
        return value;
      }
    }
    
    return null;
  }

  /**
   * Detecta si un archivo es de test o histórico (evidencia, no error)
   */
  isHistoricalOrTestFile(filePath) {
    const testPatterns = [
      /\btest\b/i,
      /\btests\b/i,
      /\btest-cases\b/i,
      /\.test\./i,
      /\.spec\./i,
      /\bscenario-\w+\b/i,
      /\bsmoke-test\b/i,
      /\b__tests__\b/i
    ];
    
    return testPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Agrega un issue
   */
  addIssue({ category, severity, system, path, message, expected, actual, suggestion, metadata }) {
    this.issues.push({
      id: `consistency-${Date.now()}-${this.issues.length}`,
      category,
      severity,
      system,
      path,
      message,
      expected,
      actual,
      suggestion,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Calcula estadísticas
   */
  calculateStats() {
    return {
      atomsFilesMismatch: this.issues.filter(i => 
        i.category === IssueCategory.CONSISTENCY && 
        i.system === DataSystem.ATOMS
      ).length,
      missingFiles: this.issues.filter(i =>
        i.message.includes('non-existent file')
      ).length,
      pathIssues: this.issues.filter(i =>
        i.category === IssueCategory.STRUCTURE
      ).length
    };
  }

  /**
   * Genera resumen
   */
  generateSummary() {
    return {
      totalAtoms: this.cache.atoms.size,
      totalFiles: this.cache.files.size,
      totalConnections: this.cache.connections.length,
      orphanedAtoms: this.issues.filter(i => 
        i.message.includes('non-existent file')
      ).length,
      orphanedFiles: this.issues.filter(i =>
        i.message.includes('no atoms')
      ).length
    };
  }
}

export default ConsistencyValidator;
