/**
 * @fileoverview Enhancer Builder - For enhancer configurations
 */

export class EnhancerBuilder {
  constructor() {
    this.atoms = [];
    this.files = {};
    this.systemMap = null;
    this.connections = {};
    this.riskScores = {};
    this.enhancedFiles = {};
    this.sideEffects = {};
    this.metadata = {};
  }

  withSystemMap(systemMap) {
    this.systemMap = systemMap;
    return this;
  }

  addAtom(atom = {}) {
    this.atoms.push({
      id: `atom-${this.atoms.length}`,
      name: `func${this.atoms.length}`,
      type: 'function',
      filePath: 'src/test.js',
      complexity: 1,
      linesOfCode: 10,
      isExported: false,
      calls: [],
      calledBy: [],
      semanticConnections: [],
      dna: null,
      metrics: {},
      temporal: { patterns: {} },
      ...atom
    });
    return this;
  }

  addFile(filePath, fileData = {}) {
    this.files[filePath] = {
      exports: [],
      imports: [],
      usedBy: [],
      dependsOn: [],
      functions: [],
      ...fileData
    };
    return this;
  }

  addEnhancedFile(filePath, data = {}) {
    this.enhancedFiles[filePath] = {
      semanticAnalysis: {
        sharedState: { sharedVariables: [] },
        eventPatterns: { eventListeners: [], eventEmitters: [] },
        sideEffects: [],
        sideEffectDetails: []
      },
      sideEffects: { sideEffects: [], details: [] },
      ...data
    };
    return this;
  }

  addConnection(type, connection) {
    if (!this.connections[type]) {
      this.connections[type] = [];
    }
    this.connections[type].push({
      sourceFile: 'src/a.js',
      targetFile: 'src/b.js',
      confidence: 1,
      ...connection
    });
    return this;
  }

  addRiskScore(filePath, score) {
    this.riskScores[filePath] = {
      totalScore: score,
      level: score > 70 ? 'critical' : score > 40 ? 'high' : score > 20 ? 'medium' : 'low',
      factors: []
    };
    return this;
  }

  buildMetadataContext() {
    return {
      atoms: this.atoms,
      filePath: 'src/test.js'
    };
  }

  buildConnectionContext() {
    return {
      atoms: this.atoms,
      connections: this.connections
    };
  }

  buildEnhancedSystemMap() {
    return {
      metadata: {
        enhanced: true,
        enhancedAt: new Date().toISOString(),
        analysisVersion: '3.5.0'
      },
      files: this.enhancedFiles,
      connections: {
        sharedState: this.connections.sharedState || [],
        eventListeners: this.connections.eventListeners || [],
        total: Object.values(this.connections).flat().length
      },
      riskAssessment: {
        scores: this.riskScores,
        report: { summary: { totalFiles: Object.keys(this.riskScores).length } }
      }
    };
  }

  buildProjectEnhancerInput() {
    return {
      allAtoms: this.atoms,
      projectMetadata: {
        totalFiles: Object.keys(this.files).length,
        totalAtoms: this.atoms.length
      }
    };
  }
}
