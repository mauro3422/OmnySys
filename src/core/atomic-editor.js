/**
 * @fileoverview atomic-editor.js
 * 
 * Sistema de Edición Atómica
 * Conecta herramientas de edición con el sistema de vibración de átomos
 * 
 * Cada edición:
 * 1. Valida sintaxis antes de guardar
 * 2. Actualiza el átomo inmediatamente  
 * 3. Propaga vibración a dependientes
 * 4. Invalida cachés afectadas
 * 
 * @module core/atomic-editor
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { EventEmitter } from 'events';

const logger = createLogger('OmnySys:atomic:editor');

/**
 * Editor Atómico - Conecta ediciones con el sistema de átomos
 * @extends EventEmitter
 */
export class AtomicEditor extends EventEmitter {
  constructor(projectPath, orchestrator) {
    super();
    this.projectPath = projectPath;
    this.orchestrator = orchestrator;
    this.pendingValidations = new Map();
  }

  /**
   * Edita un archivo con validación atómica completa
   * 
   * @param {string} filePath - Ruta del archivo a editar
   * @param {string} oldString - Texto a reemplazar
   * @param {string} newString - Texto nuevo
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} - Resultado de la edición
   */
  async edit(filePath, oldString, newString, options = {}) {
    const absolutePath = path.join(this.projectPath, filePath);
    
    logger.info(`📝 Atomic Edit: ${filePath}`);
    
    try {
      // PASO 0: Leer contenido actual
      const currentContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Verificar que oldString existe
      if (!currentContent.includes(oldString)) {
        throw new Error(`oldString not found in file: ${oldString.substring(0, 50)}...`);
      }
      
      // PASO 1: Preparar nuevo contenido
      const newContent = currentContent.replace(oldString, newString);
      
      // PASO 2: VALIDACIÓN CRÍTICA - Verificar sintaxis
      logger.info(`  🔍 Validating syntax...`);
      const validation = await this.validateSyntax(filePath, newContent);
      
      if (!validation.valid) {
        // 🚨 ERROR: Emitir vibración de error
        this.emit('atom:validation:failed', {
          file: filePath,
          error: validation.error,
          line: validation.line,
          column: validation.column,
          severity: 'critical'
        });
        
        logger.error(`  ❌ SYNTAX ERROR in ${filePath}:`);
        logger.error(`     ${validation.error}`);
        logger.error(`     Line ${validation.line}, Column ${validation.column}`);
        
        throw new Error(`Syntax error prevents edit: ${validation.error}`);
      }
      
      logger.info(`  ✅ Syntax valid`);
      
      // PASO 3: Análisis de impacto - ¿Qué átomos se afectan?
      logger.info(`  🔍 Analyzing impact...`);
      const impact = await this.analyzeImpact(filePath, oldString, newString);
      
      logger.info(`  📊 Impact: ${impact.affectedFiles.length} files, ${impact.changedSymbols.length} symbols`);
      
      // PASO 4: GUARDAR el archivo
      await fs.writeFile(absolutePath, newContent, 'utf-8');
      logger.info(`  💾 File saved`);
      
      // PASO 5: ACTUALIZAR ÁTOMO inmediatamente
      logger.info(`  🔄 Updating atom...`);
      await this.updateAtom(filePath, newContent, impact);
      
      // PASO 6: PROPAGAR VIBRACIÓN a dependientes
      logger.info(`  📡 Propagating vibration...`);
      await this.propagateVibration(filePath, impact);
      
      // PASO 7: Invalidar cachés
      await this.invalidateCaches(filePath, impact);
      
      // PASO 8: Emitir evento de éxito
      this.emit('atom:modified', {
        file: filePath,
        changes: {
          added: newString.length,
          removed: oldString.length,
          net: newString.length - oldString.length
        },
        impact,
        timestamp: Date.now()
      });
      
      logger.info(`  ✅ Atomic edit complete`);
      
      return {
        success: true,
        file: filePath,
        impact,
        validation
      };
      
    } catch (error) {
      // Emitir error
      this.emit('atom:edit:failed', {
        file: filePath,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * Valida sintaxis de JavaScript/TypeScript
   */
  async validateSyntax(filePath, content) {
    try {
      // Usar Node.js para validar sintaxis
      const { execSync } = await import('child_process');
      const tmpFile = path.join(this.projectPath, '.tmp-validation.js');
      
      // Escribir a archivo temporal
      await fs.writeFile(tmpFile, content, 'utf-8');
      
      try {
        // Validar con node --check
        execSync(`node --check "${tmpFile}"`, { 
          encoding: 'utf-8',
          timeout: 5000
        });
        
        // Limpiar temporal
        await fs.unlink(tmpFile).catch(() => {});
        
        return { valid: true };
        
      } catch (error) {
        // Limpiar temporal
        await fs.unlink(tmpFile).catch(() => {});
        
        // Parsear error de sintaxis
        const errorMatch = error.stderr?.match(/(\d+):(\d+)\s*-\s*(.+)/);
        
        return {
          valid: false,
          error: error.stderr?.split('\n')[0] || error.message,
          line: errorMatch ? parseInt(errorMatch[1]) : null,
          column: errorMatch ? parseInt(errorMatch[2]) : null,
          details: error.stderr
        };
      }
      
    } catch (error) {
      return {
        valid: false,
        error: `Validation system error: ${error.message}`
      };
    }
  }

  /**
   * Analiza el impacto de un cambio
   */
  async analyzeImpact(filePath, oldString, newString) {
    const affectedFiles = [];
    const changedSymbols = [];
    
    try {
      // Importar sistema de queries
      const { getFileDependents, getFileAnalysis } = await import('#layer-a/query/apis/file-api.js');
      
      // Obtener dependientes del archivo
      const dependents = await getFileDependents(this.projectPath, filePath);
      affectedFiles.push(...(dependents || []));
      
      // Detectar qué símbolos cambiaron
      const oldExports = this.extractExports(oldString);
      const newExports = this.extractExports(newString);
      
      for (const exp of newExports) {
        const oldExp = oldExports.find(e => e.name === exp.name);
        if (!oldExp || oldExp.signature !== exp.signature) {
          changedSymbols.push({
            name: exp.name,
            type: exp.type,
            change: oldExp ? 'modified' : 'added'
          });
        }
      }
      
      // Detectar eliminados
      for (const exp of oldExports) {
        if (!newExports.find(e => e.name === exp.name)) {
          changedSymbols.push({
            name: exp.name,
            type: exp.type,
            change: 'removed'
          });
        }
      }
      
    } catch (error) {
      logger.warn(`  ⚠️  Could not analyze full impact: ${error.message}`);
    }
    
    return {
      affectedFiles: [...new Set(affectedFiles)],
      changedSymbols,
      severity: this.calculateSeverity(changedSymbols)
    };
  }

  /**
   * Extrae exports de código fuente (simplificado)
   */
  extractExports(code) {
    const exports = [];
    
    // Export function
    const funcMatch = code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/g);
    for (const match of funcMatch) {
      exports.push({
        name: match[1],
        type: 'function',
        signature: match[0]
      });
    }
    
    // Export const/let/var
    const varMatch = code.matchAll(/export\s+(?:const|let|var)\s+(\w+)\s*[=:]/g);
    for (const match of varMatch) {
      exports.push({
        name: match[1],
        type: 'variable',
        signature: match[0]
      });
    }
    
    // Export class
    const classMatch = code.matchAll(/export\s+(?:default\s+)?class\s+(\w+)/g);
    for (const match of classMatch) {
      exports.push({
        name: match[1],
        type: 'class',
        signature: match[0]
      });
    }
    
    return exports;
  }

  /**
   * Calcula severidad del cambio
   */
  calculateSeverity(changedSymbols) {
    if (changedSymbols.some(s => s.change === 'removed')) return 'high';
    if (changedSymbols.some(s => s.type === 'function' && s.change === 'modified')) return 'medium';
    return 'low';
  }

  /**
   * Actualiza el átomo en el sistema
   */
  async updateAtom(filePath, content, impact) {
    try {
      // Notificar al orchestrator para re-análisis
      if (this.orchestrator) {
        await this.orchestrator.handleFileChange(filePath, 'modified', {
          skipDebounce: true,
          priority: 'critical'
        });
      }
      
      // Invalidar análisis en caché
      const { getUnifiedCache } = await import('#core/unified-cache-manager.js');
      const cache = getUnifiedCache(this.projectPath);
      
      if (cache) {
        cache.invalidate(`analysis:${filePath}`);
        cache.invalidate(`atom:${filePath}`);
        
        // Invalidar dependientes
        for (const dep of impact.affectedFiles) {
          cache.invalidate(`analysis:${dep}`);
        }
      }
      
    } catch (error) {
      logger.warn(`  ⚠️  Could not update atom: ${error.message}`);
    }
  }

  /**
   * Propaga vibración a archivos dependientes
   */
  async propagateVibration(sourceFile, impact) {
    // Emitir evento para el sistema
    this.emit('vibration:propagating', {
      source: sourceFile,
      affected: impact.affectedFiles,
      severity: impact.severity,
      timestamp: Date.now()
    });
    
    // Notificar a cada archivo dependiente
    for (const depFile of impact.affectedFiles) {
      this.emit('atom:dependency:changed', {
        dependent: depFile,
        dependency: sourceFile,
        changes: impact.changedSymbols
      });
    }
    
    // Si es cambio crítico, emitir alerta
    if (impact.severity === 'high') {
      this.emit('atom:critical:change', {
        file: sourceFile,
        impact,
        message: `Critical change in ${sourceFile} affects ${impact.affectedFiles.length} files`
      });
    }
  }

  /**
   * Invalida cachés afectadas
   */
  async invalidateCaches(filePath, impact) {
    logger.info(`  🗑️  Invalidating caches...`);
    
    try {
      // Invalidar caché del archivo
      await this.orchestrator?._invalidateFileCache?.(filePath);
      
      // Invalidar caché de dependientes
      for (const dep of impact.affectedFiles) {
        await this.orchestrator?._invalidateFileCache?.(dep);
      }
      
    } catch (error) {
      logger.warn(`  ⚠️  Cache invalidation error: ${error.message}`);
    }
  }

  /**
   * Escribe un archivo nuevo con validación
   */
  async write(filePath, content, options = {}) {
    const absolutePath = path.join(this.projectPath, filePath);
    
    logger.info(`📝 Atomic Write: ${filePath}`);
    
    // Validar sintaxis
    const validation = await this.validateSyntax(filePath, content);
    if (!validation.valid) {
      this.emit('atom:validation:failed', {
        file: filePath,
        error: validation.error,
        isNewFile: true
      });
      throw new Error(`Syntax error prevents write: ${validation.error}`);
    }
    
    // Escribir archivo
    await fs.writeFile(absolutePath, content, 'utf-8');
    
    // Crear átomo
    await this.updateAtom(filePath, content, {
      affectedFiles: [],
      changedSymbols: [],
      severity: 'low'
    });
    
    this.emit('atom:created', {
      file: filePath,
      timestamp: Date.now()
    });
    
    return { success: true, file: filePath };
  }
}

// Singleton
let atomicEditor = null;

export function getAtomicEditor(projectPath, orchestrator) {
  if (!atomicEditor) {
    atomicEditor = new AtomicEditor(projectPath, orchestrator);
  }
  return atomicEditor;
}

export function resetAtomicEditor() {
  atomicEditor = null;
}
