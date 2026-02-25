/**
 * @fileoverview large-monolithic.js
 * Detecta archivos grandes que tienen un solo propósito dominante
 * (a diferencia de architectural-debt que busca múltiples responsabilidades)
 */

import { isAnalysisScript, isTestFile } from './utils.js';

/**
 * Detecta archivos monolithicos grandes
 * Se activa cuando: >250 líneas Y (un solo propósito dominante)
 * 
 * Ejemplo: system-map.js tiene 429 líneas pero todas las funciones
 * hacen operaciones relacionadas con "system map" → no se detecta en debt
 * pero viola SRP porque hace muchas operaciones técnicas distintas
 * 
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Archivos monolithicos grandes
 */
export function findLargeMonolithic(atoms) {
  const monolithicFiles = [];
  
  // Agrupar átomos por archivo
  const byFile = new Map();
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (isAnalysisScript(atom)) continue;
    if (isTestFile(atom.filePath)) continue; // Ignorar archivos de test
    
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, {
        atoms: [],
        totalLines: 0,
        flowTypes: new Map(), // flowType -> count
        purposes: new Map(),   // purpose -> count
        archetypes: new Map(),  // archetype -> count
        operations: new Set(),   // operaciones técnicas distintas
        functionNames: new Set() // nombres de funciones para inferir operaciones
      });
    }
    
    const fileData = byFile.get(atom.filePath);
    fileData.atoms.push(atom);
    fileData.totalLines = Math.max(fileData.totalLines, atom.endLine || atom.line || 0);
    
    // Contar flowTypes
    if (atom.dna?.flowType) {
      const count = (fileData.flowTypes.get(atom.dna.flowType) || 0) + 1;
      fileData.flowTypes.set(atom.dna.flowType, count);
    }
    
    // Contar purposes
    if (atom.purpose) {
      const count = (fileData.purposes.get(atom.purpose) || 0) + 1;
      fileData.purposes.set(atom.purpose, count);
    }
    
    // Contar archetypes
    if (atom.archetype?.type) {
      const count = (fileData.archetypes.get(atom.archetype.type) || 0) + 1;
      fileData.archetypes.set(atom.archetype.type, count);
    }
    
    // Detectar operaciones técnicas distintas
    if (atom.dna?.operations) {
      for (const op of atom.dna.operations) {
        fileData.operations.add(op);
      }
    }
    
    // Inferir operaciones de los nombres de funciones
    if (atom.name) {
      const inferredOps = inferOperations(atom.name, atom.calls || []);
      for (const op of inferredOps) {
        fileData.operations.add(op);
      }
    }
  }
  
  // Evaluar cada archivo
  for (const [filePath, fileData] of byFile) {
    const lines = fileData.totalLines;
    
    if (lines <= 250) continue;
    
    // Calcular diversidad de propósito
    const totalAtoms = fileData.atoms.length;
    const uniqueFlowTypes = fileData.flowTypes.size;
    const uniquePurposes = fileData.purposes.size;
    const uniqueArchetypes = fileData.archetypes.size;
    
    // Es "monolítico" si:
    // - Tiene >250 líneas
    // - Y tiene UN solo flowType dominante (>80% de los átomos)
    // - O un solo propósito dominante
    // - O un solo archetype dominante
    
    const dominantFlowType = getDominant(fileData.flowTypes);
    const dominantPurpose = getDominant(fileData.purposes);
    const dominantArchetype = getDominant(fileData.archetypes);
    
    const hasSingleDominantPurpose = (
      (dominantFlowType && dominantFlowType.pct >= 80) ||
      (dominantPurpose && dominantPurpose.pct >= 80) ||
      (dominantArchetype && dominantArchetype.pct >= 80)
    );
    
    if (hasSingleDominantPurpose) {
      // Es monolítico - un solo propósito pero hace muchas operaciones técnicas
      const operationCount = fileData.operations.size;
      const uniqueOps = [...fileData.operations];
      
      monolithicFiles.push({
        file: filePath,
        lines,
        atomCount: totalAtoms,
        dominantFlowType: dominantFlowType?.value || null,
        dominantPurpose: dominantPurpose?.value || null,
        dominantArchetype: dominantArchetype?.value || null,
        uniqueFlowTypes,
        uniquePurposes,
        uniqueArchetypes,
        operationCount,
        operations: uniqueOps.slice(0, 10), // primeras 10 operaciones
        violations: [
          `Archivo grande (${lines} líneas) con propósito único: ${dominantPurpose?.value || dominantArchetype?.value || 'unknown'}`,
          `Pero realiza ${operationCount} operaciones técnicas distintas`,
          `Possible SRP violation: un archivo con un dominio pero múltiples responsabilidades técnicas`
        ],
        solidViolations: analyzeSOLIDViolations(fileData),
        severity: lines > 400 ? 'critical' : (lines > 300 ? 'high' : 'medium'),
        recommendation: generateMonolithicRecommendation(fileData, lines, uniqueOps)
      });
    }
  }
  
  return monolithicFiles.sort((a, b) => b.lines - a.lines).slice(0, 15);
}

/**
 * Mapeo de palabras clave a operaciones por nombre de función
 */
const NAME_TO_OPERATION = [
  { keywords: ['save', 'write', 'persist'], operation: 'save/persist' },
  { keywords: ['load', 'read', 'get', 'fetch'], operation: 'read/load' },
  { keywords: ['parse', 'extract'], operation: 'parse/extract' },
  { keywords: ['transform', 'convert', 'map'], operation: 'transform/convert' },
  { keywords: ['validate', 'check'], operation: 'validate/check' },
  { keywords: ['delete', 'remove'], operation: 'delete/remove' },
  { keywords: ['create', 'new', 'build'], operation: 'create/build' },
  { keywords: ['update', 'modify'], operation: 'update/modify' },
  { keywords: ['search', 'find', 'query'], operation: 'search/query' }
];

/**
 * Mapeo de palabras clave a operaciones por llamadas
 */
const CALL_TO_OPERATION = [
  { keywords: ['sql', 'insert', 'update', 'delete'], operation: 'db-operation' },
  { keywords: ['http', 'fetch', 'request'], operation: 'http-request' },
  { keywords: ['json', 'parse'], operation: 'json-parse' },
  { keywords: ['file', 'fs', 'readfile', 'writefile'], operation: 'file-io' }
];

/**
 * Verifica si un nombre contiene alguna palabra clave
 * @param {string} name - Nombre a verificar
 * @param {string[]} keywords - Palabras clave
 * @returns {boolean} True si coincide
 */
function containsKeyword(name, keywords) {
  return keywords.some(keyword => name.includes(keyword));
}

/**
 * Infiere operaciones técnicas de los nombres de funciones
 * @param {string} name - Nombre de la función
 * @param {Array} calls - Funciones que llama
 * @returns {Array} Operaciones inferidas
 */
function inferOperations(name, calls) {
  const ops = new Set();
  const lowerName = (name || '').toLowerCase();

  // Inferir por nombre de función
  for (const { keywords, operation } of NAME_TO_OPERATION) {
    if (containsKeyword(lowerName, keywords)) {
      ops.add(operation);
    }
  }

  // Inferir por llamadas a funciones
  if (Array.isArray(calls)) {
    for (const call of calls) {
      const lowerCall = (call || '').toString().toLowerCase();
      for (const { keywords, operation } of CALL_TO_OPERATION) {
        if (containsKeyword(lowerCall, keywords)) {
          ops.add(operation);
          break;
        }
      }
    }
  }

  return [...ops];
}

/**
 * Obtiene el valor dominante y su porcentaje
 * @param {Map} map - Mapa de valores a conteos
 * @returns {Object} { value, count, pct }
 */
function getDominant(map) {
  if (map.size === 0) return null;
  
  let maxEntry = null;
  let maxCount = 0;
  let total = 0;
  
  for (const [key, count] of map) {
    total += count;
    if (count > maxCount) {
      maxCount = count;
      maxEntry = key;
    }
  }
  
  return {
    value: maxEntry,
    count: maxCount,
    pct: Math.round((maxCount / total) * 100)
  };
}

/**
 * Analiza violaciones de SOLID en el archivo
 * @param {Object} fileData - Datos del archivo
 * @returns {Object} Violaciones de SOLID
 */
function analyzeSOLIDViolations(fileData) {
  const violations = {
    SRP: null,  // Single Responsibility Principle
    OCP: null,  // Open/Closed Principle
    LSP: null,  // Liskov Substitution Principle
    ISP: null,  // Interface Segregation Principle
    DIP: null   // Dependency Inversion Principle
  };
  
  const { operations, atoms } = fileData;
  
  // SRP: Si hace muchas operaciones técnicas distintas
  if (operations.size > 5) {
    violations.SRP = {
      issue: `${operations.size} operaciones técnicas distintas en un solo archivo`,
      recommendation: 'Separar en módulos por responsabilidad técnica (save, load, transform, etc.)'
    };
  }
  
  // OCP: Si para agregar nueva funcionalidad hay que modificar el archivo
  if (atoms.length > 10) {
    const exportedFunctions = atoms.filter(a => a.isExported).length;
    if (exportedFunctions > 8) {
      violations.OCP = {
        issue: `${exportedFunctions} funciones exportadas - probable violacion de OCP`,
        recommendation: 'Considerar patrones de extensión en lugar de modificación'
      };
    }
  }
  
  // ISP: Si tiene muchas responsabilidades agrupadas
  if (fileData.archetypes.size > 0) {
    const types = Array.from(fileData.archetypes.keys());
    if (types.length > 3) {
      violations.ISP = {
        issue: `${types.length} tipos de comportamiento distintos`,
        recommendation: 'Separar en módulos más pequeños y específicos'
      };
    }
  }
  
  // DIP: Esto requeriría análisis de dependencias - marcar como "requires deeper analysis"
  if (atoms.some(a => a.calls?.length > 5)) {
    violations.DIP = {
      issue: 'Múltiples dependencias externas - verificar si depende de abstracciones',
      recommendation: 'Revisar que las dependencias sean a través de abstracciones, no concreciones'
    };
  }
  
  return violations;
}

/**
 * Genera recomendación para archivo monolítico
 * @param {Object} fileData - Datos del archivo
 * @param {number} lines - Cantidad de líneas
 * @param {Array} operations - Lista de operaciones
 * @returns {string} Recomendación
 */
function generateMonolithicRecommendation(fileData, lines, operations) {
  const ops = operations.slice(0, 5);
  const opsText = ops.length > 0 ? ops.join(', ') : 'múltiples operaciones';
  
  return [
    `Archivo de ${lines} líneas con un solo propósito de dominio pero múltiples responsabilidades técnicas.`,
    `Opera con: ${opsText}${operations.length > 5 ? '...' : ''}`,
    'Considera aplicar SRP: separar operaciones técnicas en módulos distintos.',
    'Ejemplo: un archivo "system-map.js" que save/load/files/deps/connections/risk/issues → dividir en storage/handlers/parsers/'
  ].join(' ');
}
