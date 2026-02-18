/**
 * MCP Tool: get_atomic_functions
 * Lista todas las funciones de un archivo con sus arquetipos
 */

import { getFileAnalysisWithAtoms } from '#layer-c/query/queries/file-query.js';

export async function get_atomic_functions(args, context) {
  const { filePath } = args;
  const { projectPath, cache } = context;
  
  try {
    const data = await getFileAnalysisWithAtoms(projectPath, filePath, cache);
    
    if (!data || !data.atoms || data.atoms.length === 0) {
      return {
        filePath,
        functions: [],
        message: 'No atomic analysis available',
        suggestion: 'Run analysis first'
      };
    }
    
    // Organizar por categoría
    const byArchetype = {};
    const exported = [];
    const internal = [];
    
    for (const atom of data.atoms) {
      const archetype = atom.archetype?.type || 'unknown';
      if (!byArchetype[archetype]) byArchetype[archetype] = [];
      
      const funcInfo = {
        name: atom.name,
        line: atom.line,
        complexity: atom.complexity,
        calledBy: atom.calledBy?.length || 0
      };
      
      byArchetype[archetype].push(funcInfo);
      
      if (atom.isExported) {
        exported.push({ ...funcInfo, archetype });
      } else {
        internal.push({ ...funcInfo, archetype });
      }
    }
    
    return {
      filePath,
      summary: {
        total: data.atoms.length,
        exported: exported.length,
        internal: internal.length,
        archetypes: Object.keys(byArchetype)
      },
      byArchetype,
      exported: exported.sort((a, b) => b.calledBy - a.calledBy),
      internal: internal.sort((a, b) => b.calledBy - a.calledBy),
      insights: {
        deadCode: byArchetype['dead-function'] || [],
        hotPaths: byArchetype['hot-path'] || [],
        fragile: byArchetype['fragile-network'] || [],
        godFunctions: byArchetype['god-function'] || []
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}
