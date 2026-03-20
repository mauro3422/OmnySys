/**
 * @fileoverview jsdoc-contracts.js
 *
 * Extrae contratos de documentación JSDoc/TSDoc
 *
 * @module extractors/metadata/jsdoc-contracts
 */

/**
 * Regex patterns para JSDoc
 */
const JSDOC_PATTERNS = {
  block: /\/\*\*\s*([\s\S]*?)\s*\*\//g,
  param: /@param\s*(?:\{([^}]+)\})?\s*(?:\[?([^\]]+)\]?)?\s*-?\s*(.*)/,
  returns: /@returns?\s*(?:\{([^}]+)\})?\s*(.*)/,
  throws: /@throws?\s*(?:\{([^}]+)\})?\s*(.*)/,
  lineCleaner: /^\s*\*\s?/
};

function buildLineStarts(code) {
  const lineStarts = [0];

  for (let index = 0; index < code.length; index++) {
    if (code.charCodeAt(index) === 10) {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

function getLineNumberFromIndex(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lineStarts[middle] <= index) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return Math.max(1, high + 1);
}

function getNextNonEmptyLine(code, position) {
  let start = position;

  while (start < code.length) {
    let end = code.indexOf('\n', start);
    if (end === -1) end = code.length;

    const trimmed = code.slice(start, end).trim();
    if (trimmed) {
      return trimmed;
    }

    start = end + 1;
  }

  return '';
}

/**
 * Extrae descripción de línea JSDoc
 * @param {string} cleanLine - Línea limpia
 * @returns {string|null} Descripción o null
 */
function extractDescription(cleanLine) {
  if (!cleanLine.startsWith('@') && cleanLine) {
    return cleanLine;
  }
  return null;
}

/**
 * Extrae parámetro de línea JSDoc
 * @param {string} cleanLine - Línea limpia
 * @returns {Object|null} Parámetro o null
 */
function extractParam(cleanLine) {
  const match = cleanLine.match(JSDOC_PATTERNS.param);
  if (match) {
    return {
      type: match[1] || 'any',
      name: match[2] || '',
      description: match[3] || '',
      optional: cleanLine.includes('[') && cleanLine.includes(']')
    };
  }
  return null;
}

/**
 * Extrae retorno de línea JSDoc
 * @param {string} cleanLine - Línea limpia
 * @returns {Object|null} Retorno o null
 */
function extractReturns(cleanLine) {
  const match = cleanLine.match(JSDOC_PATTERNS.returns);
  if (match) {
    return {
      type: match[1] || 'any',
      description: match[2] || ''
    };
  }
  return null;
}

/**
 * Extrae throws de línea JSDoc
 * @param {string} cleanLine - Línea limpia
 * @returns {Object|null} Throws o null
 */
function extractThrows(cleanLine) {
  const match = cleanLine.match(JSDOC_PATTERNS.throws);
  if (match) {
    return {
      type: match[1] || 'Error',
      description: match[2] || ''
    };
  }
  return null;
}

/**
 * Procesa línea JSDoc y actualiza contrato
 * @param {string} line - Línea original
 * @param {Object} contract - Contrato a actualizar
 */
function processJSDocLine(line, contract) {
  const cleanLine = line.replace(JSDOC_PATTERNS.lineCleaner, '').trim();

  if (handleJSDocParamLine(cleanLine, contract)) return;
  if (handleJSDocReturnsLine(cleanLine, contract)) return;
  if (handleJSDocThrowsLine(cleanLine, contract)) return;
  if (handleJSDocDeprecatedLine(cleanLine, contract)) return;
  handleJSDocDescriptionLine(cleanLine, contract);
}

function handleJSDocParamLine(cleanLine, contract) {
  if (!cleanLine.startsWith('@param')) return false;

  const param = extractParam(cleanLine);
  if (param) contract.params.push(param);
  return true;
}

function handleJSDocReturnsLine(cleanLine, contract) {
  if (!(cleanLine.startsWith('@returns') || cleanLine.startsWith('@return'))) return false;

  const returns = extractReturns(cleanLine);
  if (returns) contract.returns = returns;
  return true;
}

function handleJSDocThrowsLine(cleanLine, contract) {
  if (!(cleanLine.startsWith('@throws') || cleanLine.startsWith('@throw'))) return false;

  const throws = extractThrows(cleanLine);
  if (throws) contract.throws.push(throws);
  return true;
}

function handleJSDocDeprecatedLine(cleanLine, contract) {
  if (!cleanLine.startsWith('@deprecated')) return false;

  contract.deprecated = true;
  contract.deprecatedReason = cleanLine.replace('@deprecated', '').trim();
  return true;
}

function handleJSDocDescriptionLine(cleanLine, contract) {
  if (contract.description) return;

  const desc = extractDescription(cleanLine);
  if (desc) contract.description = desc;
}

/**
 * Clasifica contrato según siguiente línea de código
 * @param {string} nextLine - Siguiente línea
 * @param {Object} contract - Contrato
 * @returns {Object} Contrato clasificado
 */
function classifyContract(nextLine, contract) {
  const isFunction = nextLine.includes('function') || nextLine.includes('=>') || nextLine.includes('(');
  const isType = nextLine.includes('interface') || nextLine.includes('type ');

  return {
    ...contract,
    isFunction,
    isType
  };
}

/**
 * Extrae contratos de documentación JSDoc/TSDoc
 * @param {string} code - Código fuente
 * @returns {Object} - { functions: [], types: [], all: [] }
 */
export function extractJSDocContracts(code) {
  const contracts = {
    functions: [],
    types: [],
    all: []
  };

  if (!code || code.indexOf('/**') === -1) {
    return contracts;
  }

  const lineStarts = buildLineStarts(code);
  let match;

  JSDOC_PATTERNS.block.lastIndex = 0;
  while ((match = JSDOC_PATTERNS.block.exec(code)) !== null) {
    const block = match[1];
    const line = getLineNumberFromIndex(lineStarts, match.index);

    const contract = {
      line,
      description: '',
      params: [],
      returns: null,
      throws: [],
      deprecated: false,
      deprecatedReason: ''
    };

    // Procesar cada línea del bloque JSDoc
    const lines = block.split('\n');
    for (const line of lines) {
      processJSDocLine(line, contract);
    }

    contracts.all.push(contract);

    // Clasificar y agregar a la categoría correspondiente
    const nextLine = getNextNonEmptyLine(code, match.index + match[0].length);
    const classified = classifyContract(nextLine, contract);

    if (classified.isFunction) {
      contracts.functions.push(contract);
    } else if (classified.isType) {
      contracts.types.push(contract);
    }
  }

  return contracts;
}
