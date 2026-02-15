/**
 * @fileoverview module-state-tracker.test.js
 * 
 * Tests for ModuleStateTracker.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/trackers/module-state-tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleStateTracker } from '#layer-a/race-detector/trackers/module-state-tracker.js';

describe('ModuleStateTracker', () => {
  describe('Structure Contract', () => {
    it('should export ModuleStateTracker class', () => {
      expect(ModuleStateTracker).toBeDefined();
      expect(typeof ModuleStateTracker).toBe('function');
    });

    it('should extend BaseTracker', () => {
      const project = { modules: [] };
      const tracker = new ModuleStateTracker(project);
      expect(tracker).toBeInstanceOf(ModuleStateTracker);
    });

    it('should have trackMolecule method', () => {
      const project = { modules: [] };
      const tracker = new ModuleStateTracker(project);
      expect(typeof tracker.trackMolecule).toBe('function');
    });

    it('should have isModuleStateWrite method', () => {
      const project = { modules: [] };
      const tracker = new ModuleStateTracker(project);
      expect(typeof tracker.isModuleStateWrite).toBe('function');
    });
  });

  describe('trackMolecule', () => {
    it('should track atoms with module state writes', () => {
      const atom = {
        id: 'atom-1',
        name: 'updateState',
        isAsync: false,
        isExported: false,
        dataFlow: {
          sideEffects: [
            { type: 'module_state_write', target: 'sharedState' }
          ]
        }
      };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'test', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      tracker.track();
      
      expect(tracker.state.has('module:sharedState')).toBe(true);
    });

    it('should track multiple atoms', () => {
      const atoms = [
        {
          id: 'atom-1',
          name: 'func1',
          dataFlow: { sideEffects: [{ type: 'module_state_write', target: 'state1' }] }
        },
        {
          id: 'atom-2',
          name: 'func2',
          dataFlow: { sideEffects: [{ type: 'module_state_write', target: 'state2' }] }
        }
      ];
      const molecule = { filePath: 'test.js', atoms };
      const project = { modules: [{ moduleName: 'test', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      tracker.track();
      
      expect(tracker.state.has('module:state1')).toBe(true);
      expect(tracker.state.has('module:state2')).toBe(true);
    });

    it('should handle molecule without atoms', () => {
      const molecule = { filePath: 'test.js' };
      const project = { modules: [{ moduleName: 'test', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      
      expect(() => tracker.track()).not.toThrow();
      expect(tracker.state.size).toBe(0);
    });
  });

  describe('isModuleStateWrite', () => {
    let tracker;

    beforeEach(() => {
      const project = { modules: [] };
      tracker = new ModuleStateTracker(project);
    });

    it('should detect module_state_write type', () => {
      const effect = { type: 'module_state_write' };
      expect(tracker.isModuleStateWrite(effect)).toBe(true);
    });

    it('should detect module. prefix in target', () => {
      const effect = { type: 'write', target: 'module.exports' };
      expect(tracker.isModuleStateWrite(effect)).toBe(true);
    });

    it('should detect simple variable write without dots', () => {
      const effect = { type: 'write', variable: 'myVar' };
      expect(tracker.isModuleStateWrite(effect)).toBe(true);
    });

    it('should return false for object property access', () => {
      const effect = { type: 'write', variable: 'obj.prop' };
      expect(tracker.isModuleStateWrite(effect)).toBe(false);
    });

    it('should return false for read operations', () => {
      const effect = { type: 'read', variable: 'myVar' };
      expect(tracker.isModuleStateWrite(effect)).toBe(false);
    });

    it('should return false for empty effect', () => {
      expect(tracker.isModuleStateWrite({})).toBe(false);
    });

    it('should return false for null effect', () => {
      expect(tracker.isModuleStateWrite(null)).toBe(false);
    });

    it('should return false for undefined effect', () => {
      expect(tracker.isModuleStateWrite(undefined)).toBe(false);
    });

    it('should detect module. target with other types', () => {
      const effect = { type: 'call', target: 'module.shared' };
      expect(tracker.isModuleStateWrite(effect)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should track module_state_write effects', () => {
      const atom = {
        id: 'atom-1',
        name: 'updateModuleState',
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'module_state_write', target: 'counter', line: 10 }
          ]
        }
      };
      const molecule = { filePath: 'store.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'store', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      tracker.track();
      
      const accesses = tracker.state.get('module:counter');
      expect(accesses).toHaveLength(1);
      expect(accesses[0].atom).toBe('atom-1');
      expect(accesses[0].type).toBe('module_state_write');
    });

    it('should track module. prefix targets', () => {
      const atom = {
        id: 'atom-1',
        name: 'setShared',
        isAsync: false,
        dataFlow: {
          sideEffects: [
            { type: 'write', target: 'module.sharedData', line: 5 }
          ]
        }
      };
      const molecule = { filePath: 'utils.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'utils', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      tracker.track();
      
      expect(tracker.state.has('module:module.sharedData')).toBe(true);
    });

    it('should track simple variable writes', () => {
      const atom = {
        id: 'atom-1',
        name: 'increment',
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'count', line: 8 }
          ]
        }
      };
      const molecule = { filePath: 'counter.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'counter', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      tracker.track();
      
      expect(tracker.state.has('module:count')).toBe(true);
    });

    it('should track multiple side effects in single atom', () => {
      const atom = {
        id: 'atom-1',
        name: 'updateAll',
        dataFlow: {
          sideEffects: [
            { type: 'module_state_write', target: 'state1' },
            { type: 'module_state_write', target: 'state2' },
            { type: 'read', variable: 'state3' }
          ]
        }
      };
      const molecule = { filePath: 'batch.js', atoms: [atom] };
      const project = { modules: [{ moduleName: 'batch', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      tracker.track();
      
      expect(tracker.state.has('module:state1')).toBe(true);
      expect(tracker.state.has('module:state2')).toBe(true);
      expect(tracker.state.has('module:state3')).toBe(false);
    });

    it('should aggregate accesses from multiple atoms to same state', () => {
      const atoms = [
        {
          id: 'atom-1',
          name: 'increment',
          dataFlow: {
            sideEffects: [{ type: 'module_state_write', target: 'counter' }]
          }
        },
        {
          id: 'atom-2',
          name: 'decrement',
          dataFlow: {
            sideEffects: [{ type: 'module_state_write', target: 'counter' }]
          }
        }
      ];
      const molecule = { filePath: 'math.js', atoms };
      const project = { modules: [{ moduleName: 'math', files: [molecule] }] };
      
      const tracker = new ModuleStateTracker(project);
      tracker.track();
      
      const accesses = tracker.state.get('module:counter');
      expect(accesses).toHaveLength(2);
    });
  });

  describe('Error Handling Contract', () => {
    let tracker;

    beforeEach(() => {
      const project = { modules: [] };
      tracker = new ModuleStateTracker(project);
    });

    it('should handle atom without dataFlow', () => {
      const atom = { id: 'atom-1', name: 'test' };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      
      expect(() => tracker.trackMolecule(molecule, {})).not.toThrow();
    });

    it('should handle side effects without target or variable', () => {
      const atom = {
        id: 'atom-1',
        name: 'test',
        dataFlow: { sideEffects: [{ type: 'module_state_write' }] }
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

    it('should handle side effects that are not module state writes', () => {
      const atom = {
        id: 'atom-1',
        name: 'test',
        dataFlow: {
          sideEffects: [
            { type: 'network', target: 'api' },
            { type: 'storage', variable: 'localStorage' }
          ]
        }
      };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      
      tracker.trackMolecule(molecule, {});
      expect(tracker.state.size).toBe(0);
    });

    it('should handle circular references in dataFlow', () => {
      const circular = { type: 'module_state_write', target: 'state' };
      circular.self = circular;
      
      const atom = {
        id: 'atom-1',
        name: 'test',
        dataFlow: { sideEffects: [circular] }
      };
      const molecule = { filePath: 'test.js', atoms: [atom] };
      
      expect(() => tracker.trackMolecule(molecule, {})).not.toThrow();
    });
  });
});
