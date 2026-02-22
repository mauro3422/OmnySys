/**
 * @fileoverview Búsquedas selectivas de átomos
 * Funciones optimizadas que NO cargan todo el grafo
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { loadAtoms } from '#layer-c/storage/index.js';

const logger = createLogger('OmnySys:atomic:search');

/**
 * Busca átomos por nombre de forma eficiente (O(1) - O(log n))
 * NO carga todo el grafo, solo busca índices
 */
export async function findAtomsByName(atomName, projectPath, options = {}) {
  const atoms = [];
  
  try {
    const { glob } = await import('glob');
    const pattern = path.join(projectPath, '**/*.js');
    const files = await glob(pattern, { 
      ignore: ['**/node_modules/**', '**/.omnysysdata/**'],
      absolute: true
    });
    
    const recentFiles = files.slice(0, 50);
    
    for (const file of recentFiles) {
      try {
        const fileAtoms = await loadAtoms(projectPath, path.relative(projectPath, file));
        const matches = fileAtoms.filter(a => a.name === atomName);
        atoms.push(...matches);
        
        if (atoms.length >= 10) break;
      } catch {
        // Ignorar archivos que no pueden parsearse
      }
    }
    
    const fs = await import('fs/promises');
    const indexPath = path.join(projectPath, '.omnysysdata', 'indexes', 'atom-names.json');
    
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const nameIndex = JSON.parse(indexContent);
      
      if (nameIndex[atomName]) {
        for (const location of nameIndex[atomName]) {
          const fileAtoms = await loadAtoms(projectPath, location.filePath);
          const match = fileAtoms.find(a => a.name === atomName && a.line === location.line);
          if (match && !atoms.find(a => a.id === match.id)) {
            atoms.push(match);
          }
        }
      }
    } catch {
      // Índice no existe
    }
    
  } catch (error) {
    logger.warn(`[FindAtomsByName] Error buscando ${atomName}: ${error.message}`);
  }
  
  return atoms;
}

/**
 * Busca callers de una función específica de forma eficiente
 */
export async function findCallersEfficient(functionName, projectPath, excludeFile = null) {
  const callers = [];
  
  try {
    const fs = await import('fs/promises');
    const refsPath = path.join(projectPath, '.omnysysdata', 'indexes', 'call-references.json');
    
    try {
      const refsContent = await fs.readFile(refsPath, 'utf-8');
      const references = JSON.parse(refsContent);
      
      if (references[functionName]) {
        for (const ref of references[functionName]) {
          if (excludeFile && ref.filePath.includes(excludeFile)) continue;
          
          const fileAtoms = await loadAtoms(projectPath, ref.filePath);
          const caller = fileAtoms.find(a => 
            a.calls?.some(c => c.callee === functionName || c.callee?.endsWith(`::${functionName}`))
          );
          
          if (caller) {
            callers.push({
              name: caller.name,
              filePath: ref.filePath,
              line: caller.line,
              argumentCount: ref.argumentCount
            });
          }
          
          if (callers.length >= 20) break;
        }
      }
    } catch {
      const { glob } = await import('glob');
      const files = await glob(path.join(projectPath, 'src/**/*.js'), { absolute: true });
      
      for (const file of files.slice(0, 30)) {
        const relPath = path.relative(projectPath, file);
        if (excludeFile && relPath.includes(excludeFile)) continue;
        
        const fileAtoms = await loadAtoms(projectPath, relPath);
        const matches = fileAtoms.filter(a => 
          a.calls?.some(c => c.callee === functionName || c.callee?.endsWith(`::${functionName}`))
        );
        
        callers.push(...matches.map(m => ({
          name: m.name,
          filePath: relPath,
          line: m.line,
          argumentCount: m.calls?.find(c => c.callee === functionName)?.argumentCount
        })));
        
        if (callers.length >= 20) break;
      }
    }
    
  } catch (error) {
    logger.warn(`[FindCallers] Error buscando callers de ${functionName}: ${error.message}`);
  }
  
  return callers.slice(0, 20);
}
