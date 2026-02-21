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

/**
 * Domain patterns to detect
 */
const DOMAIN_PATTERNS = {
  json: {
    patterns: [
      /JSON\.parse\s*\(/gi,
      /JSON\.stringify\s*\(/gi,
      /\.json\s*\(\s*\)/gi,
      /extractJSON/gi,
      /parseJSON/gi,
      /stringifyJSON/gi,
      /["']application\/json["']/gi,
      /res\.json\s*\(/gi,
      /req\.body.*json/gi
    ],
    indicators: ['json', 'JSON', 'Json'],
    confidence: 0.9
  },
  
  http: {
    patterns: [
      /fetch\s*\(/gi,
      /axios\./gi,
      /http\.request/gi,
      /https\.request/gi,
      /\.get\s*\(\s*['"]/gi,
      /\.post\s*\(\s*['"]/gi,
      /\.put\s*\(\s*['"]/gi,
      /\.delete\s*\(\s*['"]/gi,
      /XMLHttpRequest/gi,
      /superagent/gi,
      /node-fetch/gi
    ],
    indicators: ['fetch', 'request', 'api', 'http', 'axios', 'get', 'post'],
    confidence: 0.85
  },
  
  filesystem: {
    patterns: [
      /fs\.readFile/gi,
      /fs\.writeFile/gi,
      /fs\.exists/gi,
      /fs\.mkdir/gi,
      /fs\.readdir/gi,
      /fs\.stat/gi,
      /fs\.unlink/gi,
      /readFileSync/gi,
      /writeFileSync/gi,
      /import.*fs['"]/gi,
      /require\s*\(\s*['"]fs['"]\s*\)/gi,
      /path\.join/gi,
      /path\.resolve/gi
    ],
    indicators: ['file', 'path', 'read', 'write', 'directory', 'folder'],
    confidence: 0.9
  },
  
  parsing: {
    patterns: [
      /\.parse\s*\(/gi,
      /\.match\s*\(/gi,
      /\.exec\s*\(/gi,
      /new RegExp/gi,
      /regex/gi,
      /extract[A-Z]/gi,
      /parse[A-Z]/gi,
      /decode/gi,
      /tokenize/gi
    ],
    indicators: ['parse', 'extract', 'decode', 'tokenize', 'match'],
    confidence: 0.8
  },
  
  validation: {
    patterns: [
      /validate[A-Z]/gi,
      /isValid/gi,
      /\.test\s*\(/gi,
      /check[A-Z]/gi,
      /verify[A-Z]/gi,
      /assert/gi,
      /expect\s*\(/gi,
      /if\s*\([^)]*===?\s*true\s*\)/gi,
      /if\s*\([^)]*===?\s*false\s*\)/gi,
      /\.every\s*\(/gi,
      /\.some\s*\(/gi
    ],
    indicators: ['validate', 'valid', 'check', 'verify', 'test', 'assert'],
    confidence: 0.85
  },
  
  transformation: {
    patterns: [
      /\.map\s*\(/gi,
      /\.filter\s*\(/gi,
      /\.reduce\s*\(/gi,
      /\.transform/gi,
      /convert[A-Z]/gi,
      /transform[A-Z]/gi,
      /\.toString\s*\(/gi,
      /\.toNumber/gi,
      /\.toLowerCase\s*\(/gi,
      /\.toUpperCase\s*\(/gi
    ],
    indicators: ['transform', 'convert', 'map', 'filter', 'reduce'],
    confidence: 0.8
  },
  
  string: {
    patterns: [
      /\.split\s*\(/gi,
      /\.join\s*\(/gi,
      /\.replace\s*\(/gi,
      /\.substring\s*\(/gi,
      /\.slice\s*\(/gi,
      /\.trim\s*\(/gi,
      /\.trimStart\s*\(/gi,
      /\.trimEnd\s*\(/gi,
      /\.padStart\s*\(/gi,
      /\.padEnd\s*\(/gi,
      /template literal/gi,
      /String\s*\(/gi
    ],
    indicators: ['string', 'text', 'str', 'char'],
    confidence: 0.75
  },
  
  async_flow: {
    patterns: [
      /async\s+function/gi,
      /async\s*\(/gi,
      /await\s+/gi,
      /Promise\./gi,
      /new Promise/gi,
      /\.then\s*\(/gi,
      /\.catch\s*\(/gi,
      /\.finally\s*\(/gi,
      /Promise\.all/gi,
      /Promise\.race/gi
    ],
    indicators: ['async', 'await', 'promise'],
    confidence: 0.95
  },
  
  event: {
    patterns: [
      /\.on\s*\(/gi,
      /\.emit\s*\(/gi,
      /\.addEventListener/gi,
      /\.removeEventListener/gi,
      /EventEmitter/gi,
      /dispatchEvent/gi,
      /new Event/gi,
      /new CustomEvent/gi
    ],
    indicators: ['event', 'emit', 'listen', 'dispatch'],
    confidence: 0.85
  },
  
  crypto: {
    patterns: [
      /crypto\./gi,
      /hash/gi,
      /encrypt/gi,
      /decrypt/gi,
      /md5/gi,
      /sha\d*/gi,
      /bcrypt/gi,
      /jwt/gi,
      /token/gi,
      /sign\s*\(/gi,
      /verify\s*\(/gi
    ],
    indicators: ['crypto', 'hash', 'encrypt', 'token', 'sign'],
    confidence: 0.9
  },
  
  database: {
    patterns: [
      /\.query\s*\(/gi,
      /SELECT\s+/gi,
      /INSERT\s+/gi,
      /UPDATE\s+/gi,
      /DELETE\s+/gi,
      /mongoose/gi,
      /sequelize/gi,
      /prisma/gi,
      /mongodb/gi,
      /redis/gi,
      /postgres/gi,
      /mysql/gi
    ],
    indicators: ['db', 'database', 'query', 'sql', 'mongo', 'redis'],
    confidence: 0.9
  },
  
  llm: {
    patterns: [
      /openai/gi,
      /anthropic/gi,
      /claude/gi,
      /gpt-\d/gi,
      /llm/gi,
      /chat completion/gi,
      /embedding/gi,
      /prompt/gi,
      /tokenize/gi,
      /conversation/gi,
      /messages\s*:\s*\[/gi
    ],
    indicators: ['llm', 'ai', 'gpt', 'claude', 'openai', 'prompt'],
    confidence: 0.9
  }
};

/**
 * Detecta el dominio semántico de una función
 * 
 * @param {string} code - Código fuente a analizar
 * @param {string} functionName - Nombre de la función (opcional, para mejorar detección)
 * @param {string} filePath - Ruta del archivo (opcional, para contexto)
 * @returns {Object} - Dominio detectado con metadata
 */
export function extractSemanticDomain(code, functionName = '', filePath = '') {
  const domains = [];
  const detectedPatterns = [];
  
  // Analizar cada dominio
  for (const [domainName, config] of Object.entries(DOMAIN_PATTERNS)) {
    const matches = [];
    
    // Buscar patrones en el código
    for (const pattern of config.patterns) {
      const found = code.match(pattern);
      if (found) {
        matches.push({
          pattern: pattern.toString(),
          count: found.length,
          samples: found.slice(0, 3)
        });
      }
    }
    
    // Buscar indicadores en el nombre de la función
    const nameLower = functionName.toLowerCase();
    const nameIndicators = config.indicators.filter(ind => 
      nameLower.includes(ind.toLowerCase())
    );
    
    // Buscar indicadores en el path del archivo
    const pathLower = filePath.toLowerCase();
    const pathIndicators = config.indicators.filter(ind =>
      pathLower.includes(ind.toLowerCase())
    );
    
    // Calcular score
    const patternScore = matches.length * 2;
    const nameScore = nameIndicators.length * 3;
    const pathScore = pathIndicators.length * 2;
    const totalScore = patternScore + nameScore + pathScore;
    
    if (totalScore > 0) {
      domains.push({
        domain: domainName,
        score: totalScore,
        confidence: config.confidence * Math.min(totalScore / 5, 1),
        matches,
        nameIndicators,
        pathIndicators
      });
      
      detectedPatterns.push(...matches.map(m => m.pattern));
    }
  }
  
  // Ordenar por score
  domains.sort((a, b) => b.score - a.score);
  
  // Determinar dominio principal
  const primaryDomain = domains[0]?.domain || 'unknown';
  const primaryConfidence = domains[0]?.confidence || 0;
  
  // Detectar propósito semántico basado en el nombre
  const purpose = inferPurpose(functionName, domains, code);
  
  // Detectar patrones de input/output esperados
  const inputPatterns = inferInputPatterns(functionName, domains, code);
  const outputPatterns = inferOutputPatterns(functionName, domains, code);
  
  return {
    primary: primaryDomain,
    confidence: primaryConfidence,
    allDomains: domains.slice(0, 3),
    purpose,
    inputPatterns,
    outputPatterns,
    patterns: detectedPatterns,
    timestamp: new Date().toISOString()
  };
}

/**
 * Infiere el propósito semántico de la función
 */
function inferPurpose(functionName, domains, code) {
  const nameLower = functionName.toLowerCase();
  const domainNames = domains.map(d => d.domain);
  
  // Patrones de propósito basados en el nombre
  if (nameLower.includes('extract') && domainNames.includes('json')) {
    return 'extract-json-from-text';
  }
  if (nameLower.includes('parse') && domainNames.includes('json')) {
    return 'parse-json-string';
  }
  if (nameLower.includes('validate') || nameLower.includes('isvalid')) {
    return 'validate-input';
  }
  if (nameLower.includes('transform') || nameLower.includes('convert')) {
    return 'transform-data';
  }
  if (nameLower.includes('fetch') || nameLower.includes('request')) {
    return 'fetch-remote-data';
  }
  if (nameLower.includes('read') && domainNames.includes('filesystem')) {
    return 'read-file';
  }
  if (nameLower.includes('write') && domainNames.includes('filesystem')) {
    return 'write-file';
  }
  if (nameLower.includes('clean') || nameLower.includes('sanitize')) {
    return 'clean-data';
  }
  if (domainNames.includes('llm')) {
    return 'llm-processing';
  }
  if (domainNames.includes('http')) {
    return 'api-interaction';
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
  if (domainNames.includes('json') || nameLower.includes('json')) {
    patterns.push('json-string', 'text-with-json', 'json-array');
  }
  if (domainNames.includes('filesystem')) {
    patterns.push('file-path', 'file-content', 'file-options');
  }
  if (domainNames.includes('http')) {
    patterns.push('url-string', 'request-options', 'api-endpoint');
  }
  if (domainNames.includes('validation')) {
    patterns.push('any-value', 'object-to-validate');
  }
  if (domainNames.includes('string')) {
    patterns.push('string-value', 'text-content');
  }
  if (domainNames.includes('llm')) {
    patterns.push('prompt-string', 'message-array', 'conversation-object');
  }
  
  // Detectar del código
  if (code.includes('null') && code.includes('undefined')) {
    patterns.push('null-or-undefined');
  }
  if (code.includes('[]') || code.includes('.length')) {
    patterns.push('array-value');
  }
  if (code.includes('{}') || code.includes('Object')) {
    patterns.push('object-value');
  }
  
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
  if (nameLower.includes('extract') || nameLower.includes('parse')) {
    patterns.push('parsed-object', 'extracted-value');
  }
  if (nameLower.includes('validate') || nameLower.includes('isvalid') || nameLower.includes('check')) {
    patterns.push('boolean-result', 'validation-object');
  }
  if (nameLower.includes('transform') || nameLower.includes('convert')) {
    patterns.push('transformed-value', 'converted-data');
  }
  if (domainNames.includes('json')) {
    patterns.push('json-object', 'json-array');
  }
  if (domainNames.includes('http')) {
    patterns.push('response-object', 'api-data');
  }
  if (domainNames.includes('filesystem')) {
    patterns.push('file-content', 'operation-result');
  }
  
  // Detectar del código
  if (code.includes('return null') || code.includes('return undefined')) {
    patterns.push('null-or-undefined');
  }
  if (code.includes('return true') || code.includes('return false')) {
    patterns.push('boolean-value');
  }
  if (code.includes('return {') || code.includes('return Object')) {
    patterns.push('object-value');
  }
  if (code.includes('return [') || code.includes('return Array')) {
    patterns.push('array-value');
  }
  if (code.includes('return "') || code.includes("return '") || code.includes('return `')) {
    patterns.push('string-value');
  }
  
  return patterns.length > 0 ? patterns : ['unknown'];
}

export default extractSemanticDomain;
