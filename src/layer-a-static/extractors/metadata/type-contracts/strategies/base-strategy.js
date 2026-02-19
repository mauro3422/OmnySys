/**
 * @fileoverview Base Extraction Strategy
 * 
 * Interfaz base para estrategias de extracción de tipos.
 * Implementa el patrón Strategy para permitir múltiples fuentes.
 * 
 * @module type-contracts/strategies/base-strategy
 * @version 1.0.0
 */

/**
 * Clase base para estrategias de extracción
 * @abstract
 */
export class ExtractionStrategy {
  constructor(name, priority = 0) {
    this.name = name;
    this.priority = priority;
  }

  /**
   * Verifica si esta estrategia puede manejar el contexto
   * @param {ExtractionContext} context - Contexto de extracción
   * @returns {boolean}
   */
  canHandle(context) {
    throw new Error('Must implement canHandle()');
  }

  /**
   * Extrae contratos de tipo
   * @param {ExtractionContext} context - Contexto de extracción
   * @returns {Partial<TypeContract>|null}
   */
  extract(context) {
    throw new Error('Must implement extract()');
  }

  /**
   * Calcula confianza de los resultados
   * @param {Partial<TypeContract>} contracts - Contratos extraídos
   * @returns {number} Confianza (0-1)
   */
  calculateConfidence(contracts) {
    return 0.5; // Default
  }
}

/**
 * Registry de estrategias
 */
export class StrategyRegistry {
  constructor() {
    this.strategies = [];
  }

  /**
   * Registra una estrategia
   * @param {ExtractionStrategy} strategy - Estrategia a registrar
   */
  register(strategy) {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Encuentra estrategias aplicables
   * @param {ExtractionContext} context - Contexto
   * @returns {ExtractionStrategy[]}
   */
  findApplicable(context) {
    return this.strategies.filter(s => s.canHandle(context));
  }

  /**
   * Extrae usando todas las estrategias aplicables
   * @param {ExtractionContext} context - Contexto
   * @returns {Partial<TypeContract>[]}
   */
  extractAll(context) {
    const results = [];
    for (const strategy of this.findApplicable(context)) {
      try {
        const extracted = strategy.extract(context);
        if (extracted) {
          results.push({
            source: strategy.name,
            priority: strategy.priority,
            contracts: extracted,
            confidence: strategy.calculateConfidence(extracted)
          });
        }
      } catch (error) {
        // Log but continue with other strategies
        // Log strategy failure but continue with remaining strategies
        if (process.env.DEBUG) process.stderr.write(`[type-contracts] Strategy ${strategy.name} failed: ${error.message}\n`);
      }
    }
    return results;
  }
}

export default { ExtractionStrategy, StrategyRegistry };
