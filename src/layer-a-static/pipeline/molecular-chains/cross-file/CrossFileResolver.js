/**
 * @fileoverview CrossFileResolver.js
 *
 * Resolves cross-file function call chains by connecting caller atoms
 * to callee atoms using the `calls[].args` and `dataFlow.inputs` fields.
 *
 * Produces CrossFileEdge[] that enable deterministic data journey tracing
 * across module boundaries — unlike probabilistic PageRank in trace_variable_impact.
 *
 * @module molecular-chains/cross-file/CrossFileResolver
 */

import { ArgumentMapper } from '../argument-mapper/ArgumentMapper.js';

/**
 * @typedef {Object} CrossFileEdge
 * @property {string} callerId   - Atom ID of the caller
 * @property {string} calleeId   - Atom ID of the callee
 * @property {number} callSite   - Line number where the call occurs
 * @property {string} callerFile
 * @property {string} calleeFile
 * @property {Object} mapping    - ArgumentMapper.map() result
 * @property {number} confidence - 0-1 resolution confidence
 */

export class CrossFileResolver {
  /**
   * @param {Object[]} allAtoms - Full atom list from storage
   */
  constructor(allAtoms) {
    this.atoms = allAtoms;

    // byName: name → atom[] (multiple files may export same name)
    this.byName = new Map();
    // byId: id → atom
    this.byId = new Map();

    for (const atom of allAtoms) {
      this.byId.set(atom.id, atom);
      const key = atom.name;
      if (!this.byName.has(key)) this.byName.set(key, []);
      this.byName.get(key).push(atom);
    }
  }

  /**
   * Resolves all cross-file edges for a given atom (caller).
   * Only resolves calls that cross file boundaries.
   *
   * @param {Object} callerAtom
   * @returns {CrossFileEdge[]}
   */
  resolveEdgesFrom(callerAtom) {
    const edges = [];
    const calls = callerAtom.calls || [];

    for (const call of calls) {
      const calleeCandidates = this.byName.get(call.name);
      if (!calleeCandidates || calleeCandidates.length === 0) continue;

      // Filter to cross-file only
      const crossFileCandidates = calleeCandidates.filter(
        c => c.filePath !== callerAtom.filePath
      );
      if (crossFileCandidates.length === 0) continue;

      // Resolve best candidate using import hints
      const callee = this._resolveBestCallee(callerAtom, crossFileCandidates);
      if (!callee) continue;

      const mapping = this._buildMapping(callerAtom, callee, call);

      edges.push({
        callerId: callerAtom.id,
        calleeId: callee.id,
        callSite: call.line || 0,
        callerFile: callerAtom.filePath,
        calleeFile: callee.filePath,
        calleeName: callee.name,
        mapping,
        confidence: this._edgeConfidence(callerAtom, callee, call)
      });
    }

    return edges;
  }

  /**
   * Resolves all cross-file edges in the project.
   * Returns a flat list of CrossFileEdge[].
   *
   * @returns {CrossFileEdge[]}
   */
  resolveAll() {
    const edges = [];
    for (const atom of this.atoms) {
      const atomEdges = this.resolveEdgesFrom(atom);
      edges.push(...atomEdges);
    }
    return edges;
  }

  /**
   * Returns a Map<atomId, CrossFileEdge[]> — outgoing edges per atom.
   * Used by trace_data_journey for DFS traversal.
   *
   * @returns {Map<string, CrossFileEdge[]>}
   */
  buildEdgeMap() {
    const map = new Map();
    for (const atom of this.atoms) {
      const edges = this.resolveEdgesFrom(atom);
      if (edges.length > 0) {
        map.set(atom.id, edges);
      }
    }
    return map;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  /**
   * Pick best callee from candidates using caller's import declarations.
   * Falls back to the first exported match, then any match.
   */
  _resolveBestCallee(callerAtom, candidates) {
    const callerImports = callerAtom.imports || [];

    // Build set of imported source paths
    const importedSources = new Set(callerImports.map(i => i.source));

    // 1. Prefer candidate whose filePath is referenced in caller's imports
    for (const candidate of candidates) {
      const fp = candidate.filePath;
      for (const src of importedSources) {
        // Match on filename stem (heuristic, good enough for most cases)
        if (fp && src && (fp.endsWith(src) || src.includes(fp.split('/').pop()?.replace('.js', '') || ''))) {
          return candidate;
        }
      }
    }

    // 2. Prefer exported candidates
    const exported = candidates.filter(c => c.isExported);
    if (exported.length === 1) return exported[0];

    // 3. Return first candidate
    return candidates[0];
  }

  _buildMapping(callerAtom, calleeAtom, callInfo) {
    try {
      const mapper = new ArgumentMapper(callerAtom, calleeAtom, callInfo);
      return mapper.map();
    } catch {
      return { caller: callerAtom.name, callee: calleeAtom.name, mappings: [], error: true };
    }
  }

  _edgeConfidence(callerAtom, callee, call) {
    let score = 0.5;
    // Has args metadata
    if (call.args && call.args.length > 0) score += 0.2;
    // Callee is exported
    if (callee.isExported) score += 0.15;
    // Caller imports from callee file
    const imported = (callerAtom.imports || []).some(i =>
      callee.filePath && (callee.filePath.endsWith(i.source) || i.source?.includes(callee.filePath.split('/').pop()?.replace('.js', '') || ''))
    );
    if (imported) score += 0.15;
    return Math.min(1, Math.round(score * 100) / 100);
  }
}

export default CrossFileResolver;
