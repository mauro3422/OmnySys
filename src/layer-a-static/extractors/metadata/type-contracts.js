/**
 * @fileoverview Type Contracts Extractor
 * 
 * Extrae y valida contratos de tipo entre funciones.
 * Usa JSDoc + TypeScript + inferencia para conectar
 * output de función A con input de función B.
 * 
 * @module layer-a-static/extractors/metadata/type-contracts
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:extractors:type-contracts');

/**
 * Extrae contratos de tipo de una función
 * 
 * @param {string} code - Código fuente
 * @param {Object} jsdoc - JSDoc parseado
 * @param {Object} ast - AST de la función
 * @returns {Object} Contratos de tipo
 */
export function extractTypeContracts(code, jsdoc = {}, ast = {}) {
  const contracts = {
    // Parámetros con sus tipos
    params: [],
    
    // Retorno con su tipo
    returns: null,
    
    // Errores que puede lanzar
    throws: [],
    
    // Generics/type parameters
    generics: [],
    
    // Contrato completo como string
    signature: null
  };
  
  try {
    // Extraer de JSDoc
    if (jsdoc.params) {
      contracts.params = jsdoc.params.map(p => ({
        name: p.name,
        type: normalizeType(p.type),
        optional: p.optional || false,
        defaultValue: p.defaultValue,
        description: p.description
      }));
    }
    
    if (jsdoc.returns) {
      contracts.returns = {
        type: normalizeType(jsdoc.returns.type),
        description: jsdoc.returns.description,
        nullable: isNullableType(jsdoc.returns.type)
      };
    }
    
    if (jsdoc.throws) {
      contracts.throws = jsdoc.throws.map(t => ({
        type: t.type || 'Error',
        description: t.description,
        condition: extractThrowCondition(t.description)
      }));
    }
    
    // Inferir de TypeScript si está disponible
    const tsContracts = extractFromTypeScript(code, ast);
    if (tsContracts) {
      mergeContracts(contracts, tsContracts);
    }
    
    // Inferir del código si no hay JSDoc/TS
    if (contracts.params.length === 0) {
      contracts.params = inferParamsFromCode(code);
    }
    
    if (!contracts.returns) {
      contracts.returns = inferReturnFromCode(code);
    }
    
    // Generar firma completa
    contracts.signature = generateSignature(contracts);
    
    // Calcular confianza del contrato
    contracts.confidence = calculateContractConfidence(contracts, jsdoc);
    
  } catch (error) {
    logger.warn('Failed to extract type contracts:', error.message);
  }
  
  return contracts;
}

/**
 * Normaliza un tipo (simplifica)
 */
function normalizeType(type) {
  if (!type) return 'any';
  
  // Limpiar espacios extra
  type = type.trim();
  
  // Normalizar opcionales
  if (type.endsWith('?')) {
    type = type.slice(0, -1);
  }
  
  // Normalizar unions básicas
  if (type.includes('|')) {
    return type.split('|').map(t => normalizeType(t)).join(' | ');
  }
  
  // Normalizar arrays
  if (type.endsWith('[]')) {
    return `Array<${normalizeType(type.slice(0, -2))}>`;
  }
  
  // Normalizar Promise
  if (type.startsWith('Promise<')) {
    return type;
  }
  
  return type;
}

/**
 * Verifica si un tipo es nullable
 */
function isNullableType(type) {
  if (!type) return true;
  return type.includes('null') || type.includes('undefined') || type.includes('?');
}

/**
 * Extrae condición del throw desde descripción
 */
function extractThrowCondition(description) {
  if (!description) return 'unknown';
  
  // Patrones comunes
  const patterns = [
    /if\s+(.+)/i,
    /when\s+(.+)/i,
    /unless\s+(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1].trim();
  }
  
  return description;
}

/**
 * Extrae tipos de TypeScript
 */
function extractFromTypeScript(code, ast) {
  // Si hay AST de TypeScript, usarlo
  if (ast?.parameters) {
    return {
      params: ast.parameters.map(p => ({
        name: p.name?.text,
        type: p.type?.getText?.() || p.type || 'any'
      })),
      returns: ast.type ? { type: ast.type.getText?.() || ast.type } : null
    };
  }
  
  // Pattern matching básico en código
  const contracts = { params: [], returns: null };
  
  // Detectar TypeScript en código JavaScript
  const tsParamPattern = /(?:function|=>)\s*(?:\w+)?\s*\(([^)]*)\)\s*:\s*(\w+(?:<[^>]+>)?)/;
  const match = code.match(tsParamPattern);
  
  if (match) {
    const params = match[1].split(',').map(p => {
      const [name, type] = p.split(':').map(s => s.trim());
      return { name, type: type || 'any' };
    });
    contracts.params = params;
    contracts.returns = { type: match[2] };
  }
  
  return contracts.params.length > 0 ? contracts : null;
}

/**
 * Fusiona contratos (JSDoc tiene prioridad)
 */
function mergeContracts(base, fromTS) {
  if (fromTS.params?.length > 0 && base.params.length === 0) {
    base.params = fromTS.params;
  }
  
  if (fromTS.returns && !base.returns) {
    base.returns = fromTS.returns;
  }
}

/**
 * Infiere parámetros del código (último recurso)
 */
function inferParamsFromCode(code) {
  const params = [];
  
  // Extraer nombres de parámetros
  const paramMatch = code.match(/function\s*\w*\s*\(([^)]*)\)/);
  if (paramMatch) {
    const names = paramMatch[1].split(',').map(p => p.trim().split('=')[0].trim());
    
    for (const name of names) {
      if (name && !name.includes('...')) {
        // Intentar inferir tipo de uso
        const type = inferTypeFromUsage(code, name);
        params.push({ name, type, inferred: true });
      }
    }
  }
  
  return params;
}

/**
 * Infiere tipo de retorno del código
 */
function inferReturnFromCode(code) {
  // Buscar returns
  const returns = code.match(/return\s+(.+);?$/gm);
  
  if (!returns) {
    return { type: 'void', inferred: true };
  }
  
  // Analizar qué se retorna
  const returnValues = returns.map(r => {
    const match = r.match(/return\s+(.+);?$/);
    return match ? match[1].trim() : 'unknown';
  });
  
  // Inferir tipo
  if (returnValues.every(v => v.startsWith('{') || v.startsWith('['))) {
    return { type: 'Object', inferred: true };
  }
  
  if (returnValues.every(v => /^["'`]/.test(v))) {
    return { type: 'string', inferred: true };
  }
  
  if (returnValues.every(v => /^\d/.test(v) || v === 'true' || v === 'false')) {
    return { type: 'boolean', inferred: true };
  }
  
  return { type: 'any', inferred: true };
}

/**
 * Infiere tipo de un parámetro de su uso
 */
function inferTypeFromUsage(code, paramName) {
  // Escapar paramName para uso seguro en regex
  const escaped = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Usos comunes
  if (new RegExp(`${escaped}\\.length`).test(code)) return 'string | Array';
  if (new RegExp(`${escaped}\\.`).test(code)) return 'Object';
  if (new RegExp(`${escaped}\\s*\\(`).test(code)) return 'Function';
  if (new RegExp(`${escaped}\\s*[+%*/-]`).test(code)) return 'number';  // Guión al final
  
  return 'any';
}

/**
 * Genera firma de función
 */
function generateSignature(contracts) {
  const params = contracts.params
    .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  const returns = contracts.returns?.type || 'void';
  
  return `(${params}) => ${returns}`;
}

/**
 * Calcula confianza del contrato
 */
function calculateContractConfidence(contracts, jsdoc) {
  let score = 0;
  let maxScore = 0;
  
  // JSDoc completo = alta confianza
  if (jsdoc.params?.length > 0) {
    score += 0.4;
    maxScore += 0.4;
  }
  
  if (jsdoc.returns) {
    score += 0.3;
    maxScore += 0.3;
  }
  
  if (jsdoc.throws?.length > 0) {
    score += 0.2;
    maxScore += 0.2;
  }
  
  // Inferencia = baja confianza
  if (contracts.params.some(p => p.inferred)) {
    score += 0.1;
    maxScore += 0.1;
  }
  
  return maxScore > 0 ? score / maxScore : 0.3;
}

/**
 * Valida compatibilidad entre dos tipos
 * 
 * @param {string} outputType - Tipo de salida
 * @param {string} inputType - Tipo de entrada
 * @returns {Object} Resultado de validación
 */
export function validateTypeCompatibility(outputType, inputType) {
  const result = {
    compatible: false,
    confidence: 0,
    coercion: 'none', // 'none', 'implicit', 'explicit'
    nullable: false
  };
  
  if (!outputType || !inputType) {
    result.compatible = true; // Asumimos compatible si no hay info
    result.confidence = 0.3;
    return result;
  }
  
  // Normalizar
  outputType = normalizeType(outputType);
  inputType = normalizeType(inputType);
  
  // Igual exacto
  if (outputType === inputType) {
    result.compatible = true;
    result.confidence = 1.0;
    return result;
  }
  
  // Nullable
  if (isNullableType(inputType)) {
    result.nullable = true;
    result.confidence = 0.8;
  }
  
  // Subtipos comunes
  const subtypeMap = {
    'Array': ['any[]', 'Object[]', 'string[]', 'number[]'],
    'Object': ['Record', 'Map', 'Set'],
    'string': ['String'],
    'number': ['Number', 'integer', 'float'],
    'boolean': ['Boolean']
  };
  
  for (const [base, subtypes] of Object.entries(subtypeMap)) {
    if (outputType === base && subtypes.includes(inputType)) {
      result.compatible = true;
      result.confidence = 0.9;
      return result;
    }
    if (subtypes.includes(outputType) && inputType === base) {
      result.compatible = true;
      result.confidence = 0.8;
      return result;
    }
  }
  
  // Promises
  if (outputType.startsWith('Promise<') && inputType.startsWith('Promise<')) {
    const outInner = outputType.slice(8, -1);
    const inInner = inputType.slice(8, -1);
    const innerCheck = validateTypeCompatibility(outInner, inInner);
    result.compatible = innerCheck.compatible;
    result.confidence = innerCheck.confidence * 0.9;
    return result;
  }
  
  // Unions (A | B)
  if (inputType.includes('|')) {
    const types = inputType.split('|').map(t => t.trim());
    const matches = types.some(t => 
      validateTypeCompatibility(outputType, t).compatible
    );
    if (matches) {
      result.compatible = true;
      result.confidence = 0.7;
      return result;
    }
  }
  
  // any acepta todo
  if (inputType === 'any' || outputType === 'any') {
    result.compatible = true;
    result.coercion = 'implicit';
    result.confidence = 0.5;
    return result;
  }
  
  // Por defecto: incompatible pero con baja confianza
  result.confidence = 0.2;
  return result;
}

/**
 * Encuentra conexiones de tipo entre átomos
 * 
 * Conecta output de A con input de B cuando los tipos coinciden
 * 
 * @param {Array} atoms - Todos los átomos
 * @returns {Array} Conexiones de tipo validadas
 */
export function extractTypeContractConnections(atoms) {
  const connections = [];
  
  // Indexar por tipo de retorno
  const returnIndex = new Map();
  
  for (const atom of atoms) {
    if (!atom.typeContracts?.returns) continue;
    
    const returnType = atom.typeContracts.returns.type;
    const normalized = normalizeType(returnType);
    
    if (!returnIndex.has(normalized)) {
      returnIndex.set(normalized, []);
    }
    returnIndex.get(normalized).push(atom);
    
    // También indexar por tipo base (sin generics)
    const baseType = normalized.split('<')[0];
    if (baseType !== normalized) {
      if (!returnIndex.has(baseType)) {
        returnIndex.set(baseType, []);
      }
      returnIndex.get(baseType).push(atom);
    }
  }
  
  // Buscar inputs que coincidan
  for (const atom of atoms) {
    if (!atom.typeContracts?.params) continue;
    
    for (const param of atom.typeContracts.params) {
      const paramType = normalizeType(param.type);
      
      // Buscar funciones que retornen este tipo
      const potentialSources = returnIndex.get(paramType) || [];
      
      for (const source of potentialSources) {
        if (source.id === atom.id) continue;
        
        // Validar compatibilidad
        const validation = validateTypeCompatibility(
          source.typeContracts.returns.type,
          param.type
        );
        
        if (validation.compatible) {
          connections.push({
            type: 'type-contract',
            from: source.id,
            to: atom.id,
            param: param.name,
            outputType: source.typeContracts.returns.type,
            inputType: param.type,
            compatible: true,
            confidence: validation.confidence,
            coercion: validation.coercion,
            signature: {
              source: source.typeContracts.signature,
              target: atom.typeContracts.signature
            }
          });
        }
      }
    }
  }
  
  return connections;
}

