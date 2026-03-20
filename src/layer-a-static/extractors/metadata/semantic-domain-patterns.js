/**
 * @fileoverview semantic-domain-patterns.js
 *
 * Catálogo estático de patrones semánticos usado por extractSemanticDomain.
 */

export const DOMAIN_PATTERNS = {
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
