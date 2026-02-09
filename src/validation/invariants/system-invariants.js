/**
 * @fileoverview System Invariants
 * 
 * Invariantes fundamentales que nunca deben violarse.
 * Si alguna de estas falla, el sistema está en estado corrupto.
 * 
 * @module validation/invariants/system-invariants
 */

import { ValidationRule } from '../core/rule-registry.js';
import { ValidationResult } from '../core/validation-result.js';

/**
 * Invariante: Todos los IDs deben ser únicos
 */
export const UniqueIdsInvariant = new ValidationRule({
  id: 'invariant.unique-ids',
  name: 'Unique IDs',
  description: 'Todos los IDs de entidades deben ser únicos en el sistema',
  layer: 'source',
  invariant: true,
  appliesTo: ['system'],
  requires: [],
  
  async validate(entity, context) {
    const ids = new Map(); // id -> entity path
    const duplicates = [];
    
    // Revisar archivos
    for (const [id, file] of context.files) {
      if (ids.has(id)) {
        duplicates.push({ id, first: ids.get(id), second: file.path });
      } else {
        ids.set(id, file.path);
      }
    }
    
    if (duplicates.length > 0) {
      return ValidationResult.critical(
        'system',
        'unique-ids',
        'all IDs to be unique',
        `${duplicates.length} duplicate(s) found`,
        {
          message: 'CRITICAL: Duplicate entity IDs detected',
          details: { duplicates }
        }
      );
    }
    
    return ValidationResult.valid('system', 'unique-ids', {
      message: `All ${ids.size} IDs are unique`,
      details: { uniqueCount: ids.size }
    });
  }
});

/**
 * Invariante: Referencias deben ser válidas
 */
export const ValidReferencesInvariant = new ValidationRule({
  id: 'invariant.valid-references',
  name: 'Valid References',
  description: 'Todas las referencias entre entidades deben apuntar a entidades existentes',
  layer: 'source',
  invariant: true,
  appliesTo: ['system'],
  requires: [],
  
  async validate(entity, context) {
    const brokenRefs = [];
    
    for (const [id, file] of context.files) {
      // Verificar usedBy
      for (const usedBy of file.usedBy || []) {
        if (!context.files.has(usedBy)) {
          brokenRefs.push({
            from: id,
            to: usedBy,
            type: 'usedBy',
            message: `File ${id} is used by ${usedBy} which does not exist`
          });
        }
      }
      
      // Verificar imports
      for (const imp of file.imports || []) {
        if (imp.source?.startsWith('.')) {
          // Import relativo - verificar
          const resolvedPath = resolveImportPath(file.path, imp.source);
          if (!context.files.has(resolvedPath)) {
            brokenRefs.push({
              from: id,
              to: resolvedPath,
              type: 'import',
              message: `Import ${imp.source} in ${id} resolves to non-existent file`
            });
          }
        }
      }
    }
    
    if (brokenRefs.length > 0) {
      return ValidationResult.critical(
        'system',
        'valid-references',
        'all references to be valid',
        `${brokenRefs.length} broken reference(s)`,
        {
          message: 'CRITICAL: Broken references detected',
          details: { brokenRefs: brokenRefs.slice(0, 10) } // Limitar a 10
        }
      );
    }
    
    return ValidationResult.valid('system', 'valid-references', {
      message: 'All references are valid'
    });
  }
});

/**
 * Invariante: Consistencia de exports/imports (grafo bidireccional)
 */
export const BidirectionalGraphInvariant = new ValidationRule({
  id: 'invariant.bidirectional-graph',
  name: 'Bidirectional Graph',
  description: 'Si A importa B, B debe tener a A en usedBy',
  layer: 'source',
  invariant: true,
  appliesTo: ['system'],
  requires: [],
  
  async validate(entity, context) {
    const inconsistencies = [];
    
    for (const [id, file] of context.files) {
      for (const imp of file.imports || []) {
        if (!imp.source?.startsWith('.')) continue;
        
        const resolvedPath = resolveImportPath(file.path, imp.source);
        const targetFile = context.files.get(resolvedPath);
        
        if (targetFile) {
          // Verificar que target tenga a source en usedBy
          const hasBackRef = (targetFile.usedBy || []).includes(id);
          
          if (!hasBackRef) {
            inconsistencies.push({
              from: id,
              to: resolvedPath,
              type: 'missing-back-reference'
            });
          }
        }
      }
    }
    
    if (inconsistencies.length > 0) {
      return ValidationResult.critical(
        'system',
        'bidirectional-graph',
        'graph to be bidirectional',
        `${inconsistencies.length} missing back-reference(s)`,
        {
          message: 'CRITICAL: Call graph is not bidirectional',
          details: { inconsistencies: inconsistencies.slice(0, 10) }
        }
      );
    }
    
    return ValidationResult.valid('system', 'bidirectional-graph', {
      message: 'Graph is consistent (bidirectional)'
    });
  }
});

/**
 * Helper: Resuelve una ruta de import
 */
function resolveImportPath(fromPath, importPath) {
  // Normalizar path
  const fromDir = fromPath.split('/').slice(0, -1).join('/');
  const parts = importPath.split('/');
  
  let resolved = fromDir;
  for (const part of parts) {
    if (part === '..') {
      resolved = resolved.split('/').slice(0, -1).join('/');
    } else if (part !== '.') {
      resolved = resolved ? `${resolved}/${part}` : part;
    }
  }
  
  return resolved;
}

// Colección de todas las invariantes
export const SystemInvariants = [
  UniqueIdsInvariant,
  ValidReferencesInvariant,
  BidirectionalGraphInvariant
];

/**
 * Registra todas las invariantes
 */
export function registerInvariants(registry) {
  SystemInvariants.forEach(inv => registry.register(inv));
  return registry;
}

export default { SystemInvariants, registerInvariants };
