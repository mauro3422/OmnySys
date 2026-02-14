/**
 * @fileoverview Type Contract Connection Extractor
 * 
 * Encuentra conexiones entre átomos basadas en contratos de tipo.
 * 
 * @module type-contracts/contracts/connection-extractor
 * @version 1.0.0
 */

import { createLogger } from '../../../../utils/logger.js';
import { normalizeType, analyzeType } from '../types/type-analyzer.js';
import { validateTypeCompatibility } from '../validators/compatibility-validator.js';

const logger = createLogger('OmnySys:type-contracts:connections');

/**
 * Índice de tipos para búsqueda eficiente
 */
class TypeIndex {
  constructor() {
    this.byExactType = new Map();
    this.byBaseType = new Map();
  }

  /**
   * Agrega un átomo al índice
   * @param {Object} atom - Átomo a indexar
   */
  add(atom) {
    if (!atom.typeContracts?.returns) return;

    const returnType = normalizeType(atom.typeContracts.returns.type);
    const baseType = analyzeType(returnType).baseType;

    // Indexar por tipo exacto
    if (!this.byExactType.has(returnType)) {
      this.byExactType.set(returnType, []);
    }
    this.byExactType.get(returnType).push(atom);

    // Indexar por tipo base
    if (baseType && baseType !== returnType) {
      if (!this.byBaseType.has(baseType)) {
        this.byBaseType.set(baseType, []);
      }
      this.byBaseType.get(baseType).push(atom);
    }
  }

  /**
   * Busca átomos que retornen un tipo compatible
   * @param {string} type - Tipo buscado
   * @returns {Object[]} Átomos candidatos
   */
  findCompatible(type) {
    const normalized = normalizeType(type);
    const baseType = analyzeType(normalized).baseType;

    const results = new Set();

    // Buscar por tipo exacto
    const exact = this.byExactType.get(normalized);
    if (exact) exact.forEach(a => results.add(a));

    // Buscar por tipo base
    const base = this.byBaseType.get(baseType);
    if (base) base.forEach(a => results.add(a));

    // Buscar en subtipos conocidos
    const subtypes = this.findSubtypes(normalized);
    subtypes.forEach(a => results.add(a));

    return Array.from(results);
  }

  /**
   * Encuentra subtipos de un tipo
   * @param {string} type - Tipo base
   * @returns {Object[]}
   */
  findSubtypes(type) {
    const results = [];
    const subtypeMap = {
      'Object': ['Record', 'Map', 'Set'],
      'Array': ['any[]', 'string[]', 'number[]'],
      'string': ['String'],
      'number': ['Number', 'integer', 'float']
    };

    const candidates = subtypeMap[type] || [];
    for (const candidate of candidates) {
      const atoms = this.byExactType.get(candidate) || [];
      results.push(...atoms);
    }

    return results;
  }
}

/**
 * Extrae conexiones de tipo entre átomos
 * @param {Object[]} atoms - Todos los átomos
 * @returns {TypeConnection[]}
 */
export function extractTypeContractConnections(atoms) {
  const connections = [];
  
  if (!atoms || atoms.length === 0) return connections;

  try {
    // Construir índice
    const index = new TypeIndex();
    for (const atom of atoms) {
      index.add(atom);
    }

    // Buscar conexiones
    for (const target of atoms) {
      if (!target.typeContracts?.params) continue;

      for (const param of target.typeContracts.params) {
        const paramType = normalizeType(param.type);
        
        // Buscar fuentes potenciales
        const sources = index.findCompatible(paramType);
        
        for (const source of sources) {
          if (source.id === target.id) continue;

          // Validar compatibilidad completa
          const validation = validateTypeCompatibility(
            source.typeContracts.returns.type,
            param.type
          );

          connections.push({
            type: 'type-contract',
            from: source.id,
            to: target.id,
            param: param.name,
            outputType: source.typeContracts.returns.type,
            inputType: param.type,
            compatible: validation.compatible,
            confidence: validation.confidence,
            coercion: validation.coercion,
            nullable: validation.nullable,
            signature: {
              source: source.typeContracts.signature,
              target: target.typeContracts.signature
            }
          });
        }
      }
    }

  } catch (error) {
    logger.warn('Error extracting type connections:', error.message);
  }

  return connections;
}

/**
 * Filtra conexiones por confianza mínima
 * @param {TypeConnection[]} connections - Conexiones
 * @param {number} minConfidence - Confianza mínima (0-1)
 * @returns {TypeConnection[]}
 */
export function filterByConfidence(connections, minConfidence = 0.5) {
  return connections.filter(c => c.confidence >= minConfidence);
}

/**
 * Agrupa conexiones por átomo destino
 * @param {TypeConnection[]} connections - Conexiones
 * @returns {Map<string, TypeConnection[]>}
 */
export function groupByTarget(connections) {
  const grouped = new Map();
  
  for (const conn of connections) {
    if (!grouped.has(conn.to)) {
      grouped.set(conn.to, []);
    }
    grouped.get(conn.to).push(conn);
  }
  
  return grouped;
}

export default {
  extractTypeContractConnections,
  filterByConfidence,
  groupByTarget,
  TypeIndex
};
