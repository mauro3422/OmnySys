/**
 * MCP Tool: get_removed_atoms
 * Muestra el historial de átomos (funciones) que fueron eliminados del código.
 * Útil para detectar código duplicado antes de escribir algo nuevo, ver deuda
 * técnica eliminada, y entender la evolución del proyecto.
 */

import { getRemovedAtoms } from '#layer-c/storage/atoms/atom.js';

export async function get_removed_atoms(args, context) {
  const {
    filePath,
    minComplexity = 0,
    minCallers = 0,
    limit = 50
  } = args;
  const { projectPath } = context;

  try {
    const removed = await getRemovedAtoms(projectPath, filePath || null);

    if (!removed || removed.length === 0) {
      return {
        summary: { total: 0 },
        message: 'No removed atoms found. They are recorded when a function is deleted during re-analysis.',
        atoms: []
      };
    }

    // Filtros opcionales
    let filtered = removed;
    if (minComplexity > 0) {
      filtered = filtered.filter(a => (a.lineage?.snapshotComplexity ?? a.complexity ?? 0) >= minComplexity);
    }
    if (minCallers > 0) {
      filtered = filtered.filter(a => (a.lineage?.snapshotCallers ?? 0) >= minCallers);
    }

    // Ordenar: más complejos primero (los más valiosos de recordar)
    filtered.sort((a, b) => {
      const ca = a.lineage?.snapshotComplexity ?? a.complexity ?? 0;
      const cb = b.lineage?.snapshotComplexity ?? b.complexity ?? 0;
      return cb - ca;
    });

    const sliced = filtered.slice(0, limit);

    // Agrupar por archivo para contexto
    const byFile = {};
    for (const atom of sliced) {
      const f = atom.filePath || atom.file || 'unknown';
      if (!byFile[f]) byFile[f] = [];
      byFile[f].push({
        name: atom.name,
        removedAt: atom.lineage?.removedAt,
        lastSeenAt: atom.lineage?.lastSeenAt,
        lastSeenLine: atom.lineage?.lastSeenLine,
        complexity: atom.lineage?.snapshotComplexity ?? atom.complexity,
        linesOfCode: atom.lineage?.snapshotLOC,
        callers: atom.lineage?.snapshotCallers ?? 0,
        dnaHash: atom.lineage?.dnaHash,
        purpose: atom.purpose,
        archetype: atom.archetype?.type,
        // Para detectar duplicados: estos son los datos que el extractor usaría
        calls: atom.calls?.length ?? 0,
        isAsync: atom.isAsync ?? false
      });
    }

    // Detectar cuáles tenían callers (eran usados — su eliminación puede haber roto algo)
    const hadCallers = sliced.filter(a => (a.lineage?.snapshotCallers ?? 0) > 0);
    const complex = sliced.filter(a => (a.lineage?.snapshotComplexity ?? 0) >= 10);

    return {
      summary: {
        total: removed.length,
        filtered: filtered.length,
        returned: sliced.length,
        hadCallers: hadCallers.length,
        complexRemoved: complex.length,
        filesAffected: Object.keys(byFile).length
      },
      insights: {
        warning: hadCallers.length > 0
          ? `${hadCallers.length} removed atoms had active callers — verify nothing broke`
          : null,
        tip: 'Use dnaHash to detect if similar logic was re-implemented elsewhere (code duplication)',
        mostComplex: sliced[0]
          ? { name: sliced[0].name, file: sliced[0].filePath || sliced[0].file, complexity: sliced[0].lineage?.snapshotComplexity }
          : null
      },
      byFile,
      atoms: sliced.map(a => ({
        id: a.id,
        name: a.name,
        file: a.filePath || a.file,
        removedAt: a.lineage?.removedAt,
        lastSeenLine: a.lineage?.lastSeenLine,
        complexity: a.lineage?.snapshotComplexity ?? a.complexity,
        linesOfCode: a.lineage?.snapshotLOC,
        callers: a.lineage?.snapshotCallers ?? 0,
        dnaHash: a.lineage?.dnaHash,
        archetype: a.archetype?.type,
        isAsync: a.isAsync ?? false
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}
