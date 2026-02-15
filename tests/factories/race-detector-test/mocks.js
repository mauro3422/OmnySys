/**
 * @fileoverview Race Detector Test Factory - Mocks
 */

export class RaceDetectorMocks {
  static createMockTracker(state = new Map()) {
    return {
      track: () => state
    };
  }

  static createMockStrategy(detectedRaces = []) {
    return {
      detect: () => detectedRaces
    };
  }

  static createMockRiskScorer(scores = {}) {
    return {
      calculate: (race) => scores[race.id] || 'medium'
    };
  }

  static createMockProject(atoms = []) {
    return {
      modules: [{
        moduleName: 'test',
        modulePath: 'test.js',
        files: [{
          filePath: 'test.js',
          atoms
        }]
      }],
      system: {
        businessFlows: [],
        entryPoints: []
      }
    };
  }

  static createMockAtom(id, options = {}) {
    return {
      id,
      name: options.name || 'testFunction',
      isAsync: options.isAsync || false,
      isExported: options.isExported || false,
      code: options.code || '',
      dataFlow: options.dataFlow || { sideEffects: [] },
      line: options.line || 1,
      ...options
    };
  }
}


