/**
 * @fileoverview Validation Engine - Motor de validación Meta-Validator
 * 
 * Orquesta la validación de todas las capas siguiendo el flujo:
 * 1. Source Validation (Ground Truth)
 * 2. Derivation Validation (Fractal)
 * 3. Semantic Validation (Data Flow)
 * 4. Cross-Metadata Validation (Insights)
 * 
 * Soporta:
 * - Validación incremental (solo entidades modificadas)
 * - Auto-fix de problemas simples
 * - Caching de resultados
 * - Paralelización de validaciones
 * 
 * @module validation/core/validation-engine
 */

import { createLogger } from '../../utils/logger.js';
import { ValidationReport, ValidationResult, ValidationSeverity } from './validation-result.js';
import { RuleRegistry, getGlobalRegistry } from './rule-registry.js';
import { safeReadJson } from '../../utils/json-safe.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:validation:engine');

/**
 * Contexto de validación
 * Mantiene todo el estado necesario para validar
 */
export class ValidationContext {
  constructor(projectPath, omnysysPath) {
    this.projectPath = projectPath;
    this.omnysysPath = omnysysPath;
    this.files = new Map();      // path -> file metadata
    this.atoms = new Map();      // id -> atom
    this.molecules = new Map();  // id -> molecule
    this.modules = new Map();    // id -> module
    this.sourceCache = new Map(); // path -> source code
    this.astCache = new Map();    // path -> AST
    this.timestamp = new Date().toISOString();
  }

  /**
   * Carga todas las entidades desde .omnysysdata
   */
  async load() {
    logger.info('Loading validation context...');
    
    // Cargar archivos (moléculas actuales)
    await this.loadFiles();
    
    // Cargar índice global
    await this.loadIndex();
    
    logger.info(`Context loaded: ${this.files.size} files`);
    
    return this;
  }

  /**
   * Carga archivos desde .omnysysdata/files/
   */
  async loadFiles() {
    const filesPath = path.join(this.omnysysPath, 'files');
    
    try {
      await this.walkDirectory(filesPath, async (filePath) => {
        if (!filePath.endsWith('.json')) return;
        
        const relativePath = path.relative(filesPath, filePath);
        const data = await safeReadJson(filePath);
        
        if (data) {
          data._omnysysPath = relativePath.replace(/\\/g, '/');
          this.files.set(data.path || relativePath.replace('.json', ''), data);
        }
      });
    } catch (error) {
      logger.warn('No files directory found or error loading:', error.message);
    }
  }

  /**
   * Carga el índice global
   */
  async loadIndex() {
    const indexPath = path.join(this.omnysysPath, 'index.json');
    this.index = await safeReadJson(indexPath) || {};
  }

  /**
   * Recorre directorio recursivamente
   */
  async walkDirectory(dirPath, callback) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, callback);
        } else {
          await callback(fullPath);
        }
      }
    } catch (error) {
      // Directorio no existe, ignorar
    }
  }

  /**
   * Obtiene código fuente (con cache)
   */
  async getSource(filePath) {
    if (this.sourceCache.has(filePath)) {
      return this.sourceCache.get(filePath);
    }
    
    const fullPath = path.join(this.projectPath, filePath);
    try {
      const code = await fs.readFile(fullPath, 'utf-8');
      this.sourceCache.set(filePath, code);
      return code;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtiene una entidad por ID
   */
  getEntity(id) {
    return this.files.get(id) || 
           this.atoms.get(id) || 
           this.molecules.get(id) ||
           this.modules.get(id);
  }

  /**
   * Obtiene todas las entidades de un tipo
   */
  getEntitiesByType(type) {
    switch (type) {
      case 'file':
      case 'molecule':
        return Array.from(this.files.values());
      case 'atom':
        return Array.from(this.atoms.values());
      case 'module':
        return Array.from(this.modules.values());
      default:
        return [];
    }
  }
}

/**
 * Motor de validación principal
 */
export class ValidationEngine {
  constructor(options = {}) {
    this.registry = options.registry || getGlobalRegistry();
    this.context = null;
    this.options = {
      parallel: options.parallel ?? true,
      maxConcurrency: options.maxConcurrency ?? 10,
      autoFix: options.autoFix ?? false,
      incremental: options.incremental ?? false,
      cacheResults: options.cacheResults ?? true,
      stopOnCritical: options.stopOnCritical ?? true,
      ...options
    };
    this.cache = new Map();
  }

  /**
   * Ejecuta validación completa
   */
  async validate(projectPath, omnysysPath) {
    const startTime = Date.now();
    logger.info('='.repeat(70));
    logger.info('STARTING VALIDATION');
    logger.info('='.repeat(70));
    logger.info(`Project: ${projectPath}`);
    logger.info(`Options: ${JSON.stringify(this.options)}`);

    // Crear contexto
    this.context = new ValidationContext(projectPath, omnysysPath);
    await this.context.load();

    // Crear reporte
    const report = new ValidationReport({ projectPath, omnysysPath });

    try {
      // Fase 0: Validar invariantes críticas
      const invariantResults = await this.validateInvariants();
      report.addResults(invariantResults);
      
      if (report.hasCriticalViolations && this.options.stopOnCritical) {
        logger.error('CRITICAL INVARIANTS VIOLATED - STOPPING');
        report.complete();
        return report;
      }

      // Fase 1: Source Validation
      const sourceResults = await this.validateLayer('source');
      report.addResults(sourceResults);
      
      // Fase 2: Derivation Validation (solo si source pasó)
      if (this.shouldContinue(report)) {
        const derivationResults = await this.validateLayer('derivation');
        report.addResults(derivationResults);
      }
      
      // Fase 3: Semantic Validation
      if (this.shouldContinue(report)) {
        const semanticResults = await this.validateLayer('semantic');
        report.addResults(semanticResults);
      }
      
      // Fase 4: Cross-Metadata Validation
      const crossResults = await this.validateLayer('cross-metadata');
      report.addResults(crossResults);

    } catch (error) {
      logger.error('Validation failed with error:', error);
      report.addResult(ValidationResult.critical(
        'validation-engine',
        'execution',
        'success',
        `error: ${error.message}`,
        { details: { stack: error.stack } }
      ));
    }

    report.complete();
    
    logger.info('='.repeat(70));
    logger.info('VALIDATION COMPLETE');
    logger.info(`Duration: ${Date.now() - startTime}ms`);
    logger.info(`Results: ${report.stats.passed} passed, ${report.stats.failed} failed, ${report.stats.critical} critical`);
    logger.info('='.repeat(70));

    return report;
  }

  /**
   * Verifica si debemos continuar con la siguiente capa
   */
  shouldContinue(report) {
    if (!this.options.stopOnCritical) return true;
    return !report.hasCriticalViolations;
  }

  /**
   * Valida invariantes críticas del sistema
   */
  async validateInvariants() {
    logger.info('Phase 0: Validating critical invariants...');
    
    const results = [];
    const invariants = this.registry.getInvariants();
    
    for (const invariant of invariants) {
      const entities = this.context.getEntitiesByType(invariant.appliesTo[0]);
      
      for (const entity of entities) {
        const result = await invariant.validate(entity, this.context);
        results.push(result);
      }
    }
    
    // Invariantes implícitas del sistema
    results.push(...await this.validateSystemInvariants());
    
    return results;
  }

  /**
   * Invariantes del sistema que siempre deben cumplirse
   */
  async validateSystemInvariants() {
    const results = [];
    
    // Invariante: IDs únicos
    const ids = new Set();
    const duplicates = [];
    
    for (const [id, entity] of this.context.files) {
      if (ids.has(id)) {
        duplicates.push(id);
      }
      ids.add(id);
    }
    
    if (duplicates.length > 0) {
      results.push(ValidationResult.critical(
        'system',
        'unique-ids',
        'all unique',
        `${duplicates.length} duplicates: ${duplicates.join(', ')}`
      ));
    }
    
    return results;
  }

  /**
   * Valida una capa específica
   */
  async validateLayer(layer) {
    logger.info(`Phase: ${layer} validation...`);
    
    const rules = this.registry.getByLayer(layer);
    
    if (rules.length === 0) {
      logger.info(`  No rules registered for layer: ${layer}`);
      return [];
    }
    
    logger.info(`  ${rules.length} rules to apply`);
    
    const results = [];
    
    // Agrupar reglas por tipo de entidad para eficiencia
    const rulesByEntity = new Map();
    
    for (const rule of rules) {
      for (const entityType of rule.appliesTo) {
        if (!rulesByEntity.has(entityType)) {
          rulesByEntity.set(entityType, []);
        }
        rulesByEntity.get(entityType).push(rule);
      }
    }
    
    // Validar cada tipo de entidad
    for (const [entityType, typeRules] of rulesByEntity) {
      const entities = this.context.getEntitiesByType(entityType);
      logger.info(`  Validating ${entities.length} ${entityType}(s) with ${typeRules.length} rules`);
      
      for (const entity of entities) {
        const entityResults = await this.validateEntity(entity, typeRules);
        results.push(...entityResults);
        
        // Auto-fix si está habilitado
        if (this.options.autoFix) {
          for (const result of entityResults) {
            if (!result.valid && result.fixable) {
              const rule = this.registry.get(result.rule);
              if (rule) {
                const fixed = await rule.fix(entity, this.context, result);
                if (fixed !== null) {
                  result.markFixed(fixed);
                }
              }
            }
          }
        }
      }
    }
    
    const validCount = results.filter(r => r.valid).length;
    logger.info(`  Results: ${validCount}/${results.length} valid`);
    
    return results;
  }

  /**
   * Valida una entidad contra un conjunto de reglas
   */
  async validateEntity(entity, rules) {
    const results = [];
    
    for (const rule of rules) {
      // Verificar si aplica
      if (!rule.appliesToEntity(entity)) continue;
      
      // Verificar cache
      const cacheKey = `${entity.id}::${rule.id}`;
      if (this.options.cacheResults && this.cache.has(cacheKey)) {
        results.push(this.cache.get(cacheKey));
        continue;
      }
      
      // Verificar campos requeridos
      if (!rule.hasRequiredFields(entity, this.context)) {
        results.push(ValidationResult.warning(
          entity.id,
          null,
          `Rule ${rule.id} skipped: missing required fields`,
          { rule: rule.id, requires: rule.requires }
        ));
        continue;
      }
      
      // Ejecutar validación
      const result = await rule.validate(entity, this.context);
      
      // Guardar en cache
      if (this.options.cacheResults) {
        this.cache.set(cacheKey, result);
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Valida una entidad específica
   */
  async validateSingle(entityId) {
    const entity = this.context?.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }
    
    const rules = this.registry.findApplicable(entity, this.context);
    return this.validateEntity(entity, rules);
  }

  /**
   * Limpia la cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas del engine
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      registryStats: this.registry.getStats(),
      options: this.options
    };
  }
}

/**
 * Función de conveniencia para validación rápida
 */
export async function validate(projectPath, options = {}) {
  const engine = new ValidationEngine(options);
  const omnysysPath = options.omnysysPath || path.join(projectPath, '.omnysysdata');
  return engine.validate(projectPath, omnysysPath);
}

export default { ValidationEngine, ValidationContext, validate };
