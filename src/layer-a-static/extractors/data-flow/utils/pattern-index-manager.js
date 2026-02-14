/**
 * @fileoverview Pattern Index Manager - Gestión del índice de patrones para ML
 * 
 * ENFOQUE HÍBRIDO:
 * - Datos en átomo: acceso rápido en runtime
 * - Índice de patrones: agrupación para entrenamiento ML
 * 
 * Estructura:
 * .omnysysdata/
 *   ├── atoms/                    ← Cache individual de átomos
 *   └── patterns/                 ← Índice de patrones
 *       ├── index.json            ← Mapeo hash -> metadatos
 *       └── {hash}/               ← Un directorio por patrón
 *           ├── metadata.json     ← Info del patrón
 *           ├── atoms.json        ← Lista de átomos con este patrón
 *           └── training.json     ← Dataset listo para entrenar
 * 
 * @module data-flow-v2/utils/pattern-index-manager
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:pattern:index:manager');



export class PatternIndexManager {
  constructor(basePath = '.omnysysdata/patterns') {
    this.basePath = basePath;
    this.indexPath = path.join(basePath, 'index.json');
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Actualiza el índice con un nuevo átomo
   * 
   * @param {Object} standardized - Datos estandarizados del átomo
   * @param {Object} atomData - { atomId, graph }
   */
  async updateIndex(standardized, atomData) {
    try {
      const { patternHash, pattern, tokens, flowType, mlFeatures } = standardized;
      const { atomId, graph } = atomData;

      // 1. Actualizar índice maestro
      await this.updateMasterIndex(patternHash, {
        pattern,
        flowType,
        tokenSummary: this.summarizeTokens(tokens),
        featureSummary: mlFeatures
      });

      // 2. Actualizar directorio del patrón
      await this.updatePatternDirectory(patternHash, {
        pattern,
        tokens,
        flowType,
        mlFeatures,
        atomId,
        graph
      });

      // 3. Actualizar dataset de entrenamiento
      await this.updateTrainingDataset(patternHash, {
        atomId,
        pattern,
        tokens,
        mlFeatures,
        graph: this.summarizeGraph(graph)
      });

    } catch (error) {
      logger.warn('[PatternIndexManager] Error:', error.message);
      // No fallar la extracción
    }
  }

  /**
   * Actualiza el índice maestro
   */
  async updateMasterIndex(patternHash, metadata) {
    let index = await this.loadMasterIndex();

    if (!index.patterns[patternHash]) {
      index.patterns[patternHash] = {
        hash: patternHash,
        pattern: metadata.pattern,
        flowType: metadata.flowType,
        firstSeen: new Date().toISOString(),
        atomCount: 0,
        filePath: path.join(this.basePath, patternHash)
      };
    }

    const entry = index.patterns[patternHash];
    entry.atomCount++;
    entry.lastUpdated = new Date().toISOString();
    entry.tokenSummary = metadata.tokenSummary;
    entry.featureSummary = metadata.featureSummary;

    await this.saveJson(this.indexPath, index);
  }

  /**
   * Actualiza el directorio de un patrón específico
   */
  async updatePatternDirectory(patternHash, data) {
    const patternDir = path.join(this.basePath, patternHash);
    
    if (!fs.existsSync(patternDir)) {
      fs.mkdirSync(patternDir, { recursive: true });
    }

    // Metadata del patrón
    const metadataPath = path.join(patternDir, 'metadata.json');
    const existingMetadata = await this.loadJson(metadataPath, {});
    
    const metadata = {
      ...existingMetadata,
      hash: patternHash,
      pattern: data.pattern,
      flowType: data.flowType,
      tokens: data.tokens,
      updatedAt: new Date().toISOString(),
      statistics: this.calculateStatistics(existingMetadata.statistics, data.mlFeatures)
    };

    await this.saveJson(metadataPath, metadata);

    // Lista de átomos
    const atomsPath = path.join(patternDir, 'atoms.json');
    const atoms = await this.loadJson(atomsPath, []);
    
    if (!atoms.find(a => a.id === data.atomId)) {
      atoms.push({
        id: data.atomId,
        addedAt: new Date().toISOString(),
        mlFeatures: data.mlFeatures
      });
    }

    await this.saveJson(atomsPath, atoms);
  }

  /**
   * Actualiza dataset de entrenamiento
   */
  async updateTrainingDataset(patternHash, data) {
    const trainingPath = path.join(this.basePath, patternHash, 'training.json');
    const dataset = await this.loadJson(trainingPath, {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      pattern: data.pattern,
      samples: []
    });

    // Agregar sample
    dataset.samples.push({
      atomId: data.atomId,
      input: {
        tokens: data.tokens,
        mlFeatures: data.mlFeatures
      },
      output: {
        // Lo que queremos predecir (ej: si tiene bugs, complejidad, etc)
        flowType: data.tokens.flowType,
        hasSideEffects: data.mlFeatures.sideEffectCount > 0,
        complexity: data.mlFeatures.transformCount
      },
      graph: data.graph
    });

    dataset.updatedAt = new Date().toISOString();
    dataset.totalSamples = dataset.samples.length;

    await this.saveJson(trainingPath, dataset);
  }

  /**
   * Busca átomos similares por hash
   */
  async findSimilar(patternHash, limit = 10) {
    const atomsPath = path.join(this.basePath, patternHash, 'atoms.json');
    
    try {
      const atoms = await this.loadJson(atomsPath, []);
      return atoms.slice(0, limit).map(a => a.id);
    } catch {
      return [];
    }
  }

  /**
   * Obtiene todos los patrones disponibles
   */
  async getAllPatterns() {
    const index = await this.loadMasterIndex();
    return Object.values(index.patterns);
  }

  /**
   * Exporta dataset de entrenamiento para un dominio específico
   */
  async exportTrainingDataset(domain, outputPath) {
    const allPatterns = await this.getAllPatterns();
    const relevantPatterns = allPatterns.filter(p => 
      p.tokenSummary?.domains?.includes(domain)
    );

    const dataset = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      domain,
      totalPatterns: relevantPatterns.length,
      samples: []
    };

    for (const pattern of relevantPatterns) {
      const trainingPath = path.join(this.basePath, pattern.hash, 'training.json');
      const trainingData = await this.loadJson(trainingPath, { samples: [] });
      
      dataset.samples.push(...trainingData.samples);
    }

    dataset.totalSamples = dataset.samples.length;

    await this.saveJson(outputPath, dataset);
    return dataset;
  }

  // Helpers

  async loadMasterIndex() {
    return this.loadJson(this.indexPath, {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      patterns: {}
    });
  }

  async loadJson(filePath, defaultValue = {}) {
    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      logger.warn(`[PatternIndexManager] Error loading ${filePath}:`, error.message);
    }
    return defaultValue;
  }

  async saveJson(filePath, data) {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  summarizeTokens(tokens) {
    return {
      functionType: tokens.function,
      paramCount: tokens.inputs.length,
      transformCount: tokens.transforms.length,
      outputCount: tokens.outputs.length,
      domains: tokens.domains,
      flowType: tokens.flowType
    };
  }

  summarizeGraph(graph) {
    return {
      totalNodes: graph.meta?.totalNodes,
      totalEdges: graph.meta?.totalEdges,
      complexity: graph.meta?.complexity,
      hasSideEffects: graph.meta?.hasSideEffects,
      hasAsync: graph.meta?.hasAsync
    };
  }

  calculateStatistics(existing = {}, newFeatures) {
    const stats = {
      avgTransformCount: 0,
      avgComplexity: 0,
      mostCommonDomain: '',
      sampleCount: (existing.sampleCount || 0) + 1
    };

    // Calcular promedios
    if (existing.avgTransformCount) {
      stats.avgTransformCount = 
        (existing.avgTransformCount * existing.sampleCount + newFeatures.transformCount) /
        stats.sampleCount;
    } else {
      stats.avgTransformCount = newFeatures.transformCount;
    }

    if (existing.avgComplexity) {
      stats.avgComplexity = 
        (existing.avgComplexity * existing.sampleCount + newFeatures.transformCount) /
        stats.sampleCount;
    } else {
      stats.avgComplexity = newFeatures.transformCount;
    }

    return stats;
  }
}

export default PatternIndexManager;
