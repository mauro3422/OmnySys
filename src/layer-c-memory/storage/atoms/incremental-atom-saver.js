/**
 * @fileoverview incremental-atom-saver.js
 *
 * Sistema de guardado incremental de átomos.
 * Solo actualiza los campos que realmente cambiaron, evitando reescribir
 * todo el archivo JSON cuando solo un campo fue modificado.
 *
 * @module layer-c-memory/storage/atoms/incremental-atom-saver
 */

import { loadAtoms, saveAtom } from './atom.js';
import { AtomVersionManager } from './atom-version-manager.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:incremental-saver');

/**
 * Carga un átomo específico por su ID
 * @private
 */
async function loadAtomById(rootPath, atomId) {
  const parts = atomId.split('::');
  if (parts.length !== 2) return null;
  
  const [filePath, functionName] = parts;
  const atoms = await loadAtoms(rootPath, filePath);
  return atoms.find(a => a.name === functionName) || null;
}

/**
 * Realiza un merge inteligente entre el átomo existente y los nuevos datos
 * @private
 */
function mergeAtoms(existingAtom, newData, changedFields) {
  const merged = { ...existingAtom };
  
  // Actualizar solo los campos que cambiaron
  for (const field of changedFields) {
    merged[field] = newData[field];
  }
  
  // Actualizar metadata de modificación
  merged._meta = {
    ...merged._meta,
    lastModified: Date.now(),
    modifiedFields: changedFields,
    version: (merged._meta?.version || 0) + 1,
    incrementalUpdate: true
  };
  
  return merged;
}

/**
 * Guarda un átomo de forma incremental
 * 
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {string} functionName - Nombre de la función
 * @param {Object} atomData - Datos del átomo
 * @param {Object} options - Opciones
 * @param {boolean} options.forceFull - Forzar guardado completo (no incremental)
 * @returns {Promise<Object>} Resultado del guardado
 */
export async function saveAtomIncremental(rootPath, filePath, functionName, atomData, options = {}) {
  const startTime = Date.now();
  const atomId = `${filePath}::${functionName}`;
  
  try {
    // 1. Inicializar version manager
    const versionManager = new AtomVersionManager(rootPath);
    
    // 2. Detectar qué cambió
    const changeDetection = await versionManager.detectChanges(atomId, atomData);
    
    // 3. Si no hay cambios, retornar inmediatamente
    if (!changeDetection.hasChanges && !options.forceFull) {
      return {
        success: true,
        action: 'unchanged',
        atomId,
        duration: Date.now() - startTime,
        fieldsChanged: 0
      };
    }
    
    // 4. Si es nuevo, guardar completo
    if (changeDetection.isNew) {
      await saveAtom(rootPath, filePath, functionName, {
        ...atomData,
        _meta: {
          createdAt: Date.now(),
          version: 1,
          incrementalUpdate: false
        }
      });
      
      await versionManager.trackAtomVersion(atomId, atomData);
      await versionManager.flush();
      
      return {
        success: true,
        action: 'created',
        atomId,
        duration: Date.now() - startTime,
        fieldsChanged: changeDetection.fields.length
      };
    }
    
    // 5. Cargar átomo existente
    const existingAtom = await loadAtomById(rootPath, atomId);
    if (!existingAtom) {
      // No debería pasar, pero por si acaso
      logger.warn(`Atom ${atomId} not found for incremental update, creating new`);
      await saveAtom(rootPath, filePath, functionName, atomData);
      return {
        success: true,
        action: 'created',
        atomId,
        duration: Date.now() - startTime
      };
    }
    
    // 6. Merge inteligente
    const mergedAtom = mergeAtoms(existingAtom, atomData, changeDetection.fields);
    
    // 7. Guardar átomo mergeado
    await saveAtom(rootPath, filePath, functionName, mergedAtom);
    
    // 8. Actualizar versión
    await versionManager.trackAtomVersion(atomId, atomData);
    await versionManager.flush();
    
    const duration = Date.now() - startTime;
    
    if (duration > 100) {
      logger.debug(`⚡ Incremental save: ${atomId} (${changeDetection.fields.length} fields, ${duration}ms)`);
    }
    
    return {
      success: true,
      action: 'updated',
      atomId,
      duration,
      fieldsChanged: changeDetection.fields.length,
      fields: changeDetection.fields
    };
    
  } catch (error) {
    logger.error(`Failed to save atom ${atomId} incrementally:`, error);
    
    // Fallback: guardar completo
    try {
      await saveAtom(rootPath, filePath, functionName, atomData);
      return {
        success: true,
        action: 'fallback_full',
        atomId,
        duration: Date.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        action: 'error',
        atomId,
        error: fallbackError.message
      };
    }
  }
}

/**
 * Guarda múltiples átomos de forma incremental (batch)
 * 
 * @param {string} rootPath - Ruta raíz del proyecto  
 * @param {string} filePath - Ruta relativa del archivo
 * @param {Array<Object>} atoms - Array de átomos a guardar
 * @returns {Promise<Object>} Estadísticas del batch
 */
export async function saveAtomsIncremental(rootPath, filePath, atoms) {
  const startTime = Date.now();
  const results = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    totalFieldsChanged: 0
  };
  
  const versionManager = new AtomVersionManager(rootPath);
  
  for (const atom of atoms) {
    if (!atom.name) continue;
    
    const result = await saveAtomIncremental(rootPath, filePath, atom.name, atom);
    
    switch (result.action) {
      case 'created':
        results.created++;
        break;
      case 'updated':
        results.updated++;
        results.totalFieldsChanged += result.fieldsChanged || 0;
        break;
      case 'unchanged':
        results.unchanged++;
        break;
      default:
        results.errors++;
    }
  }
  
  // Flush versiones al final del batch
  await versionManager.flush();
  
  return {
    ...results,
    duration: Date.now() - startTime,
    atomsProcessed: atoms.length
  };
}
