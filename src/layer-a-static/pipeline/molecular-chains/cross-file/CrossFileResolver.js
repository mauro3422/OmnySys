/**
 * @fileoverview CrossFileResolver.js
 *
 * Resolves cross-file function call chains by connecting caller atoms
 * to callee atoms using the `calls[].args` and `dataFlow.inputs` fields.
 *
 * Produces CrossFileEdge[] that enable deterministic data-journey tracing
 * across module boundaries.
 *
 * @module molecular-chains/cross-file/CrossFileResolver
 */

import { ArgumentMapper } from '../argument-mapper/ArgumentMapper.js';

function normalizeFileToken(filePath = '') {
  return filePath.split('/').pop()?.replace('.js', '') || '';
}

function buildImportHintSet(imports = []) {
  const hints = new Set();

  for (const entry of imports) {
    if (!entry?.source) {
      continue;
    }

    hints.add(entry.source);
    hints.add(normalizeFileToken(entry.source));
  }

  return hints;
}

function matchesImportHint(filePath, importHints) {
  if (!filePath || importHints.size === 0) {
    return false;
  }

  const fileName = filePath.split('/').pop() || '';
  const normalized = normalizeFileToken(filePath);

  return importHints.has(filePath) || importHints.has(fileName) || importHints.has(normalized);
}

function buildCrossFileCandidates(callerAtom, candidates = []) {
  return candidates.filter((candidate) => candidate.filePath !== callerAtom.filePath);
}

function buildCrossFileEdge(callerAtom, calleeAtom, call, mapping, confidence) {
  return {
    callerId: callerAtom.id,
    calleeId: calleeAtom.id,
    callSite: call.line || 0,
    callerFile: callerAtom.filePath,
    calleeFile: calleeAtom.filePath,
    calleeName: calleeAtom.name,
    mapping,
    confidence
  };
}

export class CrossFileResolver {
  constructor(allAtoms) {
    this.atoms = allAtoms;
    this.byName = new Map();
    this.byId = new Map();

    for (const atom of allAtoms) {
      this.byId.set(atom.id, atom);

      if (!this.byName.has(atom.name)) {
        this.byName.set(atom.name, []);
      }

      this.byName.get(atom.name).push(atom);
    }
  }

  resolveEdgesFrom(callerAtom) {
    const edges = [];
    const importHints = buildImportHintSet(callerAtom.imports || []);

    for (const call of callerAtom.calls || []) {
      const candidates = this.byName.get(call.name);
      if (!candidates?.length) {
        continue;
      }

      const crossFileCandidates = buildCrossFileCandidates(callerAtom, candidates);
      if (crossFileCandidates.length === 0) {
        continue;
      }

      const callee = this._resolveBestCallee(crossFileCandidates, importHints);
      if (!callee) {
        continue;
      }

      const mapping = this._buildMapping(callerAtom, callee, call);
      edges.push(
        buildCrossFileEdge(
          callerAtom,
          callee,
          call,
          mapping,
          this._edgeConfidence(importHints, callee, call)
        )
      );
    }

    return edges;
  }

  resolveAll() {
    return this._collectResolvedEdges().edges;
  }

  buildEdgeMap() {
    return this._collectResolvedEdges().edgeMap;
  }

  _collectResolvedEdges() {
    const edges = [];
    const edgeMap = new Map();

    for (const atom of this.atoms) {
      const atomEdges = this.resolveEdgesFrom(atom);
      if (atomEdges.length === 0) {
        continue;
      }

      edgeMap.set(atom.id, atomEdges);
      edges.push(...atomEdges);
    }

    return { edges, edgeMap };
  }

  _resolveBestCallee(candidates, importHints) {
    for (const candidate of candidates) {
      if (matchesImportHint(candidate.filePath, importHints)) {
        return candidate;
      }
    }

    const exported = candidates.filter((candidate) => candidate.isExported);
    if (exported.length === 1) {
      return exported[0];
    }

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

  _edgeConfidence(importHints, callee, call) {
    let score = 0.5;

    if (call.args?.length > 0) {
      score += 0.2;
    }

    if (callee.isExported) {
      score += 0.15;
    }

    if (matchesImportHint(callee.filePath, importHints)) {
      score += 0.15;
    }

    return Math.min(1, Math.round(score * 100) / 100);
  }
}

export default CrossFileResolver;
