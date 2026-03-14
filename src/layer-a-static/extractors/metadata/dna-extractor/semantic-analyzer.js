/**
 * @fileoverview Semantic Analyzer
 * Computes semantic fingerprint and derives verb/domain/entity
 *
 * @module layer-a-static/extractors/metadata/dna-extractor/semantic-analyzer
 */

import { extractClassNameFromAtomId, camelToUnderscore, removeClassSuffixes } from '../../utils/class-name-extractor.js';

/**
 * List of common verb prefixes for deriving semantic verb
 */
const VERB_PREFIXES = [
  'get', 'set', 'fetch', 'load', 'save', 'update', 'delete', 'remove',
  'create', 'build', 'make', 'generate', 'compute', 'calculate', 'parse',
  'format', 'transform', 'convert', 'extract', 'detect', 'analyze',
  'validate', 'check', 'verify', 'resolve', 'init', 'start', 'stop',
  'run', 'execute', 'process', 'handle', 'register', 'index', 'scan',
  'search', 'find', 'filter', 'sort', 'merge', 'apply', 'emit', 'send',
  'read', 'write', 'render', 'encode', 'decode', 'serialize', 'normalize'
];

/**
 * Computes semantic fingerprint for approximate matching.
 * format: "verb:chest:domain:entity" (V4)
 * @param {Object} atom - Atom object
 * @returns {string} Semantic fingerprint
 */
export function computeSemanticFingerprint(atom) {
  const name = atom.name || '';
  const verb = deriveVerb(name);
  const domain = deriveDomain(atom);
  const chest = deriveChest(name, verb);
  const entity = deriveEntity(atom, verb); // Pass atom instead of name

  return `${verb}:${chest}:${domain}:${entity}`;
}

/**
 * Categorizes an atom into a functional "Chest"
 * @param {string} name - Function name
 * @param {string} verb - Detected verb
 * @returns {string} Functional category (chest)
 */
export function deriveChest(name, verb) {
  const lower = name.toLowerCase();

  // Lifecycle Chest
  const lifecycleTerms = [
    'init', 'start', 'stop', 'shutdown', 'clear', 'reset', 'setup', 'teardown',
    'cleanup', 'dispose', 'constructor', 'callback', 'listener', 'handler',
    'it_arg1', 'describe_arg1'
  ];
  if (lifecycleTerms.some(term => lower.includes(term))) return 'lifecycle';

  // Telemetry Chest
  const telemetryTerms = ['stats', 'status', 'health', 'log', 'trace', 'monitor', 'report', 'audit', 'metric', 'telemetry', 'check', 'verify'];
  if (telemetryTerms.some(term => lower.includes(term))) return 'telemetry';

  // Storage Chest
  const storageTerms = ['save', 'load', 'fetch', 'persist', 'read', 'write', 'delete', 'remove', 'db', 'store', 'cache', 'repository'];
  if (storageTerms.some(term => lower.includes(term))) return 'storage';

  // Orchestration Chest
  const orchestrationTerms = ['handle', 'process', 'execute', 'run', 'dispatch', 'route', 'orchestrate', 'coordinator', 'main', 'start'];
  if (orchestrationTerms.some(term => lower.includes(term))) return 'orchestration';

  return 'logic';
}

/**
 * Extracts semantic verb from function name
 * @param {string} name - Function name
 * @returns {string} Semantic verb
 */
export function deriveVerb(name) {
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  for (const v of VERB_PREFIXES) {
    if (lower.startsWith(v) && lower.length > v.length) return v;
    if (lower === v) return v;
  }
  return 'process';
}

/**
 * Derives domain from atom's purpose, archetype, and caller pattern
 * @param {Object} atom - Atom object
 * @returns {string} Domain
 */
export function deriveDomain(atom) {
  const purpose = atom.purpose || '';
  if (purpose === 'API_EXPORT') return 'api';
  if (purpose === 'INTERNAL_HELPER') return 'internal';
  if (purpose === 'TEST_HELPER') return 'test';
  if (purpose === 'CONFIG') return 'config';

  const flowType = atom.dataFlow?.flowType || '';
  if (flowType.includes('read')) return 'io';
  if (flowType.includes('persist')) return 'persistence';
  if (flowType.includes('transform')) return 'transform';

  return 'core';
}

/**
 * Derives main entity from name, class context, and file path
 * 
 * Strategy:
 * 1. Try to extract entity from compound name (buildTestName → test_name)
 * 2. For pure verbs (build, create), use class name context (GraphBuilder.build → graph)
 * 3. Fallback to file path context (chain-builder.js → chain)
 * 
 * @param {Object} atom - Atom object with name, filePath, id, archetype
 * @param {string} verb - Detected verb
 * @returns {string} Entity
 */
export function deriveEntity(atom, verb) {
  const name = atom.name || '';
  
  if (!name || !verb) return 'unknown';

  // Strategy 1: Compound name (buildTestName → test_name)
  const rest = name.startsWith(verb)
    ? name.slice(verb.length)
    : name;

  if (rest) {
    const tokens = rest.replace(/([A-Z])/g, ' $1').trim().split(/\s+/);
    if (tokens.length > 0 && !(tokens.length === 1 && tokens[0] === '')) {
      return tokens.map(t => t.toLowerCase()).join('_');
    }
  }

  // Strategy 2: Pure verb (build, create, validate) → use class context
  // Example: GraphBuilder.build → entity = "graph"
  if (atom.archetype?.type === 'class-method' || atom.filePath?.includes('/builders/')) {
    const className = extractClassNameFromAtomId(atom.id);
    if (className) {
      // Remove "Builder" suffix from class name
      const entityFromClass = removeClassSuffixes(className, ['Builder']);
      if (entityFromClass && entityFromClass !== className) {
        return camelToUnderscore(entityFromClass);
      }
    }
  }

  // Strategy 3: Fallback to file path
  // Example: chain-builder.js → chain
  if (atom.filePath) {
    const fileName = atom.filePath.split('/').pop().replace('.js', '');
    const entityFromFile = fileName.replace(/-builder$/, '').replace(/_builder$/, '');
    if (entityFromFile && entityFromFile !== fileName) {
      return camelToUnderscore(entityFromFile);
    }
  }

  return 'unknown';
}
