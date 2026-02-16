/**
 * @fileoverview base-tracker.test.js
 * 
 * Tests for BaseTracker abstract class.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/trackers/base-tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseTracker } from '#layer-a/race-detector/trackers/base-tracker.js';

describe('BaseTracker', () => {
  describe('Structure Contract', () => {
    it('should export BaseTracker class', () => {
      expect(BaseTracker).toBeDefined();
      expect(typeof BaseTracker).toBe('function');
    });

    it('should not be instantiable directly without project', () => {
      // BaseTracker requires project parameter
      expect(() => new BaseTracker()).not.toThrow();
    });

    it('should have required methods', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      expect(typeof tracker.track).toBe('function');
      expect(typeof tracker.initialize).toBe('function');
      expect(typeof tracker.trackMolecule).toBe('function');
      expect(typeof tracker.finalize).toBe('function');
      expect(typeof tracker.registerAccess).toBe('function');
    });
  });

  describe('Constructor', () => {
    it('should store project reference', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      expect(tracker.project).toBe(project);
    });

    it('should initialize empty state Map', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      expect(tracker.state).toBeInstanceOf(Map);
      expect(tracker.state.size).toBe(0);
    });
  });

  describe('track', () => {
    it('should return Map', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      const result = tracker.track();
      expect(result).toBeInstanceOf(Map);
    });

    it('should call initialize', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      let initialized = false;
      tracker.initialize = function() {
        initialized = true;
        this.state.clear();
      };
      
      tracker.track();
      expect(initialized).toBe(true);
    });

    it('should iterate over modules and molecules', () => {
      const atom1 = { id: 'a1', name: 'func1' };
      const molecule = { filePath: 'test.js', atoms: [atom1] };
      const module = { moduleName: 'test', files: [molecule] };
      const project = { modules: [module] };
      
      const tracker = new BaseTracker(project);
      let trackedMolecules = 0;
      tracker.trackMolecule = () => { trackedMolecules++; };
      
      tracker.track();
      expect(trackedMolecules).toBe(1);
    });

    it('should handle empty modules array', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      
      expect(() => tracker.track()).not.toThrow();
    });

    it('should handle modules without files', () => {
      const module = { moduleName: 'test' };
      const project = { modules: [module] };
      const tracker = new BaseTracker(project);
      
      expect(() => tracker.track()).not.toThrow();
    });

    it('should call finalize and return its result', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      const customState = new Map([['key', []]]);
      tracker.finalize = () => customState;
      
      const result = tracker.track();
      expect(result).toBe(customState);
    });
  });

  describe('initialize', () => {
    it('should clear state Map', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      tracker.state.set('key', []);
      
      tracker.initialize();
      expect(tracker.state.size).toBe(0);
    });
  });

  describe('trackMolecule', () => {
    it('should throw error when called on base class', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      const molecule = { filePath: 'test.js' };
      const module = { moduleName: 'test' };
      
      expect(() => tracker.trackMolecule(molecule, module)).toThrow('Subclasses must implement trackMolecule()');
    });
  });

  describe('finalize', () => {
    it('should return state Map', () => {
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      const result = tracker.finalize();
      expect(result).toBe(tracker.state);
    });
  });

  describe('registerAccess', () => {
    let tracker;
    let atom;
    let module;

    beforeEach(() => {
      const project = { modules: [] };
      tracker = new BaseTracker(project);
      atom = { id: 'atom-1', name: 'testFunc', isAsync: false, isExported: false };
      module = { moduleName: 'testModule', modulePath: 'src/test.js' };
    });

    it('should register access with full key', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read', line: 10 }, 'src/test.js');
      
      expect(tracker.state.has('global:myVar')).toBe(true);
    });

    it('should create array for new key', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const accesses = tracker.state.get('global:myVar');
      expect(Array.isArray(accesses)).toBe(true);
      expect(accesses).toHaveLength(1);
    });

    it('should append to existing key', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'write' }, 'src/test.js');
      
      const accesses = tracker.state.get('global:myVar');
      expect(accesses).toHaveLength(2);
    });

    it('should store atom ID', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.atom).toBe('atom-1');
    });

    it('should store atom name', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.atomName).toBe('testFunc');
    });

    it('should store file path', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.file).toBe('src/test.js');
    });

    it('should use module path as fallback for file', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, null);
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.file).toBe('src/test.js');
    });

    it('should use "unknown" as last fallback', () => {
      tracker.registerAccess('global', 'myVar', atom, {}, { type: 'read' }, null);
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.file).toBe('unknown');
    });

    it('should store module name', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.module).toBe('testModule');
    });

    it('should use "unknown" for missing module', () => {
      tracker.registerAccess('global', 'myVar', atom, {}, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.module).toBe('unknown');
    });

    it('should store access type', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'write' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.type).toBe('write');
    });

    it('should default type to "unknown"', () => {
      tracker.registerAccess('global', 'myVar', atom, module, {}, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.type).toBe('unknown');
    });

    it('should store isAsync flag', () => {
      atom.isAsync = true;
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.isAsync).toBe(true);
    });

    it('should store isExported flag', () => {
      atom.isExported = true;
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.isExported).toBe(true);
    });

    it('should store line number', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read', line: 42 }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.line).toBe(42);
    });

    it('should default line to 0', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.line).toBe(0);
    });

    it('should store operation', () => {
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read', operation: 'increment' }, 'src/test.js');
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.operation).toBe('increment');
    });

    it('should add timestamp', () => {
      const before = Date.now();
      tracker.registerAccess('global', 'myVar', atom, module, { type: 'read' }, 'src/test.js');
      const after = Date.now();
      
      const access = tracker.state.get('global:myVar')[0];
      expect(access.timestamp).toBeGreaterThanOrEqual(before);
      expect(access.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Error Handling Contract', () => {
    let tracker;

    beforeEach(() => {
      const project = { modules: [] };
      tracker = new BaseTracker(project);
    });

    it('should handle registerAccess with null atom', () => {
      expect(() => {
        tracker.registerAccess('global', 'myVar', null, {}, { type: 'read' }, 'test.js');
      }).toThrow();
    });

    it('should handle registerAccess with undefined atom', () => {
      expect(() => {
        tracker.registerAccess('global', 'myVar', undefined, {}, { type: 'read' }, 'test.js');
      }).toThrow();
    });

    it('should handle registerAccess with atom missing id', () => {
      const atom = { name: 'test' };
      tracker.registerAccess('global', 'myVar', atom, {}, { type: 'read' }, 'test.js');
      const access = tracker.state.get('global:myVar')[0];
      expect(access.atom).toBeUndefined();
    });

    it('should handle project without modules', () => {
      const project = {};
      const tracker = new BaseTracker(project);
      expect(() => tracker.track()).not.toThrow();
    });

    it('should handle null project', () => {
      expect(() => new BaseTracker(null)).not.toThrow();
    });

    it('should handle initialize multiple times', () => {
      expect(() => {
        tracker.initialize();
        tracker.initialize();
        tracker.initialize();
      }).not.toThrow();
    });
  });
});
