import fs from 'fs';
import path from 'path';

import { GitTerminalBridge } from '../../../shared/utils/git-terminal-bridge.js';
import { loadAtomVersionArchiveHistory } from '../../../shared/compiler/atom-history-archive.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(items, getter) {
  const counts = new Map();
  for (const item of items) {
    const key = String(getter(item) || 'unknown');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function buildArchiveSummary(archiveHistory) {
  if (!archiveHistory.length) {
    return {
      versionCount: 0,
      sourceCounts: [],
      latestCapturedAt: null,
      earliestCapturedAt: null
    };
  }

  const capturedAt = archiveHistory
    .map((row) => row.captured_at || row.last_modified || null)
    .filter(Boolean)
    .sort();

  return {
    versionCount: archiveHistory.length,
    sourceCounts: countBy(archiveHistory, (row) => row.source || 'unknown'),
    latestCapturedAt: capturedAt[capturedAt.length - 1] || null,
    earliestCapturedAt: capturedAt[0] || null
  };
}

export function summarizeAtomDNA(dna = {}) {
  if (!dna || typeof dna !== 'object') {
    return null;
  }

  return {
    structuralHash: dna.structuralHash || null,
    contextualHash: dna.contextualHash || null,
    semanticHash: dna.semanticHash || null,
    patternHash: dna.patternHash || null,
    flowType: dna.flowType || 'unknown',
    operationSequence: safeArray(dna.operationSequence),
    complexityScore: Number(dna.complexityScore || 0),
    inputCount: Number(dna.inputCount || 0),
    outputCount: Number(dna.outputCount || 0),
    transformationCount: Number(dna.transformationCount || 0),
    semanticFingerprint: dna.semanticFingerprint || 'unknown',
    duplicabilityScore: Number(dna.duplicabilityScore || 0),
    id: dna.id || null
  };
}

export function summarizeAtomDataFlow(dataFlow = {}) {
  if (!dataFlow || typeof dataFlow !== 'object') {
    return null;
  }

  const inputs = safeArray(dataFlow.inputs);
  const outputs = safeArray(dataFlow.outputs);
  const transformations = safeArray(dataFlow.transformations);

  return {
    inputCount: inputs.length,
    outputCount: outputs.length,
    transformationCount: transformations.length,
    inputNames: inputs.map((input) => input?.name || input?.type || 'unknown').slice(0, 12),
    outputNames: outputs.map((output) => output?.name || output?.type || 'unknown').slice(0, 12),
    transformationOperations: transformations.map((step) => step?.operation || step?.type || 'unknown').slice(0, 12)
  };
}

export async function collectAtomHistory(context, deps = {}) {
  const {
    projectPath,
    filePath,
    symbolName,
    limit = 10
  } = context;

  const {
    GitTerminalBridgeClass = GitTerminalBridge,
    loadArchiveHistory = loadAtomVersionArchiveHistory
  } = deps;

  const rootPath = projectPath || process.cwd();
  const bridge = new GitTerminalBridgeClass(rootPath, deps.logger);
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(rootPath, filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      error: `File not found: ${filePath}`,
      relativePath: null,
      history: [],
      archiveHistory: []
    };
  }

  const relativePath = bridge.getRelativePath(absolutePath);

  try {
    const history = await bridge.getSymbolHistory(symbolName, relativePath, limit);
    const archiveHistory = loadArchiveHistory(rootPath, {
      atomName: symbolName,
      filePath: relativePath,
      limit
    });

    return {
      ok: true,
      relativePath,
      history,
      archiveHistory,
      metadata: {
        engine: archiveHistory.length > 0 ? 'git-log-L+atom-archive' : 'git-log-L',
        coherenceScore: history.length > 0 || archiveHistory.length > 0 ? 1.0 : 0.5
      }
    };
  } catch (error) {
    try {
      const fileHistory = await bridge.getFileHistory(relativePath, limit);
      const archiveHistory = loadArchiveHistory(rootPath, {
        atomName: symbolName,
        filePath: relativePath,
        limit
      });

      return {
        ok: true,
        relativePath,
        history: fileHistory,
        archiveHistory,
        metadata: {
          engine: archiveHistory.length > 0 ? 'git-log-file+atom-archive' : 'git-log-file',
          coherenceScore: fileHistory.length > 0 || archiveHistory.length > 0 ? 1.0 : 0.5,
          note: `Git symbol history failed for ${symbolName}: ${error.message}`
        }
      };
    } catch (fallbackError) {
      return {
        ok: false,
        relativePath,
        history: [],
        archiveHistory: [],
        error: `Git operations failed: ${fallbackError.message}`
      };
    }
  }
}

export function summarizeAtomHistory(history = [], archiveHistory = []) {
  const gitVersions = safeArray(history);
  const archiveVersions = safeArray(archiveHistory);
  const authors = countBy(gitVersions, (row) => row.author || 'unknown');
  const archiveSources = countBy(archiveVersions, (row) => row.source || 'unknown');

  return {
    gitVersionCount: gitVersions.length,
    archiveVersionCount: archiveVersions.length,
    authorCounts: authors,
    sourceCounts: archiveSources,
    latestGitCommit: gitVersions[0]?.hash || null,
    latestArchiveVersion: archiveVersions[0]?.version_hash || null,
    archiveWindow: buildArchiveSummary(archiveVersions)
  };
}

