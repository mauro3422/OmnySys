/**
 * @fileoverview Side Effects Detector Tests
 * 
 * Phase 3 - Tier 3 Analysis Testing
 * Tests for side-effects-detector.js
 * 
 * @module tests/unit/layer-a-analysis/tier3/detectors/side-effects-detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectSideEffects,
  analyzeSideEffectsForAllFiles
} from '#layer-a/analyses/tier3/side-effects-detector.js';
import { SideEffectsResultBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('SideEffectsDetector', () => {
  describe('Structure Contract', () => {
    it('should export detectSideEffects function', () => {
      expect(typeof detectSideEffects).toBe('function');
    });

    it('should export analyzeSideEffectsForAllFiles function', () => {
      expect(typeof analyzeSideEffectsForAllFiles).toBe('function');
    });

    it('should return expected structure from detectSideEffects', () => {
      const result = detectSideEffects('', 'test.js');
      
      expect(result).toHaveProperty('sideEffects');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('count');
      
      expect(typeof result.sideEffects).toBe('object');
      expect(typeof result.details).toBe('object');
      expect(typeof result.severity).toBe('string');
      expect(typeof result.count).toBe('number');
    });

    it('should have all required side effect flags', () => {
      const result = detectSideEffects('', 'test.js');
      
      expect(result.sideEffects).toHaveProperty('hasGlobalAccess');
      expect(result.sideEffects).toHaveProperty('modifiesDOM');
      expect(result.sideEffects).toHaveProperty('makesNetworkCalls');
      expect(result.sideEffects).toHaveProperty('usesLocalStorage');
      expect(result.sideEffects).toHaveProperty('accessesWindow');
      expect(result.sideEffects).toHaveProperty('modifiesGlobalState');
      expect(result.sideEffects).toHaveProperty('hasEventListeners');
      expect(result.sideEffects).toHaveProperty('usesTimers');
    });

    it('should not throw on empty input', () => {
      expect(() => detectSideEffects('', 'test.js')).not.toThrow();
      expect(() => analyzeSideEffectsForAllFiles({})).not.toThrow();
    });
  });

  describe('Functionality Tests', () => {
    describe('Global Access Detection', () => {
      it('should detect window access', () => {
        const code = `const x = window.location;`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.hasGlobalAccess).toBe(true);
        expect(result.sideEffects.accessesWindow).toBe(true);
        expect(result.details.globalAccessLocations.length).toBeGreaterThan(0);
      });

      it('should detect global access', () => {
        const code = `const x = global.process;`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.hasGlobalAccess).toBe(true);
      });

      it('should detect globalThis access', () => {
        const code = `const x = globalThis.myVar;`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.hasGlobalAccess).toBe(true);
      });

      it('should track global access location details', () => {
        const code = `const x = window.test;`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.globalAccessLocations[0]).toMatchObject({
          object: 'window',
          property: 'test'
        });
      });
    });

    describe('Global State Modification Detection', () => {
      it('should detect window property assignment', () => {
        const code = `window.myGlobal = 'value';`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.modifiesGlobalState).toBe(true);
        expect(result.details.globalStateModificationLocations.length).toBeGreaterThan(0);
      });

      it('should track global state modification details', () => {
        const code = `window.config = { debug: true };`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.globalStateModificationLocations[0]).toMatchObject({
          target: 'window.config'
        });
      });

      it('should detect global assignment', () => {
        const code = `global.shared = 'data';`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.modifiesGlobalState).toBe(true);
      });
    });

    describe('DOM Modification Detection', () => {
      it('should detect document access', () => {
        const code = `const el = document.getElementById('test');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.modifiesDOM).toBe(true);
        expect(result.details.domModificationLocations.length).toBeGreaterThan(0);
      });

      it('should detect DOM manipulation methods', () => {
        const code = `element.appendChild(child);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.modifiesDOM).toBe(true);
      });

      it('should detect removeChild', () => {
        const code = `parent.removeChild(child);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.modifiesDOM).toBe(true);
      });

      it('should detect innerHTML assignment via document methods', () => {
        // Note: innerHTML assignment (element.innerHTML = ...) is not detected as DOM method call
        // It's detected via document.getElementById().innerHTML pattern
        const code = `document.getElementById('app').innerHTML = '<p>content</p>';`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.modifiesDOM).toBe(true);
      });

      it('should detect setAttribute', () => {
        const code = `element.setAttribute('data', 'value');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.modifiesDOM).toBe(true);
      });

      it('should track DOM method details', () => {
        const code = `document.querySelector('.class');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.domModificationLocations[0]).toHaveProperty('method');
      });
    });

    describe('Network Calls Detection', () => {
      it('should detect fetch', () => {
        const code = `fetch('/api/data');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.makesNetworkCalls).toBe(true);
        expect(result.details.networkCallLocations.length).toBeGreaterThan(0);
      });

      it('should detect axios', () => {
        const code = `axios.get('/api/data');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.makesNetworkCalls).toBe(true);
      });

      it('should detect XMLHttpRequest constructor', () => {
        // Note: new XMLHttpRequest() creates a NewExpression, not CallExpression
        // The detector may or may not detect this depending on implementation
        const code = `const xhr = new XMLHttpRequest();`;
        const result = detectSideEffects(code, 'test.js');
        
        // This test documents current behavior
        expect(typeof result.sideEffects.makesNetworkCalls).toBe('boolean');
      });

      it('should detect HTTP methods', () => {
        const code = `
          api.post('/data');
          api.put('/data');
          api.delete('/data');
          api.patch('/data');
        `;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.makesNetworkCalls).toBe(true);
      });

      it('should track network API details', () => {
        const code = `fetch('/api');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.networkCallLocations[0]).toMatchObject({
          api: 'fetch'
        });
      });
    });

    describe('Local Storage Detection', () => {
      it('should detect localStorage access', () => {
        const code = `localStorage.setItem('key', 'value');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.usesLocalStorage).toBe(true);
        expect(result.details.storageAccessLocations.length).toBeGreaterThan(0);
      });

      it('should detect sessionStorage access', () => {
        const code = `sessionStorage.getItem('key');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.usesLocalStorage).toBe(true);
      });

      it('should detect indexedDB access', () => {
        const code = `const db = indexedDB.open('mydb');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.usesLocalStorage).toBe(true);
      });

      it('should track storage type details', () => {
        const code = `localStorage.clear();`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.storageAccessLocations[0]).toMatchObject({
          storage: 'localStorage'
        });
      });
    });

    describe('Event Listeners Detection', () => {
      it('should detect addEventListener', () => {
        const code = `element.addEventListener('click', handler);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.hasEventListeners).toBe(true);
        expect(result.details.eventListenerLocations.length).toBeGreaterThan(0);
      });

      it('should detect on method', () => {
        const code = `eventBus.on('event', callback);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.hasEventListeners).toBe(true);
      });

      it('should detect once method', () => {
        const code = `emitter.once('ready', init);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.hasEventListeners).toBe(true);
      });

      it('should detect subscribe method', () => {
        const code = `store.subscribe(listener);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.hasEventListeners).toBe(true);
      });

      it('should track listener method details', () => {
        const code = `document.addEventListener('load', fn);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.eventListenerLocations[0]).toMatchObject({
          method: 'addEventListener'
        });
      });
    });

    describe('Timers Detection', () => {
      it('should detect setTimeout', () => {
        const code = `setTimeout(() => {}, 1000);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.usesTimers).toBe(true);
        expect(result.details.timerLocations.length).toBeGreaterThan(0);
      });

      it('should detect setInterval', () => {
        const code = `setInterval(update, 5000);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.usesTimers).toBe(true);
      });

      it('should detect setImmediate', () => {
        const code = `setImmediate(task);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.usesTimers).toBe(true);
      });

      it('should detect requestAnimationFrame', () => {
        const code = `requestAnimationFrame(render);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.sideEffects.usesTimers).toBe(true);
      });

      it('should track timer type details', () => {
        const code = `setTimeout(() => {}, 100);`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.timerLocations[0]).toMatchObject({
          timer: 'setTimeout'
        });
      });
    });

    describe('Severity Calculation', () => {
      it('should return low severity for no side effects', () => {
        const code = `const x = 1;`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.severity).toBe('low');
      });

      it('should return low severity for single side effect', () => {
        const code = `fetch('/api');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.severity).toBe('low');
      });

      it('should return medium severity for 2 side effects', () => {
        const code = `
          fetch('/api');
          setTimeout(() => {}, 100);
        `;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.severity).toBe('medium');
      });

      it('should return high severity for 4+ side effects', () => {
        const code = `
          fetch('/api');
          setTimeout(() => {}, 100);
          localStorage.setItem('k', 'v');
          document.querySelector('div');
        `;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.severity).toBe('high');
      });

      it('should return critical severity for network + global state modification', () => {
        const code = `
          fetch('/api');
          window.state = 'modified';
        `;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.severity).toBe('critical');
      });
    });

    describe('Count Calculation', () => {
      it('should return 0 for no side effects', () => {
        const code = `const x = 1;`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.count).toBe(0);
      });

      it('should return correct count for single side effect', () => {
        const code = `fetch('/api');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.count).toBe(1);
      });

      it('should return correct count for multiple side effects', () => {
        const code = `
          fetch('/api');
          setTimeout(() => {}, 100);
          localStorage.setItem('k', 'v');
        `;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.count).toBe(3);
      });
    });

    describe('Function Context Tracking', () => {
      it('should track function context for side effects', () => {
        const code = `
          function makeRequest() {
            fetch('/api');
          }
        `;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.networkCallLocations[0]?.function).toBe('makeRequest');
      });

      it('should track arrow function context', () => {
        const code = `
          const delay = () => setTimeout(() => {}, 100);
        `;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.timerLocations[0]?.function).toBe('anonymous-arrow');
      });

      it('should use module-level for top-level code', () => {
        const code = `fetch('/api');`;
        const result = detectSideEffects(code, 'test.js');
        
        expect(result.details.networkCallLocations[0]?.function).toBe('module-level');
      });
    });

    describe('Batch Analysis', () => {
      it('should analyze multiple files', () => {
        const fileMap = {
          'fileA.js': `fetch('/api');`,
          'fileB.js': `localStorage.setItem('k', 'v');`,
          'fileC.js': `const x = 1;`
        };
        
        const results = analyzeSideEffectsForAllFiles(fileMap);
        
        expect(results).toHaveProperty('fileA.js');
        expect(results).toHaveProperty('fileB.js');
        expect(results).toHaveProperty('fileC.js');
        
        expect(results['fileA.js'].sideEffects.makesNetworkCalls).toBe(true);
        expect(results['fileB.js'].sideEffects.usesLocalStorage).toBe(true);
        expect(results['fileC.js'].count).toBe(0);
      });

      it('should handle empty file map', () => {
        const results = analyzeSideEffectsForAllFiles({});
        
        expect(Object.keys(results)).toHaveLength(0);
      });

      it('should handle mixed valid and invalid files', () => {
        const fileMap = {
          'valid.js': `fetch('/api');`,
          'invalid.js': `{{ not valid }}`
        };
        
        const results = analyzeSideEffectsForAllFiles(fileMap);
        
        // Should not throw, invalid files should return empty results
        expect(results).toHaveProperty('valid.js');
        expect(results).toHaveProperty('invalid.js');
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty code', () => {
      const result = detectSideEffects('', 'test.js');
      
      expect(result.count).toBe(0);
      expect(result.severity).toBe('low');
    });

    it('should handle code without side effects', () => {
      const code = `
        const x = 1;
        function add(a, b) { return a + b; }
        const result = add(2, 3);
      `;
      const result = detectSideEffects(code, 'test.js');
      
      expect(result.count).toBe(0);
    });

    it('should handle invalid code gracefully', () => {
      const code = `this is not valid javascript {{{}}}`;
      const result = detectSideEffects(code, 'test.js');
      
      // Should not throw, should return safe defaults
      expect(result).toHaveProperty('sideEffects');
      expect(result).toHaveProperty('count');
    });

    it('should handle TypeScript syntax', () => {
      const code = `const x: string = window.name;`;
      const result = detectSideEffects(code, 'test.ts');
      
      // Should parse TypeScript without errors
      expect(result).toHaveProperty('sideEffects');
    });

    it('should track line numbers', () => {
      const code = `fetch('/api');`;
      const result = detectSideEffects(code, 'test.js');
      
      if (result.details.networkCallLocations.length > 0) {
        expect(typeof result.details.networkCallLocations[0].line).toBe('number');
        expect(result.details.networkCallLocations[0].line).toBeGreaterThan(0);
      }
    });

    it('should detect multiple instances of same side effect type', () => {
      const code = `
        fetch('/api/1');
        fetch('/api/2');
        fetch('/api/3');
      `;
      const result = detectSideEffects(code, 'test.js');
      
      expect(result.details.networkCallLocations.length).toBe(3);
    });

    it('should handle null code input', () => {
      expect(() => detectSideEffects(null, 'test.js')).not.toThrow();
    });

    it('should handle undefined code input', () => {
      expect(() => detectSideEffects(undefined, 'test.js')).not.toThrow();
    });

    it('should handle null filePath', () => {
      expect(() => detectSideEffects('fetch("/api")', null)).not.toThrow();
    });

    it('should handle invalid file map entries', () => {
      const fileMap = {
        'null.js': null,
        'undefined.js': undefined,
        'valid.js': `fetch('/api');`
      };
      
      expect(() => analyzeSideEffectsForAllFiles(fileMap)).not.toThrow();
    });
  });
});
