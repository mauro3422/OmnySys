/**
 * @fileoverview Consistency Validator
 * 
 * Valida la consistencia entre sistemas (SSOT - Single Source of Truth)
 * Detecta duplicación y discrepancias entre atoms, files, cache y connections.
 * 
 * Versión 2.0: Refactorizado en módulos especializados
 * 
 * @module consistency/consistency-validator
 * @version 2.0.0
 */

import path from 'path';
import { VerificationStatus } from '../../types/index.js';
import { createLogger } from '../../../../utils/logger.js';

// Sub-módulos
import { DataLoader } from './data-loader/index.js';
import { IssueManager } from './issue-manager/index.js';
import {
  AtomsFilesValidator,
  FilesConnectionsValidator,
  PathValidator,
  DuplicationDetector
} from './validators/index.js';

const logger = createLogger('OmnySys:verification:consistency');

/**
 * Configuration por defecto
 */
const DEFAULT_CONFIG = {
  validateAtomsFiles: true,
  validateFilesConnections: true,
  validatePaths: true,
  detectDuplication: true,
  failOnCritical: true
};

/**
 * Consistency Validator - Orquestador principal
 * 
 * Coordina la validación de consistencia entre todos los sistemas de datos.
 * 
 * @example
 * const validator = new ConsistencyValidator('/path/to/project');
 * const result = await validator.validate();
 * 
 * @example
 * const validator = new ConsistencyValidator('/path/to/project', {
 *   validatePaths: false,
 *   detectDuplication: false
 * });
 */
export class ConsistencyValidator {
  /**
   * @param {string} projectPath - Ruta del proyecto
   * @param {Object} options - Opciones de configuración
   */
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.dataDir = path.join(projectPath, '.omnysysdata');
    this.config = { ...DEFAULT_CONFIG, ...options };
    
    // Componentes
    this.dataLoader = new DataLoader(this.dataDir);
    this.issueManager = new IssueManager();
    
    // Cache de datos cargados
    this.cache = null;
    
    logger.debug('ConsistencyValidator initialized');
  }
  
  /**
   * Valida consistencia entre todos los sistemas
   * @returns {Promise<Object>} - Resultado de validación
   */
  async validate() {
    logger.info('🔄 Starting consistency validation (SSOT)...');
    
    // 1. Cargar datos
    this.cache = await this.dataLoader.loadAll();
    
    // 2. Ejecutar validaciones
    await this.runValidations();
    
    // 3. Determinar estado
    const status = this.determineStatus();
    const issues = this.issueManager.getIssues();
    
    logger.info(`✅ Consistency validation complete: ${issues.length} issues found`);
    
    return {
      status,
      issues,
      stats: this.issueManager.calculateStats(),
      summary: this.issueManager.generateSummary(this.cache)
    };
  }
  
  /**
   * Ejecuta todas las validaciones configuradas
   * @private
   */
  async runValidations() {
    // Validar paths primero (afecta todo lo demás)
    if (this.config.validatePaths) {
      const validator = new PathValidator(this.cache, this.issueManager);
      await validator.validate();
    }
    
    // Validar atoms <-> files
    if (this.config.validateAtomsFiles) {
      const validator = new AtomsFilesValidator(this.cache, this.issueManager);
      await validator.validate();
    }
    
    // Validar files <-> connections
    if (this.config.validateFilesConnections) {
      const validator = new FilesConnectionsValidator(this.cache, this.issueManager);
      await validator.validate();
    }
    
    // Detectar duplicación
    if (this.config.detectDuplication) {
      const detector = new DuplicationDetector(this.cache, this.issueManager);
      await detector.detect();
    }
  }
  
  /**
   * Determina el estado de la validación
   * @private
   */
  determineStatus() {
    const issues = this.issueManager.getIssues();
    
    if (issues.length === 0) {
      return VerificationStatus.PASSED;
    }
    
    if (this.issueManager.hasCriticalIssues() && this.config.failOnCritical) {
      return VerificationStatus.FAILED;
    }
    
    return VerificationStatus.WARNING;
  }
  
  /**
   * Obtiene estadísticas de validación
   * @returns {Object} - Estadísticas
   */
  getStats() {
    return {
      data: this.dataLoader.getStats(),
      issues: this.issueManager.calculateStats()
    };
  }
  
  /**
   * Obtiene issues encontrados
   * @returns {Array} - Lista de issues
   */
  getIssues() {
    return this.issueManager.getIssues();
  }
  
  /**
   * Limpia el estado del validador
   */
  reset() {
    this.dataLoader.clear();
    this.issueManager.clear();
    this.cache = null;
  }
}

// Export legacy para compatibilidad
export default ConsistencyValidator;
