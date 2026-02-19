/**
 * MCP Tool: get_molecule_summary
 * Obtiene resumen molecular de un archivo (todas sus funciones/atoms)
 */

import { getFileAnalysisWithAtoms } from '#layer-c/query/queries/file-query/index.js';

export async function get_molecule_summary(args, context) {
  const { filePath } = args;
  const { projectPath, cache } = context;
  
  try {
    const data = await getFileAnalysisWithAtoms(projectPath, filePath, cache);
    
    if (!data) {
      return { error: `File not found: ${filePath}` };
    }
    
    if (!data.atoms || data.atoms.length === 0) {
      return {
        filePath,
        atomsAvailable: false,
        message: 'No atomic analysis available for this file',
        suggestion: 'Run analysis first or check if file has functions'
      };
    }
    
    return {
      filePath,
      atomsAvailable: true,
      molecule: data.derived,
      stats: data.stats,
      atoms: data.atoms.map(atom => ({
        id: atom.id,
        name: atom.name,
        archetype: atom.archetype,
        complexity: atom.complexity,
        isExported: atom.isExported,
        calledBy: atom.calledBy?.length || 0
      })),
      insights: {
        hasDeadCode: data.stats.deadAtoms > 0,
        hasHotPaths: data.stats.hotPathAtoms > 0,
        hasFragileNetwork: data.stats.fragileNetworkAtoms > 0,
        riskLevel: data.derived?.archetype?.severity > 7 ? 'high' :
                   data.derived?.archetype?.severity > 4 ? 'medium' : 'low'
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}
