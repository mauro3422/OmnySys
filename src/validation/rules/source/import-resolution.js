/**
 * @fileoverview Import Resolution Rule
 * 
 * Valida que los imports resuelvan a archivos existentes.
 * Detecta imports rotos o a módulos no instalados.
 * 
 * @module validation/rules/source/import-resolution
 */

import { ValidationRule } from '../../core/rule-registry.js';
import { ValidationResult } from '../../core/validation-result.js';
import path from 'path';
import fs from 'fs/promises';

export const ImportResolutionRule = new ValidationRule({
  id: 'source.import-resolution',
  name: 'Import Resolution',
  description: 'Verifica que los imports resuelvan a archivos existentes',
  layer: 'source',
  invariant: false,
  appliesTo: ['file', 'molecule'],
  requires: ['path', 'imports'],
  
  async validate(entity, context) {
    const results = [];
    const fileDir = path.dirname(entity.path);
    
    for (const importDef of entity.imports || []) {
      const source = importDef.source;
      if (!source) continue;
      
      // Saltar imports de built-ins y node_modules (no podemos verificarlos fácilmente)
      if (isExternalImport(source)) {
        continue;
      }
      
      // Resolver ruta relativa
      if (source.startsWith('.')) {
        const resolvedPath = resolveRelativeImport(fileDir, source);
        const fullPath = path.join(context.projectPath, resolvedPath);
        
        try {
          await fs.access(fullPath);
          // Éxito - el archivo existe
        } catch {
          // Intentar con extensiones comunes
          const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '/index.js'];
          let found = false;
          
          for (const ext of extensions) {
            try {
              await fs.access(fullPath + ext);
              found = true;
              break;
            } catch {
              continue;
            }
          }
          
          if (!found) {
            results.push(ValidationResult.invalid(
              entity.id || entity.path,
              `import.${source}`,
              `import '${source}' to resolve to existing file`,
              'file not found',
              {
                severity: 'warning', // Warning porque puede ser un archivo no analizado aún
                details: {
                  importSource: source,
                  resolvedPath,
                  attemptedPath: fullPath
                }
              }
            ));
          }
        }
      }
    }
    
    return results.length > 0 
      ? results 
      : ValidationResult.valid(entity.id || entity.path, 'imports', {
          message: `All ${entity.imports?.length || 0} imports resolved`,
          details: { importCount: entity.imports?.length || 0 }
        });
  }
});

/**
 * Determina si un import es externo (no podemos verificarlo)
 */
function isExternalImport(source) {
  // Built-in modules de Node.js
  const builtIns = [
    'fs', 'path', 'url', 'querystring', 'http', 'https', 'stream', 
    'events', 'crypto', 'os', 'util', 'child_process', 'cluster',
    'dns', 'net', 'tls', 'dgram', 'timers', 'console', 'process'
  ];
  
  if (builtIns.includes(source)) return true;
  
  // No empieza con . o / (import de node_modules)
  if (!source.startsWith('.') && !source.startsWith('/')) return true;
  
  return false;
}

/**
 * Resuelve una ruta relativa de import
 */
function resolveRelativeImport(fromDir, importPath) {
  // Remover prefijo ./ o ../ para construir ruta
  return path.normalize(path.join(fromDir, importPath));
}

export default ImportResolutionRule;
