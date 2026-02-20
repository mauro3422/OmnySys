/**
 * MCP Tool: get_molecule_summary
 *
 * Resumen molecular de un archivo: todas sus funciones con arquetipos,
 * organización por visibilidad y archetype, insights de riesgo.
 *
 * Absorbe get_atomic_functions (ambas hacían getFileAnalysisWithAtoms).
 * Vista unificada: flat list + byArchetype + exported/internal + insights.
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

    // ── Organizar por arquetipo (view de get_atomic_functions)
    const byArchetype = {};
    const exported = [];
    const internal = [];

    for (const atom of data.atoms) {
      const archetype = atom.archetype?.type || 'unknown';
      if (!byArchetype[archetype]) byArchetype[archetype] = [];

      // calledBy puede ser number (caché viejo) o array (caché nuevo)
      const calledByCount = Array.isArray(atom.calledBy)
        ? atom.calledBy.length
        : (typeof atom.calledBy === 'number' ? atom.calledBy : 0);

      // Corregir purpose en display: si tiene callers, no puede ser DEAD_CODE
      const purpose = (atom.purpose === 'DEAD_CODE' && calledByCount > 0)
        ? 'INTERNAL_HELPER'
        : atom.purpose;

      const funcInfo = {
        name: atom.name,
        line: atom.line,
        complexity: atom.complexity,
        purpose,
        calledBy: calledByCount
      };

      byArchetype[archetype].push(funcInfo);

      if (atom.isExported) {
        exported.push({ ...funcInfo, archetype });
      } else {
        internal.push({ ...funcInfo, archetype });
      }
    }

    // ── Vista flat con datos completos (view de get_molecule_summary original)
    const atomList = data.atoms.map(atom => {
      const cb = Array.isArray(atom.calledBy) ? atom.calledBy.length
        : (typeof atom.calledBy === 'number' ? atom.calledBy : 0);
      return {
        id: atom.id,
        name: atom.name,
        archetype: atom.archetype,
        complexity: atom.complexity,
        purpose: (atom.purpose === 'DEAD_CODE' && cb > 0) ? 'INTERNAL_HELPER' : atom.purpose,
        isExported: atom.isExported,
        calledBy: cb
      };
    });

    // ── Insights unificados
    // deadCode: purpose DEAD_CODE Y calledBy === 0 (corregir falsos positivos del caché)
    const deadAtoms = data.atoms.filter(a => {
      const cb = Array.isArray(a.calledBy) ? a.calledBy.length
        : (typeof a.calledBy === 'number' ? a.calledBy : 0);
      return a.purpose === 'DEAD_CODE' && cb === 0;
    }).map(a => ({
      name: a.name, line: a.line, complexity: a.complexity, archetype: a.archetype?.type
    }));
    const hotPaths = byArchetype['hot-path'] || [];
    const godFunctions = byArchetype['god-function'] || [];
    const fragile = byArchetype['fragile-network'] || [];
    const classMethods = byArchetype['class-method'] || [];

    const riskLevel = godFunctions.length > 0 ? 'high'
      : hotPaths.length > 2 || data.derived?.archetype?.severity > 7 ? 'medium'
      : 'low';

    return {
      filePath,
      atomsAvailable: true,

      // Resumen numérico
      summary: {
        total: data.atoms.length,
        exported: exported.length,
        internal: internal.length,
        classMethods: classMethods.length,
        archetypes: Object.keys(byArchetype)
      },

      // Vista por arquetipo (útil para navegación)
      byArchetype,

      // Separados por visibilidad, ordenados por uso
      exported: exported.sort((a, b) => b.calledBy - a.calledBy),
      internal: internal.sort((a, b) => b.calledBy - a.calledBy),

      // Lista flat con datos completos
      atoms: atomList,

      // Datos derivados de Layer A
      derived: data.derived,
      stats: data.stats,

      // Insights de riesgo
      insights: {
        riskLevel,
        deadCode: deadAtoms,
        hotPaths,
        godFunctions,
        fragileNetwork: fragile,
        hasDeadCode: deadAtoms.length > 0,
        hasHotPaths: hotPaths.length > 0,
        hasFragileNetwork: fragile.length > 0,
        hasGodFunctions: godFunctions.length > 0
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}
