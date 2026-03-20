/**
 * @fileoverview semantic-domain.js
 * 
 * Extractor de dominio semántico - detecta qué tipo de operación realiza la función.
 * 
 * Detecta patrones como:
 * - JSON processing (JSON.parse, JSON.stringify, extractJSON)
 * - HTTP/API calls (fetch, axios, http.request)
 * - Filesystem operations (fs.readFile, fs.writeFile)
 * - String manipulation (regex, string methods)
 * - Validation (validate, isValid, check)
 * - Transformation (transform, convert, map)
 * - Parsing (parse, extract, decode)
 * 
 * @module extractors/metadata/semantic-domain
 * @phase Layer A
 */

import { DOMAIN_PATTERNS } from './semantic-domain-patterns.js';
const DOMAIN_ENTRIES = Object.entries(DOMAIN_PATTERNS);

function toLowerSafe(value) {
  return String(value || '').toLowerCase();
}

function collectPatternMatches(code, patterns) {
  const matches = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const found = code.match(pattern);
    if (!found) continue;

    matches.push({
      pattern: pattern.toString(),
      count: found.length,
      samples: found.slice(0, 3)
    });
  }

  return matches;
}

function collectIndicators(haystack, indicators) {
  return indicators.filter((indicator) => haystack.includes(indicator.toLowerCase()));
}

function evaluateDomain(code, normalizedFunctionName, normalizedFilePath, [domainName, config]) {
  const matches = collectPatternMatches(code, config.patterns);
  const nameIndicators = collectIndicators(normalizedFunctionName, config.indicators);
  const pathIndicators = collectIndicators(normalizedFilePath, config.indicators);
  const totalScore = (matches.length * 2) + (nameIndicators.length * 3) + (pathIndicators.length * 2);

  if (totalScore <= 0) {
    return null;
  }

  return {
    domain: domainName,
    score: totalScore,
    confidence: config.confidence * Math.min(totalScore / 5, 1),
    matches,
    nameIndicators,
    pathIndicators
  };
}

function buildSemanticDomainResult(code, functionName, filePath, domains, detectedPatterns) {
  const purpose = inferPurpose(functionName, domains, code);
  const inputPatterns = inferInputPatterns(functionName, domains, code);
  const outputPatterns = inferOutputPatterns(functionName, domains, code);

  return {
    primary: domains[0]?.domain || 'unknown',
    confidence: domains[0]?.confidence || 0,
    allDomains: domains.slice(0, 3),
    purpose,
    inputPatterns,
    outputPatterns,
    patterns: detectedPatterns,
    timestamp: new Date().toISOString()
  };
}

function addPatternsIfMatch(patterns, condition, values) {
  if (condition) {
    patterns.push(...values);
  }
}

function addCodePatternIfMatch(patterns, code, condition, value) {
  if (condition(code)) {
    patterns.push(value);
  }
}

function findPurposeByRules(nameLower, domainNames, rules) {
  for (const rule of rules) {
    if (rule.when(nameLower, domainNames)) {
      return rule.value;
    }
  }

  return null;
}

/**
 * Detecta el dominio semántico de una función
 * 
 * @param {string} code - Código fuente a analizar
 * @param {string} functionName - Nombre de la función (opcional, para mejorar detección)
 * @param {string} filePath - Ruta del archivo (opcional, para contexto)
 * @returns {Object} - Dominio detectado con metadata
 */
export function extractSemanticDomain(code, functionName = '', filePath = '') {
  if (!code || typeof code !== 'string') {
    return { primary: 'unknown', confidence: 0, allDomains: [], purpose: 'unknown',
      inputPatterns: [], outputPatterns: [], patterns: [], timestamp: new Date().toISOString() };
  }

  const domains = [];
  const detectedPatterns = [];
  const normalizedFunctionName = toLowerSafe(functionName);
  const normalizedFilePath = toLowerSafe(filePath);
  
  // Analizar cada dominio
  // Complejidad: O(D × P) donde D y P son constantes (DOMAIN_PATTERNS estático)
  for (const entry of DOMAIN_ENTRIES) {
    const candidate = evaluateDomain(code, normalizedFunctionName, normalizedFilePath, entry);
    if (!candidate) continue;

    domains.push(candidate);
    detectedPatterns.push(...candidate.matches.map((match) => match.pattern));
  }
  
  // Ordenar por score
  domains.sort((a, b) => b.score - a.score);

  return buildSemanticDomainResult(code, functionName, filePath, domains, detectedPatterns);
}

/**
 * Infiere el propósito semántico de la función
 */
function inferPurpose(functionName, domains, code) {
  const nameLower = functionName.toLowerCase();
  const domainNames = domains.map(d => d.domain);

  const purpose = findPurposeByRules(nameLower, domainNames, [
    { when: (name, domainList) => name.includes('extract') && domainList.includes('json'), value: 'extract-json-from-text' },
    { when: (name, domainList) => name.includes('parse') && domainList.includes('json'), value: 'parse-json-string' },
    { when: (name) => name.includes('validate') || name.includes('isvalid'), value: 'validate-input' },
    { when: (name) => name.includes('transform') || name.includes('convert'), value: 'transform-data' },
    { when: (name) => name.includes('fetch') || name.includes('request'), value: 'fetch-remote-data' },
    { when: (name, domainList) => name.includes('read') && domainList.includes('filesystem'), value: 'read-file' },
    { when: (name, domainList) => name.includes('write') && domainList.includes('filesystem'), value: 'write-file' },
    { when: (name) => name.includes('clean') || name.includes('sanitize'), value: 'clean-data' },
    { when: (_, domainList) => domainList.includes('llm'), value: 'llm-processing' },
    { when: (_, domainList) => domainList.includes('http'), value: 'api-interaction' }
  ]);

  if (purpose) {
    return purpose;
  }

  // Fallback basado en dominio
  if (domains.length > 0) {
    return `${domains[0].domain}-operation`;
  }

  return 'unknown';
}

/**
 * Infiere patrones de input esperados
 */
function inferInputPatterns(functionName, domains, code) {
  const patterns = [];
  const nameLower = functionName.toLowerCase();
  const domainNames = domains.map(d => d.domain);

  // Basado en el propósito
  addPatternsIfMatch(patterns, domainNames.includes('json') || nameLower.includes('json'), ['json-string', 'text-with-json', 'json-array']);
  addPatternsIfMatch(patterns, domainNames.includes('filesystem'), ['file-path', 'file-content', 'file-options']);
  addPatternsIfMatch(patterns, domainNames.includes('http'), ['url-string', 'request-options', 'api-endpoint']);
  addPatternsIfMatch(patterns, domainNames.includes('validation'), ['any-value', 'object-to-validate']);
  addPatternsIfMatch(patterns, domainNames.includes('string'), ['string-value', 'text-content']);
  addPatternsIfMatch(patterns, domainNames.includes('llm'), ['prompt-string', 'message-array', 'conversation-object']);

  // Detectar del código
  addCodePatternIfMatch(patterns, code, (source) => source.includes('null') && source.includes('undefined'), 'null-or-undefined');
  addCodePatternIfMatch(patterns, code, (source) => source.includes('[]') || source.includes('.length'), 'array-value');
  addCodePatternIfMatch(patterns, code, (source) => source.includes('{}') || source.includes('Object'), 'object-value');
  
  return patterns.length > 0 ? patterns : ['unknown'];
}

/**
 * Infiere patrones de output esperados
 */
function inferOutputPatterns(functionName, domains, code) {
  const patterns = [];
  const nameLower = functionName.toLowerCase();
  const domainNames = domains.map(d => d.domain);

  // Basado en el propósito
  addPatternsIfMatch(patterns, nameLower.includes('extract') || nameLower.includes('parse'), ['parsed-object', 'extracted-value']);
  addPatternsIfMatch(patterns, nameLower.includes('validate') || nameLower.includes('isvalid') || nameLower.includes('check'), ['boolean-result', 'validation-object']);
  addPatternsIfMatch(patterns, nameLower.includes('transform') || nameLower.includes('convert'), ['transformed-value', 'converted-data']);
  addPatternsIfMatch(patterns, domainNames.includes('json'), ['json-object', 'json-array']);
  addPatternsIfMatch(patterns, domainNames.includes('http'), ['response-object', 'api-data']);
  addPatternsIfMatch(patterns, domainNames.includes('filesystem'), ['file-content', 'operation-result']);

  // Detectar del código
  addCodePatternIfMatch(patterns, code, (source) => source.includes('return null') || source.includes('return undefined'), 'null-or-undefined');
  addCodePatternIfMatch(patterns, code, (source) => source.includes('return true') || source.includes('return false'), 'boolean-value');
  addCodePatternIfMatch(patterns, code, (source) => source.includes('return {') || source.includes('return Object'), 'object-value');
  addCodePatternIfMatch(patterns, code, (source) => source.includes('return [') || source.includes('return Array'), 'array-value');
  addCodePatternIfMatch(patterns, code, (source) => source.includes('return "') || source.includes("return '") || source.includes('return `'), 'string-value');
  
  return patterns.length > 0 ? patterns : ['unknown'];
}

export default extractSemanticDomain;
