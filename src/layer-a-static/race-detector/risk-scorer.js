/**
 * @fileoverview Risk Scorer
 * 
 * Calcula la severidad/riesgo de cada race condition detectada
 * 
 * @module race-detector/risk-scorer
 */

export class RiskScorer {
  constructor() {
    this.weights = {
      type: {
        'WW': 1.0,  // Write-Write: máximo riesgo
        'RW': 0.8,  // Read-Write: alto riesgo
        'IE': 0.9,  // Initialization Error: muy alto
        'EH': 0.7,  // Event Handler: medio-alto
        'OTHER': 0.5
      },
      async: {
        both: 1.0,      // Ambos async
        one: 0.8,       // Uno async
        none: 0.3       // Ninguno async
      },
      dataIntegrity: {
        critical: 1.0,  // Pérdida de datos
        high: 0.8,      // Corrupción
        medium: 0.5,    // Inconsistencia temporal
        low: 0.2        // Problema menor
      },
      scope: {
        global: 1.0,    // Estado global
        module: 0.7,    // Estado de módulo
        external: 0.9,  // Recursos externos
        singleton: 0.8, // Singletons
        closure: 0.4    // Closures
      }
    };
  }

  /**
   * Calcula el score de riesgo para un race
   * 
   * @param {Object} race - Race condition
   * @param {Object} projectData - Datos del proyecto
   * @returns {string} - Severidad: 'critical', 'high', 'medium', 'low'
   */
  calculate(race, projectData) {
    const scores = {
      type: this.scoreType(race),
      async: this.scoreAsync(race),
      dataIntegrity: this.scoreDataIntegrity(race),
      scope: this.scoreScope(race),
      impact: this.scoreImpact(race, projectData),
      frequency: this.scoreFrequency(race)
    };

    // Calcular score ponderado
    const totalScore = (
      scores.type * 0.25 +
      scores.async * 0.20 +
      scores.dataIntegrity * 0.20 +
      scores.scope * 0.15 +
      scores.impact * 0.15 +
      scores.frequency * 0.05
    );

    // Mapear a severidad
    return this.scoreToSeverity(totalScore);
  }

  /**
   * Score por tipo de race
   */
  scoreType(race) {
    return this.weights.type[race.type] || 0.5;
  }

  /**
   * Score por async
   */
  scoreAsync(race) {
    const [access1, access2] = race.accesses;
    
    if (access1.isAsync && access2.isAsync) {
      return this.weights.async.both;
    } else if (access1.isAsync || access2.isAsync) {
      return this.weights.async.one;
    } else {
      return this.weights.async.none;
    }
  }

  /**
   * Score por integridad de datos
   */
  scoreDataIntegrity(race) {
    const stateType = race.stateType;
    
    // Base según tipo
    let base = this.weights.dataIntegrity.medium;
    
    // Ajustar según tipo de estado
    switch (stateType) {
      case 'global':
        base = this.weights.dataIntegrity.high;
        break;
      case 'external':
        base = this.weights.dataIntegrity.critical;
        break;
      case 'singleton':
        base = this.weights.dataIntegrity.high;
        break;
      case 'module':
        base = this.weights.dataIntegrity.medium;
        break;
      case 'closure':
        base = this.weights.dataIntegrity.low;
        break;
    }
    
    // Ajustar por tipo de race
    if (race.type === 'WW') {
      base = Math.min(base * 1.2, 1.0);
    } else if (race.type === 'IE') {
      base = Math.min(base * 1.1, 1.0);
    }
    
    return base;
  }

  /**
   * Score por scope del estado
   */
  scoreScope(race) {
    return this.weights.scope[race.stateType] || 0.5;
  }

  /**
   * Score por impacto en el sistema
   */
  scoreImpact(race, projectData) {
    let impact = 0.5;
    
    // Verificar si afecta business flows
    const affectedFlows = this.getAffectedBusinessFlows(race, projectData);
    if (affectedFlows.length > 0) {
      impact += 0.2 * Math.min(affectedFlows.length / 3, 1.0);
    }
    
    // Verificar si afecta entry points
    const affectedEntries = this.getAffectedEntryPoints(race, projectData);
    if (affectedEntries.length > 0) {
      impact += 0.2 * Math.min(affectedEntries.length / 2, 1.0);
    }
    
    // Verificar si es función exportada
    const hasExportedAccess = race.accesses.some(a => a.isExported);
    if (hasExportedAccess) {
      impact += 0.1;
    }
    
    return Math.min(impact, 1.0);
  }

  /**
   * Score por frecuencia de acceso
   */
  scoreFrequency(race) {
    const accesses = race.accesses;
    
    // Si hay más de 2 accesos (el race es multi-way)
    if (accesses.length > 2) {
      return 0.8 + (accesses.length - 2) * 0.05;
    }
    
    return 0.5;
  }

  /**
   * Convierte score numérico a severidad
   */
  scoreToSeverity(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Obtiene business flows afectados
   */
  getAffectedBusinessFlows(race, projectData) {
    const system = projectData.system;
    if (!system || !system.businessFlows) return [];
    
    const affected = [];
    const accessAtoms = new Set(race.accesses.map(a => a.atom));
    
    for (const flow of system.businessFlows) {
      for (const step of flow.steps || []) {
        // Verificar si el step usa alguno de los átomos del race
        if (step.function && accessAtoms.has(step.function)) {
          affected.push(flow.name);
          break;
        }
      }
    }
    
    return affected;
  }

  /**
   * Obtiene entry points afectados
   */
  getAffectedEntryPoints(race, projectData) {
    const system = projectData.system;
    if (!system || !system.entryPoints) return [];
    
    const affected = [];
    const accessModules = new Set(race.accesses.map(a => a.module));
    
    for (const entry of system.entryPoints) {
      if (entry.module && accessModules.has(entry.module)) {
        affected.push(entry.handler?.function || entry.type);
      }
    }
    
    return affected;
  }

  /**
   * Genera explicación del score
   */
  explainScore(race, projectData) {
    const scores = {
      type: this.scoreType(race),
      async: this.scoreAsync(race),
      dataIntegrity: this.scoreDataIntegrity(race),
      scope: this.scoreScope(race),
      impact: this.scoreImpact(race, projectData),
      frequency: this.scoreFrequency(race)
    };

    const factors = [];

    if (scores.type >= 0.8) {
      factors.push(`${race.type} race type is highly dangerous`);
    }

    if (scores.async >= 0.8) {
      factors.push('Both accesses are async, high concurrency risk');
    }

    if (scores.dataIntegrity >= 0.8) {
      factors.push('High risk of data corruption or loss');
    }

    if (scores.scope >= 0.8) {
      factors.push(`Global/external state: ${race.stateKey}`);
    }

    if (scores.impact >= 0.7) {
      factors.push('Affects critical business flows or entry points');
    }

    return factors;
  }

  /**
   * Sugiere nivel de testing basado en severidad
   */
  suggestTestingLevel(severity) {
    switch (severity) {
      case 'critical':
        return {
          level: 'mandatory',
          tests: ['unit', 'integration', 'e2e', 'stress'],
          priority: 'P0'
        };
      case 'high':
        return {
          level: 'recommended',
          tests: ['unit', 'integration', 'stress'],
          priority: 'P1'
        };
      case 'medium':
        return {
          level: 'optional',
          tests: ['unit', 'integration'],
          priority: 'P2'
        };
      case 'low':
        return {
          level: 'documentation',
          tests: ['unit'],
          priority: 'P3'
        };
      default:
        return {
          level: 'unknown',
          tests: [],
          priority: 'P3'
        };
    }
  }

  /**
   * Actualiza pesos
   */
  setWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }
}

export default RiskScorer;
