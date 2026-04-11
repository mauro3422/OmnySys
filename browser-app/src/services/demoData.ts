/**
 * Demo data for visual testing when MCP is not available.
 * Reflects a realistic OmnySystem project structure.
 */
import type { FileInfo, FileDependency, AtomInfo, AtomRelation, DbStats } from '../types';

export const DEMO_STATS: DbStats = {
  totalAtoms: 847,
  totalFiles: 142,
  totalRelations: 2341,
  totalEvents: 56,
  avgComplexity: 4.7,
  maxComplexity: 28,
};

export const DEMO_FILES: FileInfo[] = [
  { path: 'shared/compiler/index.js', displayPath: 'compiler/index.js', riskScore: 72, riskLevel: 'high', culture: 'entrypoint', atomCount: 23, totalComplexity: 89, avgFragility: 0.62, maxPropagation: 0.85 },
  { path: 'shared/compiler/extractor/ast-walker.js', displayPath: 'extractor/ast-walker.js', riskScore: 65, riskLevel: 'high', culture: 'citizen', atomCount: 18, totalComplexity: 72, avgFragility: 0.55, maxPropagation: 0.71 },
  { path: 'shared/compiler/extractor/atom-extractor.js', displayPath: 'extractor/atom-extractor.js', riskScore: 58, riskLevel: 'medium', culture: 'citizen', atomCount: 14, totalComplexity: 45, avgFragility: 0.42, maxPropagation: 0.63 },
  { path: 'shared/guards/registry.js', displayPath: 'guards/registry.js', riskScore: 45, riskLevel: 'medium', culture: 'gatekeeper', atomCount: 8, totalComplexity: 28, avgFragility: 0.35, maxPropagation: 0.52 },
  { path: 'shared/guards/integrity-guard.js', displayPath: 'guards/integrity-guard.js', riskScore: 42, riskLevel: 'medium', culture: 'auditor', atomCount: 6, totalComplexity: 22, avgFragility: 0.31, maxPropagation: 0.48 },
  { path: 'shared/storage/repository.js', displayPath: 'storage/repository.js', riskScore: 38, riskLevel: 'medium', culture: 'citizen', atomCount: 12, totalComplexity: 35, avgFragility: 0.28, maxPropagation: 0.44 },
  { path: 'shared/storage/schema-registry.js', displayPath: 'storage/schema-registry.js', riskScore: 25, riskLevel: 'low', culture: 'law', atomCount: 5, totalComplexity: 15, avgFragility: 0.18, maxPropagation: 0.32 },
  { path: 'shared/query/apis/query-graph.js', displayPath: 'query/query-graph.js', riskScore: 35, riskLevel: 'medium', culture: 'citizen', atomCount: 9, totalComplexity: 31, avgFragility: 0.25, maxPropagation: 0.41 },
  { path: 'shared/query/apis/traverse-graph.js', displayPath: 'query/traverse-graph.js', riskScore: 32, riskLevel: 'medium', culture: 'citizen', atomCount: 7, totalComplexity: 26, avgFragility: 0.22, maxPropagation: 0.38 },
  { path: 'shared/mcp/tool-registry.js', displayPath: 'mcp/tool-registry.js', riskScore: 28, riskLevel: 'low', culture: 'law', atomCount: 4, totalComplexity: 12, avgFragility: 0.15, maxPropagation: 0.25 },
  { path: 'shared/compiler/risk/risk-scorer.js', displayPath: 'risk/risk-scorer.js', riskScore: 55, riskLevel: 'medium', culture: 'citizen', atomCount: 11, totalComplexity: 48, avgFragility: 0.45, maxPropagation: 0.58 },
  { path: 'shared/compiler/risk/risk-handler.js', displayPath: 'risk/risk-handler.js', riskScore: 50, riskLevel: 'medium', culture: 'citizen', atomCount: 9, totalComplexity: 38, avgFragility: 0.40, maxPropagation: 0.55 },
  { path: 'shared/compiler/society/society-detector.js', displayPath: 'society/detector.js', riskScore: 48, riskLevel: 'medium', culture: 'citizen', atomCount: 10, totalComplexity: 42, avgFragility: 0.38, maxPropagation: 0.50 },
  { path: 'mcp-server/index.js', displayPath: 'mcp-server/index.js', riskScore: 30, riskLevel: 'low', culture: 'entrypoint', atomCount: 3, totalComplexity: 8, avgFragility: 0.12, maxPropagation: 0.20 },
  { path: 'shared/compiler/watcher/file-watcher.js', displayPath: 'watcher/file-watcher.js', riskScore: 22, riskLevel: 'low', culture: 'citizen', atomCount: 6, totalComplexity: 18, avgFragility: 0.15, maxPropagation: 0.28 },
];

export const DEMO_DEPENDENCIES: FileDependency[] = [
  { source: 'shared/compiler/index.js', target: 'shared/compiler/extractor/ast-walker.js', type: 'local', isDynamic: false },
  { source: 'shared/compiler/index.js', target: 'shared/compiler/extractor/atom-extractor.js', type: 'local', isDynamic: false },
  { source: 'shared/compiler/index.js', target: 'shared/compiler/risk/risk-scorer.js', type: 'local', isDynamic: false },
  { source: 'shared/compiler/index.js', target: 'shared/compiler/risk/risk-handler.js', type: 'local', isDynamic: false },
  { source: 'shared/compiler/index.js', target: 'shared/compiler/society/society-detector.js', type: 'local', isDynamic: false },
  { source: 'shared/compiler/index.js', target: 'shared/compiler/watcher/file-watcher.js', type: 'local', isDynamic: true },
  { source: 'shared/compiler/extractor/ast-walker.js', target: 'shared/compiler/extractor/atom-extractor.js', type: 'local', isDynamic: false },
  { source: 'shared/compiler/risk/risk-scorer.js', target: 'shared/storage/repository.js', type: 'local', isDynamic: false },
  { source: 'shared/compiler/risk/risk-handler.js', target: 'shared/compiler/risk/risk-scorer.js', type: 'local', isDynamic: false },
  { source: 'shared/guards/registry.js', target: 'shared/guards/integrity-guard.js', type: 'local', isDynamic: false },
  { source: 'shared/guards/integrity-guard.js', target: 'shared/storage/repository.js', type: 'local', isDynamic: false },
  { source: 'shared/storage/repository.js', target: 'shared/storage/schema-registry.js', type: 'local', isDynamic: false },
  { source: 'shared/query/apis/query-graph.js', target: 'shared/storage/repository.js', type: 'local', isDynamic: false },
  { source: 'shared/query/apis/traverse-graph.js', target: 'shared/storage/repository.js', type: 'local', isDynamic: false },
  { source: 'mcp-server/index.js', target: 'shared/mcp/tool-registry.js', type: 'local', isDynamic: false },
  { source: 'shared/mcp/tool-registry.js', target: 'shared/query/apis/query-graph.js', type: 'local', isDynamic: true },
  { source: 'shared/mcp/tool-registry.js', target: 'shared/query/apis/traverse-graph.js', type: 'local', isDynamic: true },
  { source: 'shared/compiler/society/society-detector.js', target: 'shared/storage/repository.js', type: 'local', isDynamic: false },
];

export const DEMO_ATOMS: AtomInfo[] = [
  { id: 'a1', name: 'extractAtoms', type: 'function', filePath: 'shared/compiler/index.js', lineStart: 15, lineEnd: 85, linesOfCode: 70, complexity: 12, isExported: true, isAsync: true, archetype: 'orchestrator', fragilityScore: 0.62, couplingScore: 0.45, propagationScore: 0.85, centralityClass: 'hub', riskLevel: 'high', inDegree: 3, outDegree: 8, callersCount: 3, calleesCount: 8 },
  { id: 'a2', name: 'walkAST', type: 'function', filePath: 'shared/compiler/index.js', lineStart: 90, lineEnd: 145, linesOfCode: 55, complexity: 15, isExported: true, isAsync: false, archetype: 'transformer', fragilityScore: 0.55, couplingScore: 0.38, propagationScore: 0.71, centralityClass: 'bridge', riskLevel: 'high', inDegree: 2, outDegree: 5, callersCount: 2, calleesCount: 5 },
  { id: 'a3', name: 'calculateRisk', type: 'function', filePath: 'shared/compiler/index.js', lineStart: 150, lineEnd: 210, linesOfCode: 60, complexity: 10, isExported: true, isAsync: false, archetype: 'calculator', fragilityScore: 0.45, couplingScore: 0.52, propagationScore: 0.63, centralityClass: 'peripheral', riskLevel: 'medium', inDegree: 4, outDegree: 3, callersCount: 4, calleesCount: 3 },
  { id: 'a4', name: 'CONFIG', type: 'variable', filePath: 'shared/compiler/index.js', lineStart: 1, lineEnd: 12, linesOfCode: 12, complexity: 1, isExported: true, isAsync: false, archetype: 'config', fragilityScore: 0.10, couplingScore: 0.65, propagationScore: 0.90, centralityClass: 'hub', riskLevel: 'low', inDegree: 0, outDegree: 0, callersCount: 0, calleesCount: 0 },
  { id: 'a5', name: 'normalizeImports', type: 'arrow', filePath: 'shared/compiler/index.js', lineStart: 215, lineEnd: 250, linesOfCode: 35, complexity: 6, isExported: false, isAsync: false, archetype: 'helper', fragilityScore: 0.22, couplingScore: 0.18, propagationScore: 0.15, centralityClass: 'leaf', riskLevel: 'low', inDegree: 1, outDegree: 2, callersCount: 1, calleesCount: 2 },
  { id: 'a6', name: 'detectSocieties', type: 'function', filePath: 'shared/compiler/index.js', lineStart: 255, lineEnd: 320, linesOfCode: 65, complexity: 8, isExported: true, isAsync: true, archetype: 'detector', fragilityScore: 0.38, couplingScore: 0.32, propagationScore: 0.50, centralityClass: 'bridge', riskLevel: 'medium', inDegree: 2, outDegree: 4, callersCount: 2, calleesCount: 4 },
  { id: 'a7', name: 'buildDependencyGraph', type: 'function', filePath: 'shared/compiler/index.js', lineStart: 325, lineEnd: 380, linesOfCode: 55, complexity: 9, isExported: true, isAsync: false, archetype: 'builder', fragilityScore: 0.48, couplingScore: 0.42, propagationScore: 0.58, centralityClass: 'bridge', riskLevel: 'medium', inDegree: 3, outDegree: 5, callersCount: 3, calleesCount: 5 },
];

export const DEMO_RELATIONS: AtomRelation[] = [
  { sourceId: 'a1', targetId: 'a2', relationType: 'calls', weight: 1, lineNumber: 28 },
  { sourceId: 'a1', targetId: 'a3', relationType: 'calls', weight: 1, lineNumber: 42 },
  { sourceId: 'a1', targetId: 'a6', relationType: 'calls', weight: 1, lineNumber: 55 },
  { sourceId: 'a1', targetId: 'a7', relationType: 'calls', weight: 1, lineNumber: 68 },
  { sourceId: 'a2', targetId: 'a5', relationType: 'calls', weight: 1, lineNumber: 105 },
  { sourceId: 'a3', targetId: 'a4', relationType: 'reads', weight: 1, lineNumber: 160 },
  { sourceId: 'a6', targetId: 'a7', relationType: 'calls', weight: 1, lineNumber: 270 },
  { sourceId: 'a7', targetId: 'a5', relationType: 'calls', weight: 1, lineNumber: 340 },
];

export const DEMO_HEALTH = {
  ready: true,
  status: 'healthy',
  service: 'OmnySystem MCP (demo)',
  transport: 'streamable-http',
  background: {
    phase2PendingFiles: 3,
    societiesCount: 12,
  },
};
