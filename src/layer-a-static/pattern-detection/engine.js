/**
 * @fileoverview Pattern Detection Engine - Sistema Robusto de Detección de Patrones
 * 
 * ARQUITECTURA:
 * - Single Responsibility: Cada detector hace UNA cosa bien
 * - Open/Closed: Abierto a extensión, cerrado a modificación
 * - Liskov Substitution: Todos los detectors implementan la misma interfaz
 * - Interface Segregation: Contratos claros y mínimos
 * - Dependency Inversion: Core depende de abstracciones, no implementaciones
 * 
 * FLUJO DE DATOS:
 * 1. SystemMap → PatternDetectionEngine
 * 2. Engine → Detectors (ejecuta en paralelo)
 * 3. Detectors → PatternResults (cada uno con su scoring)
 * 4. Results → QualityAggregator (pondera y calcula score final)
 * 5. Score → ReportGenerator (recomendaciones inteligentes)
 * 
 * @module pattern-detection/engine
 * @version 2.0.0
 */

import { PatternDetectorRegistry } from './registry.js';
import { QualityScoreAggregator } from './aggregator.js';
import { PatternDetector } from './detector-base.js';

// Simple logger para evitar dependencias circulares
const logger = {
  info: (msg, ...args) => console.log(`[PatternDetection] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[PatternDetection] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[PatternDetection] ${msg}`, ...args),
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[PatternDetection] ${msg}`, ...args)
};

// Re-exportar PatternDetector para compatibilidad
export { PatternDetector } from './detector-base.js';

/**
 * Configuration Schema - Centraliza toda la configuración de detección
 * SSOT: Un solo lugar para ajustar thresholds, heurísticas, etc.
 */
export const DEFAULT_CONFIG = {
  // Thresholds globales
  thresholds: {
    // Deep chains: solo cadenas MUY profundas son problemáticas
    deepChains: {
      minDepth: 7,              // Profundidad mínima para considerar
      maxAcceptable: 20,        // Más de 20 es preocupante
      riskMultiplier: 2,        // Factor de riesgo por nivel extra
    },
    
    // Shared objects: distingue configuración vs estado
    sharedObjects: {
      minUsageCount: 3,         // Mínimo usos para ser "compartido"
      minRiskScore: 30,         // Score mínimo para ser "crítico"
      configPatterns: [         // Patterns de bajo riesgo
        /^CONFIG$/i, /^SETTINGS$/i, /^OPTIONS$/i, 
        /^DEFAULTS$/i, /^CONSTANTS$/i, /^ENV$/i
      ],
      statePatterns: [          // Patterns de alto riesgo
        /store$/i, /state$/i, /manager$/i, 
        /cache$/i, /registry$/i, /pool$/i, /queue$/i
      ]
    },
    
    // Circular dependencies: solo problemáticas
    circularDeps: {
      minFilesInCycle: 3,       // Ciclos de 2 archivos son comunes
      maxAcceptable: 10,        // Más de 10 es arquitectura compleja
    },
    
    // Coupling: distingue tipos
    coupling: {
      highThreshold: 15,        // Imports por archivo
      criticalThreshold: 25,    // Imports por archivo (crítico)
    },
    
    // Unused exports: considera barrel files
    unusedExports: {
      ignorePatterns: [         // Archivos que exportan intencionalmente
        /index\.js$/i, 
        /\.test\.js$/i,
        /\.spec\.js$/i,
        /types\.js$/i
      ],
      minExports: 5             // Archivos con >5 exports son probablemente barrels
    }
  },
  
  // Scoring weights - qué tan importante es cada métrica
  weights: {
    deepChains: 0.15,           // 15% del score total
    sharedObjects: 0.20,        // 20% (estado compartido es crítico)
    circularDeps: 0.15,         // 15%
    coupling: 0.15,             // 15%
    unusedExports: 0.10,        // 10%
    hotspots: 0.15,             // 15%
    unusedImports: 0.10,        // 10%
  },
  
  // Heurísticas por tipo de proyecto
  projectType: 'standard',      // 'standard' | 'microservices' | 'library'
  
  // Feature flags
  features: {
    enableHeuristics: true,     // Usar heurísticas de naming
    enableHistory: false,       // TODO: Analizar cambios git
    enableSemantic: true,       // Analizar significado semántico
  }
};

/**
 * Pattern Detection Engine - Core del sistema
 * 
 * Responsabilidad única: Orquestar la detección de patrones
 * No implementa lógica específica - delega a detectores registrados
 */
export class PatternDetectionEngine {
  constructor(config = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.registry = new PatternDetectorRegistry();
    this.aggregator = new QualityScoreAggregator(this.config);
    this.results = new Map();
    
    // Registrar detectores por defecto
    this.registerDefaultDetectors();
  }
  
  /**
   * Merge configuración personalizada con defaults
   */
  mergeConfig(defaults, custom) {
    return {
      ...defaults,
      ...custom,
      thresholds: { ...defaults.thresholds, ...custom.thresholds },
      weights: { ...defaults.weights, ...custom.weights },
      features: { ...defaults.features, ...custom.features }
    };
  }
  
  /**
   * Registra todos los detectores por defecto
   * 
   * NOTA: Solo registramos detectores que realmente existen.
   * Los detectores faltantes pueden añadirse después sin modificar el engine.
   */
  registerDefaultDetectors() {
    // Import dinámico para evitar circular deps
    const detectors = [
      { 
        id: 'deepChains',
        loader: () => import('./detectors/deep-chains-detector.js'),
        priority: 100
      },
      { 
        id: 'sharedObjects', 
        loader: () => import('./detectors/shared-objects-detector.js'),
        priority: 90
      },
      {
        id: 'coupling',
        loader: () => import('./detectors/coupling-detector.js'),
        priority: 80
      },
      {
        id: 'hotspots',
        loader: () => import('./detectors/hotspots-detector.js'),
        priority: 70
      }
      // TODO: Añadir más detectores:
      // { id: 'unusedExports', loader: () => import('./detectors/unused-exports-detector.js'), priority: 60 },
      // { id: 'circularDeps', loader: () => import('./detectors/circular-deps-detector.js'), priority: 50 },
    ];
    
    detectors.forEach(detector => {
      this.registry.register(detector);
    });
    
    logger.info(`Registered ${detectors.length} pattern detectors`);
  }
  
  /**
   * Ejecuta análisis completo
   * 
   * @param {object} systemMap - SystemMap del proyecto
   * @returns {Promise<PatternAnalysisResult>}
   */
  async analyze(systemMap) {
    logger.info('🔍 Starting pattern detection analysis...');
    const startTime = Date.now();
    
    // Detectar tipo de proyecto automáticamente
    this.config.projectType = this.detectProjectType(systemMap);
    
    // Ejecutar todos los detectores en paralelo
    const detectors = this.registry.getAll();
    const detectionPromises = detectors.map(detector => 
      this.runDetector(detector, systemMap)
    );
    
    const results = await Promise.allSettled(detectionPromises);
    
    // Procesar resultados
    const patternResults = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        patternResults.push(result.value);
        this.results.set(detectors[index].id, result.value);
      } else {
        logger.warn(`Detector ${detectors[index].id} failed:`, result.reason);
      }
    });
    
    // Calcular score agregado
    const qualityScore = this.aggregator.calculate(patternResults);
    
    const duration = Date.now() - startTime;
    logger.info(`✅ Pattern detection complete in ${duration}ms`);
    
    return {
      patterns: patternResults,
      qualityScore,
      metadata: {
        duration,
        detectorsRun: detectors.length,
        projectType: this.config.projectType,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Ejecuta un detector individual con manejo de errores
   */
  async runDetector(detector, systemMap) {
    try {
      const module = await detector.loader();
      const DetectorClass = module.default || module[Object.keys(module)[0]];
      
      const instance = new DetectorClass({
        config: this.config.thresholds[detector.id] || {},
        globalConfig: this.config
      });
      
      return await instance.detect(systemMap);
    } catch (error) {
      logger.error(`Detector ${detector.id} error:`, error.message);
      return {
        detector: detector.id,
        findings: [],
        score: 100, // Asumir perfecto si falla
        error: error.message
      };
    }
  }
  
  /**
   * Detecta tipo de proyecto basado en estructura
   */
  detectProjectType(systemMap) {
    const files = Object.keys(systemMap.files || {});
    const fileCount = files.length;
    
    // Heurísticas
    const hasMicroservicePatterns = files.some(f => 
      /service|gateway|broker/i.test(f)
    );
    const hasLibraryPatterns = files.some(f => 
      /index\.js$/.test(f) && files.filter(f2 => f2.includes('test')).length < fileCount * 0.1
    );
    const hasManyTests = files.filter(f => 
      /test|spec/i.test(f)
    ).length > fileCount * 0.3;
    
    if (hasMicroservicePatterns) return 'microservices';
    if (hasLibraryPatterns && !hasManyTests) return 'library';
    return 'standard';
  }
  
  /**
   * Añade un detector personalizado
   */
  addDetector(detectorConfig) {
    this.registry.register(detectorConfig);
  }
  
  /**
   * Obtiene resultados de un detector específico
   */
  getResults(detectorId) {
    return this.results.get(detectorId);
  }
}

/**
 * Result type para detección
 * @typedef {Object} DetectionResult
 * @property {string} detector - ID del detector
 * @property {string} name - Nombre legible
 * @property {string} description - Descripción
 * @property {Array<PatternFinding>} findings - Hallazgos encontrados
 * @property {number} score - Score 0-100
 * @property {number} weight - Peso en el score global
 * @property {string} recommendation - Recomendación general
 */

/**
 * Finding type para patrones individuales
 * @typedef {Object} PatternFinding
 * @property {string} id - Identificador único
 * @property {string} type - Tipo de patrón
 * @property {string} severity - 'critical' | 'high' | 'medium' | 'low'
 * @property {string} file - Archivo afectado
 * @property {number} line - Línea (opcional)
 * @property {string} message - Descripción del problema
 * @property {string} recommendation - Cómo solucionarlo
 * @property {object} metadata - Datos adicionales
 */

export default PatternDetectionEngine;
