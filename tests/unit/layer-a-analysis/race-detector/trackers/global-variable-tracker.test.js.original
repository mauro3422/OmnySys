/**
 * @fileoverview global-variable-tracker.test.js
 * 
 * Tests for GlobalVariableTracker.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/trackers/global-variable-tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalVariableTracker } from '#layer-a/race-detector/trackers/global-variable-tracker.js';

describe('GlobalVariableTracker', () => {
  describe('Structure Contract', () => {
    it('should export GlobalVariableTracker class', () => {
      expect(GlobalVariableTracker).toBeDefined();
      expect(typeof GlobalVariableTracker).toBe('function');
    });

    it('should extend BaseTracker', () => {
      const project = { modules: [] };
      const tracker = new GlobalVariableTracker(project);
      expect(tracker).toBeInstanceOf(GlobalVariableTracker);
    });

    it('should have trackMolecule method', () => {
      const project = { modules: [] };
      const tracker = new GlobalVariableTracker(project);
      expect(typeof tracker.trackMolecule).toBe('function');
    });

    it('should have isGlobalAccess method', () => {
      const project = { modules: [] };
      const tracker = new GlobalVariableTracker(project);
      expect(typeof tracker.isGlobalAccess).toBe('function');
    });

    it('should have findGlobalWrites method', () => {
      const project = { modules: [] };
      const tracker = new GlobalVariableTracker(project);
      expect(typeof tracker.findGlobalWrites).toBe('function');
    });
  });

  describe('trackMolecule', () => {
    it('should track atoms with global side effects', () => {
      const atom = {
        id: 'atom-1',
        name: 'updateGlobal',
        isAsync: false,
        isExported: false,
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'window.globalVar', target: 'window.globalVar' }
          ]
        }
      };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      const module = { moduleName: 'test', modulePath: 'test.js' };
      const project = { modules: [{ moduleName: 'test', files: [molecule] }] };
      
      const tracker = new GlobalVariableTracker(project);
      tracker.track();
      
      expect(tracker.state.has('global:window.globalVar')).toBe(true);
    });

    it('should track multiple atoms', () => {
      const atoms = [
        {
          id: 'atom-1',
          name: 'func1',
          dataFlow: { sideEffects: [{ variable: 'window.var1' }] }
        },
        {
          id: 'atom-2',
          name: 'func2',
          dataFlow: { sideEffects: [{ variable: 'window.var2' }] }
        }
      ];
      const molecule = { filePath: 'test.js', atoms };
      const project = { modules: [{ moduleName: 'test', files: [molecule] }] };
      
      const tracker = new GlobalVariableTracker(project);
      tracker.track();
      
      expect(tracker.state.has('global:window.var1')).toBe(true);
      expect(tracker.state.has('global:window.var2')).toBe(true);
    });

    it('should handle molecule without atoms', () => {
      const molecule = { filePath: 'test.js' };
      const project = { modules: [{ moduleName: 'test', files: [molecule] }] };
      
      const tracker = new GlobalVariableTracker(project);
      
      expect(() => tracker.track()).not.toThrow();
      expect(tracker.state.size).toBe(0);
    });
  });

  describe('isGlobalAccess', () => {
    let tracker;

    beforeEach(() => {
      const project = { modules: [] };
      tracker = new GlobalVariableTracker(project);
    });

    it('should detect window. access', () => {
      const effect = { variable: 'window.myVar' };
      expect(tracker.isGlobalAccess(effect)).toBe(true);
    });

    it('should detect global. access', () => {
      const effect = { variable: 'global.myVar' };
      expect(tracker.isGlobalAccess(effect)).toBe(true);
    });

    it('should detect globalThis. access', () => {
      const effect = { variable: 'globalThis.myVar' };
      expect(tracker.isGlobalAccess(effect)).toBe(true);
    });

    it('should detect process.env access', () => {
      const effect = { variable: 'process.env.NODE_ENV' };
      expect(tracker.isGlobalAccess(effect)).toBe(true);
    });

    it('should detect access via target property', () => {
      const effect = { target: 'window.document' };
      expect(tracker.isGlobalAccess(effect)).toBe(true);
    });

    it('should return false for non-global access', () => {
      const effect = { variable: 'localVar' };
      expect(tracker.isGlobalAccess(effect)).toBe(false);
    });

    it('should return false for module-level access', () => {
      const effect = { variable: 'module.exports' };
      expect(tracker.isGlobalAccess(effect)).toBe(false);
    });

    it('should return false for empty effect', () => {
      expect(tracker.isGlobalAccess({})).toBe(false);
    });

    it('should return false for null effect', () => {
      expect(tracker.isGlobalAccess(null)).toBe(false);
    });
  });

  describe('findGlobalWrites', () => {
    let tracker;

    beforeEach(() => {
      const project = { modules: [] };
      tracker = new GlobalVariableTracker(project);
    });

    it('should find global. assignment', () => {
      const code = 'global.myVar = 42;';
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes).toHaveLength(1);
      expect(writes[0].variable).toBe('global.myVar');
    });

    it('should find window. assignment', () => {
      const code = 'window.myVar = 42;';
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes).toHaveLength(1);
      expect(writes[0].variable).toBe('window.myVar');
    });

    it('should find globalThis. assignment', () => {
      const code = 'globalThis.myVar = 42;';
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes).toHaveLength(1);
      expect(writes[0].variable).toBe('globalThis.myVar');
    });

    it('should detect assignment with spaces', () => {
      const code = 'window.myVar   =   42;';
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes).toHaveLength(1);
    });

    it('should report correct line number', () => {
      const code = 'line1;\nline2;\nwindow.myVar = 42;';
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes[0].line).toBe(3);
    });

    it('should find multiple writes', () => {
      const code = `
        window.var1 = 1;
        global.var2 = 2;
        globalThis.var3 = 3;
      `;
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes).toHaveLength(3);
    });

    it('should return empty array for no writes', () => {
      const code = 'const local = 42;';
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes).toEqual([]);
    });

    it('should return empty array for empty code', () => {
      const writes = tracker.findGlobalWrites('');
      expect(writes).toEqual([]);
    });

    it('should not detect reads', () => {
      const code = 'const x = window.myVar;';
      const writes = tracker.findGlobalWrites(code);
      
      expect(writes).toEqual([]);
    });
  });

  describe('Integration', () => {
    it('should track from side effects', () => {
      const atom = {
        id: 'atom-1',
        name: 'updateWindow',
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'window.user', target: 'window.user', line: 10 }
          ]
        }
      };
      const molecule = { filePath: 'auth.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'auth', files: [molecule] }] };
      
      const tracker = new GlobalVariableTracker(project);
      tracker.track();
      
      const accesses = tracker.state.get('global:window.user');
      expect(accesses).toHaveLength(1);
      expect(accesses[0].atom).toBe('atom-1');
      expect(accesses[0].type).toBe('write');
    });

    it('should track from code analysis', () => {
      const atom = {
        id: 'atom-1',
        name: 'setGlobal',
        isAsync: false,
        code: 'window.config = { debug: true };',
        dataFlow: { sideEffects: [] }
      };
      const molecule = { filePath: 'config.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'config', files: [molecule] }] };
      
      const tracker = new GlobalVariableTracker(project);
      tracker.track();
      
      expect(tracker.state.has('global:window.config')).toBe(true);
    });

    it('should track from both sources', () => {
      const atom = {
        id: 'atom-1',
        name: 'updateGlobal',
        isAsync: true,
        code: 'window.backup = window.user;',
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'window.user', line: 5 }
          ]
        }
      };
      const molecule = { filePath: 'sync.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'sync', files: [molecule] }] };
      
      const tracker = new GlobalVariableTracker(project);
      tracker.track();
      
      expect(tracker.state.has('global:window.user')).toBe(true);
      expect(tracker.state.has('global:window.backup')).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    let tracker;

    beforeEach(() => {
      const project = { modules: [] };
      tracker = new GlobalVariableTracker(project);
    });

    it('should handle atom without dataFlow', () => {
      const atom = { id: 'atom-1', name: 'test' };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      
      expect(() => tracker.trackMolecule(molecule, {})).not.toThrow();
    });

    it('should handle side effects without variable or target', () => {
      const atom = {
        id: 'atom-1',
        name: 'test',
        dataFlow: { sideEffects: [{ type: 'write' }] }
      };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      
      expect(() => tracker.trackMolecule(molecule, {})).not.toThrow();
    });

    it('should handle null code', () => {
      const atom = {
        id: 'atom-1',
        name: 'test',
        code: null,
        dataFlow: { sideEffects: [] }
      };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      
      expect(() => tracker.trackMolecule(molecule, {})).not.toThrow();
    });

    it('should handle empty molecule', () => {
      expect(() => tracker.trackMolecule({}, {})).not.toThrow();
    });

    it('should handle null molecule', () => {
      expect(() => tracker.trackMolecule(null, {})).not.toThrow();
    });
  });
});
