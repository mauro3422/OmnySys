/**
 * @fileoverview Semantic Analyzer
 * Computes semantic fingerprint and derives verb/domain/entity
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor/semantic-analyzer
 */

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
 * If LLM semantic analysis exists, uses it directly.
 * Otherwise, derives verb/domain/entity from name + static metadata.
 * @param {Object} atom - Atom object
 * @returns {string} Semantic fingerprint in format "verb:domain:entity"
 */
export function computeSemanticFingerprint(atom) {
  if (atom.semantic?.verb && atom.semantic.verb !== 'unknown') {
    return [atom.semantic.verb, atom.semantic.domain || 'unknown', atom.semantic.entity || 'unknown'].join(':');
  }

  // Derive from atom name
  const name = atom.name || '';
  const verb = deriveVerb(name);
  const domain = deriveDomain(atom);
  const entity = deriveEntity(name, verb);

  return `${verb}:${domain}:${entity}`;
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
 * Derives main entity from name (what comes after the verb)
 * @param {string} name - Function name
 * @param {string} verb - Detected verb
 * @returns {string} Entity
 */
export function deriveEntity(name, verb) {
  if (!name || !verb) return 'unknown';
  
  // Remove verb from start and take remaining in camelCase
  const rest = name.startsWith(verb)
    ? name.slice(verb.length)
    : name;
    
  if (!rest) return 'unknown';
  
  // Split camelCase into tokens and take last (the entity)
  const tokens = rest.replace(/([A-Z])/g, ' $1').trim().split(/\s+/);
  return tokens[tokens.length - 1].toLowerCase() || 'unknown';
}
