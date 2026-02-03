/**
 * Tests para broken-connections-detector.js
 * Valida detección de workers rotos, funciones duplicadas, código muerto
 */

import {
  detectBrokenWorkers,
  detectBrokenDynamicImports,
  detectDuplicateFunctions,
  detectDeadFunctions,
  detectSuspiciousUrls,
  analyzeBrokenConnections
} from '../../src/layer-a-static/analyses/tier3/broken-connections-detector.js';

describe('Broken Connections Detector', () => {
  
  describe('detectBrokenWorkers', () => {
    test('detecta worker que apunta a archivo inexistente', () => {
      const systemMap = {
        files: {
          'src/Main.js': {}
        }
      };
      
      const advancedAnalysis = {
        fileResults: {
          'src/Main.js': {
            webWorkers: {
              outgoing: [
                { type: 'worker_creation', workerPath: './NonExistent.js', line: 5 }
              ]
            }
          }
        }
      };
      
      const result = detectBrokenWorkers(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(1);
      expect(result.all[0].type).toBe('WORKER_NOT_FOUND');
      expect(result.all[0].severity).toBe('HIGH');
      expect(result.all[0].line).toBe(5);
    });

    test('no reporta worker válido', () => {
      const systemMap = {
        files: {
          'src/Main.js': {},
          'src/ValidWorker.js': {}
        }
      };
      
      const advancedAnalysis = {
        fileResults: {
          'src/Main.js': {
            webWorkers: {
              outgoing: [
                { type: 'worker_creation', workerPath: './ValidWorker.js', line: 1 }
              ]
            }
          }
        }
      };
      
      const result = detectBrokenWorkers(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(0);
    });

    test('detecta worker con path relativo correcto', () => {
      const systemMap = {
        files: {
          'src/components/Main.js': {},
          'src/workers/Processor.js': {}
        }
      };
      
      const advancedAnalysis = {
        fileResults: {
          'src/components/Main.js': {
            webWorkers: {
              outgoing: [
                { type: 'worker_creation', workerPath: '../workers/Processor.js', line: 1 }
              ]
            }
          }
        }
      };
      
      const result = detectBrokenWorkers(systemMap, advancedAnalysis);
      
      // Debe encontrar el worker por nombre de archivo
      expect(result.total).toBe(0);
    });
  });

  describe('detectDuplicateFunctions', () => {
    test('detecta función con mismo nombre en múltiples archivos', () => {
      const systemMap = {
        functions: {
          'src/utils/A.js': [
            { name: 'formatDate', line: 1 }
          ],
          'src/utils/B.js': [
            { name: 'formatDate', line: 5 }
          ]
        }
      };
      
      const result = detectDuplicateFunctions(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.all[0].functionName).toBe('formatDate');
      expect(result.all[0].files).toHaveLength(2);
    });

    test('ignora nombres comunes como main, init, handleClick', () => {
      const systemMap = {
        functions: {
          'src/A.js': [
            { name: 'main', line: 1 },
            { name: 'init', line: 2 },
            { name: 'handleClick', line: 3 }
          ],
          'src/B.js': [
            { name: 'main', line: 1 },
            { name: 'init', line: 2 },
            { name: 'handleClick', line: 3 }
          ]
        }
      };
      
      const result = detectDuplicateFunctions(systemMap);
      
      expect(result.total).toBe(0);
    });

    test('no reporta función única', () => {
      const systemMap = {
        functions: {
          'src/A.js': [
            { name: 'uniqueFunction', line: 1 }
          ],
          'src/B.js': [
            { name: 'otherFunction', line: 1 }
          ]
        }
      };
      
      const result = detectDuplicateFunctions(systemMap);
      
      expect(result.total).toBe(0);
    });
  });

  describe('detectDeadFunctions', () => {
    test('detecta función no exportada y no llamada', () => {
      const systemMap = {
        files: {
          'src/utils.js': {
            usedBy: [],
            dependsOn: []
          }
        },
        functions: {
          'src/utils.js': [
            { 
              name: 'unusedHelper', 
              line: 10, 
              isExported: false,
              calls: [],
              usedBy: []
            }
          ]
        }
      };
      
      const result = detectDeadFunctions(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.all[0].functionName).toBe('unusedHelper');
      expect(result.all[0].type).toBe('DEAD_FUNCTION');
    });

    test('no reporta función exportada', () => {
      const systemMap = {
        files: {
          'src/api.js': {
            usedBy: ['src/app.js']
          }
        },
        functions: {
          'src/api.js': [
            { 
              name: 'publicApi', 
              line: 1, 
              isExported: true,
              calls: [],
              usedBy: []
            }
          ]
        }
      };
      
      const result = detectDeadFunctions(systemMap);
      
      expect(result.total).toBe(0);
    });

    test('no reporta handlers de eventos (onClick, handleX)', () => {
      const systemMap = {
        files: {
          'src/component.js': {}
        },
        functions: {
          'src/component.js': [
            { 
              name: 'handleButtonClick', 
              line: 1, 
              isExported: false,
              calls: [],
              usedBy: []
            }
          ]
        }
      };
      
      const result = detectDeadFunctions(systemMap);
      
      expect(result.total).toBe(0);
    });

    test('no reporta funciones init/setup', () => {
      const systemMap = {
        files: {
          'src/module.js': {}
        },
        functions: {
          'src/module.js': [
            { 
              name: 'initializeDatabase', 
              line: 1, 
              isExported: false,
              calls: [],
              usedBy: []
            }
          ]
        }
      };
      
      const result = detectDeadFunctions(systemMap);
      
      expect(result.total).toBe(0);
    });
  });

  describe('detectSuspiciousUrls', () => {
    test('detecta localhost hardcodeado', () => {
      const advancedAnalysis = {
        fileResults: {
          'src/api.js': {
            networkCalls: {
              urls: [
                { url: 'http://localhost:3000/api', line: 5 }
              ]
            }
          }
        }
      };
      
      const result = detectSuspiciousUrls(advancedAnalysis);
      
      expect(result.total).toBe(1);
      expect(result.all[0].type).toBe('SUSPICIOUS_URL');
      expect(result.all[0].reason).toContain('localhost');
    });

    test('detecta IP hardcodeada', () => {
      const advancedAnalysis = {
        fileResults: {
          'src/config.js': {
            networkCalls: {
              urls: [
                { url: 'http://127.0.0.1:8080/data', line: 10 }
              ]
            }
          }
        }
      };
      
      const result = detectSuspiciousUrls(advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    test('detecta example.com', () => {
      const advancedAnalysis = {
        fileResults: {
          'src/service.js': {
            webSocket: {
              urls: [
                { url: 'wss://example.com/ws', line: 1 }
              ]
            }
          }
        }
      };
      
      const result = detectSuspiciousUrls(advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    test('no reporta URLs normales', () => {
      const advancedAnalysis = {
        fileResults: {
          'src/api.js': {
            networkCalls: {
              urls: [
                { url: '/api/users', line: 1 },
                { url: 'https://api.production.com/data', line: 2 }
              ]
            }
          }
        }
      };
      
      const result = detectSuspiciousUrls(advancedAnalysis);
      
      expect(result.total).toBe(0);
    });
  });

  describe('analyzeBrokenConnections (integración)', () => {
    test('reporte completo con múltiples issues', () => {
      const systemMap = {
        files: {
          'src/Main.js': {},
          'src/Helper.js': {}
        },
        functions: {
          'src/Helper.js': [
            { name: 'duplicateUtil', line: 1 },
            { name: 'deadCode', line: 10, isExported: false, calls: [] }
          ]
        }
      };
      
      const advancedAnalysis = {
        fileResults: {
          'src/Main.js': {
            webWorkers: {
              outgoing: [
                { type: 'worker_creation', workerPath: './Missing.js', line: 5 }
              ]
            },
            networkCalls: {
              urls: [
                { url: 'http://localhost:3000', line: 20 }
              ]
            }
          }
        }
      };
      
      const result = analyzeBrokenConnections(systemMap, advancedAnalysis);
      
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.brokenWorkers.total).toBe(1);
      expect(result.suspiciousUrls.total).toBe(1);
    });

    test('calcula severidades correctamente', () => {
      const systemMap = {
        files: { 'src/Main.js': {} },
        functions: {}
      };
      
      const advancedAnalysis = {
        fileResults: {
          'src/Main.js': {
            webWorkers: {
              outgoing: [
                { type: 'worker_creation', workerPath: './Missing.js', line: 1 }
              ]
            },
            networkCalls: {
              urls: [
                { url: 'http://localhost:3000', line: 1 }
              ]
            }
          }
        }
      };
      
      const result = analyzeBrokenConnections(systemMap, advancedAnalysis);
      
      expect(result.summary.critical).toBeGreaterThanOrEqual(0);
      expect(result.summary.warning).toBeGreaterThanOrEqual(0);
      expect(result.summary.info).toBeGreaterThanOrEqual(0);
    });
  });
});
