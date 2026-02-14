/**
 * @fileoverview TypeScript Extraction Strategy
 * 
 * Extrae tipos desde anotaciones TypeScript.
 * 
 * @module type-contracts/strategies/typescript-strategy
 * @version 1.0.0
 */

import { ExtractionStrategy } from './base-strategy.js';
import { normalizeType } from '../types/type-analyzer.js';

/**
 * Estrategia de extracción desde TypeScript
 */
export class TypeScriptStrategy extends ExtractionStrategy {
  constructor() {
    super('typescript', 90);
  }

  canHandle(context) {
    return context.language === 'typescript' || 
           context.ast?.parameters ||
           this.hasTypeScriptAnnotations(context.code);
  }

  extract(context) {
    const { code, ast } = context;
    const contracts = { params: [], returns: null };

    // Extraer desde AST de TypeScript
    if (ast?.parameters) {
      contracts.params = ast.parameters.map(p => ({
        name: p.name?.text || p.name,
        type: normalizeType(p.type?.getText?.() || p.type || 'any'),
        optional: p.questionToken !== undefined,
        inferred: false
      }));
    }

    if (ast?.type) {
      contracts.returns = {
        type: normalizeType(ast.type.getText?.() || ast.type),
        nullable: false,
        inferred: false
      };
    }

    // Fallback a pattern matching si no hay AST
    if (contracts.params.length === 0 && code) {
      const extracted = this.extractFromCode(code);
      if (extracted) {
        contracts.params = extracted.params;
        contracts.returns = extracted.returns;
      }
    }

    return contracts.params.length > 0 || contracts.returns ? contracts : null;
  }

  hasTypeScriptAnnotations(code) {
    if (!code) return false;
    // Detectar anotaciones TypeScript simples
    return /:\s*(string|number|boolean|any|void|Promise|Array|Record|Map|Set)\s*[;,=)]/.test(code) ||
           /function\s+\w*\s*\([^)]*\)\s*:\s*\w+/.test(code);
  }

  extractFromCode(code) {
    // Pattern matching básico
    const patterns = [
      // function foo(x: T): R
      /function\s*(?:\w+)?\s*\(([^)]*)\)\s*:\s*(\w+(?:<[^>]+>)?)/,
      // (x: T) => R
      /\(([^)]*)\)\s*:\s*(\w+(?:<[^>]+>)?)\s*=>/
    ];

    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        const params = match[1].split(',').map(p => {
          const [name, type] = p.split(':').map(s => s.trim());
          return { 
            name: name || 'param', 
            type: normalizeType(type) || 'any',
            inferred: false
          };
        }).filter(p => p.name);

        return {
          params,
          returns: { type: normalizeType(match[2]), inferred: false }
        };
      }
    }

    return null;
  }

  calculateConfidence(contracts) {
    // TypeScript tiene alta confianza pero menos que JSDoc documentado
    if (contracts.params?.length > 0 && contracts.returns) {
      return 0.85;
    }
    if (contracts.params?.length > 0 || contracts.returns) {
      return 0.7;
    }
    return 0.5;
  }
}

export default TypeScriptStrategy;
