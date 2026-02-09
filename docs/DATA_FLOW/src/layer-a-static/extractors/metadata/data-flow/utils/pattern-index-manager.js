/**
 * @fileoverview Pattern Index Manager - Gestiona el índice de patrones estandarizados
 * 
 * ENFOQUE HÍBRIDO:
 * - Los datos del átomo se guardan en el átomo (rápido acceso)
 * - Los patrones se indexan por hash para ML/pattern matching
 * 
 * Estructura:
 * .omnysysdata/
 *   ├── atoms/           ← Cache de átomos individuales
 *   └── patterns/        ← Índice de patrones agrupados
 *       ├── a3f7d2...json
 *       ├── b8e1c9...json
 *       └── index.json   ← Mapeo hash -> lista de átomos
 * 
 * @module data-flow/utils/pattern-index-manager
 */

import fs from 'fs';
import path from 'path';

export class PatternIndexManager {
  constructor() {
    this.basePath = '.omnysysdata/patterns';
    this.indexPath = path.join(this.basePath, 'index.json');
    this.ensureDirectory();
  }
  
  ensureDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }
  
  /**
   * Actualiza el índice de patrones con un nuevo átomo
   * 
   * @param {string} patternHash - Hash del patrón estandarizado
   * @param {Object} atomData - { atomId, standardized, dataFlow }
   */
  async updatePatternIndex(patternHash, atomData) {
    try {
      const { atomId, standardized, dataFlow } = atomData;
      
      // 1. Cargar índice maestro
      const index = await this.loadIndex();
      
      // 2. Actualizar índice maestro
      if (!index.patterns[patternHash]) {
        index.patterns[patternHash] = {
          hash: patternHash,
          firstSeen: new Date().toISOString(),
          atoms: []
        };
      }
      
      // Agregar átomo si no existe
      const patternEntry = index.patterns[patternHash];
      if (!patternEntry.atoms.includes(atomId)) {
        patternEntry.atoms.push(atomId);
        patternEntry.lastUpdated = new Date().toISOString();
        patternEntry.count = patternEntry.atoms.length;
      }
      
      // 3. Guardar índice maestro
      await this.saveIndex(index);
      
      // 4. Actualizar archivo del patrón específico
      await this.updatePatternFile(patternHash, standardized, dataFlow, atomId);
      
    } catch (error) {
      console.warn('[PatternIndexManager] Error updating index:', error.message);
      // No fallamos la extracción si el índice falla
    }
  }
  
  /**
   * Carga el índice maestro
   */
  async loadIndex() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const content = await fs.promises.readFile(this.indexPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('[PatternIndexManager] Error loading index:', error.message);
    }
    
    // Retornar estructura vacía
    return {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      patterns: {}
    };
  }
  
  /**
   * Guarda el índice maestro
   */
  async saveIndex(index) {
    await fs.promises.writeFile(
      this.indexPath,
      JSON.stringify(index, null, 2)
    );
  }
  
  /**
   * Actualiza el archivo de un patrón específico
   */
  async updatePatternFile(patternHash, standardized, dataFlow, atomId) {
    const patternFile = path.join(this.basePath, `${patternHash}.json`);
    
    let patternData = {
      hash: patternHash,
      standardized: {
        pattern: standardized.pattern,
        tokens: standardized.tokens,
        flowType: standardized.flowType
      },
      atoms: [],
      statistics: {
        totalAtoms: 0,
        avgComplexity: 0,
        operationTypes: {},
        domains: {}
      }
    };
    
    // Cargar existente si hay
    try {
      if (fs.existsSync(patternFile)) {
        const existing = await fs.promises.readFile(patternFile, 'utf8');
        patternData = JSON.parse(existing);
      }
    } catch (error) {
      // Usar estructura nueva
    }
    
    // Agregar átomo
    if (!patternData.atoms.find(a => a.id === atomId)) {
      patternData.atoms.push({
        id: atomId,
        addedAt: new Date().toISOString(),
        complexity: dataFlow?.transformations?.length || 0,
        operations: dataFlow?.transformations?.map(t => t.operation) || []
      });
    }
    
    // Recalcular estadísticas
    patternData.statistics = this.calculateStatistics(patternData.atoms, standardized);
    patternData.statistics.totalAtoms = patternData.atoms.length;
    
    // Guardar
    await fs.promises.writeFile(patternFile, JSON.stringify(patternData, null, 2));
  }
  
  /**
   * Calcula estadísticas agregadas para un patrón
   */
  calculateStatistics(atoms, standardized) {
    const totalComplexity = atoms.reduce((sum, a) => sum + (a.complexity || 0), 0);
    const avgComplexity = atoms.length > 0 ? totalComplexity / atoms.length : 0;
    
    // Contar tipos de operaciones
    const operationTypes = {};
    atoms.forEach(atom => {
      (atom.operations || []).forEach(op => {
        operationTypes[op] = (operationTypes[op] || 0) + 1;
      });
    });
    
    return {
      totalAtoms: atoms.length,
      avgComplexity: Math.round(avgComplexity * 100) / 100,
      operationTypes,
      domains: standardized.tokens?.domains || {},
      lastCalculated: new Date().toISOString()
    };
  }
  
  /**
   * Busca funciones similares por hash de patrón
   */
  async findSimilarFunctions(patternHash) {
    const patternFile = path.join(this.basePath, `${patternHash}.json`);
    
    try {
      if (fs.existsSync(patternFile)) {
        const content = await fs.promises.readFile(patternFile, 'utf8');
        const data = JSON.parse(content);
        return data.atoms.map(a => a.id);
      }
    } catch (error) {
      console.warn('[PatternIndexManager] Error finding similar:', error.message);
    }
    
    return [];
  }
  
  /**
   * Obtiene todos los patrones disponibles (para training)
   */
  async getAllPatterns() {
    const index = await this.loadIndex();
    return Object.values(index.patterns);
  }
}
