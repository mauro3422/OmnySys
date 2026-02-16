/**
 * @fileoverview Atom Extraction Phase Tests
 * 
 * Tests for the main AtomExtractionPhase class.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/atom-extraction/AtomExtractionPhase
 */

import { describe, it, expect } from 'vitest';
import { AtomExtractionPhase } from '../../../../../../src/layer-a-static/pipeline/phases/atom-extraction/AtomExtractionPhase.js';
import { 
  PhaseContextBuilder, 
  AtomBuilder,
  FunctionInfoBuilder,
  FileMetadataBuilder,
  PhaseValidator
} from '../../../../../factories/phases-test.factory.js';

describe('AtomExtractionPhase', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export AtomExtractionPhase class', () => {
      expect(AtomExtractionPhase).toBeDefined();
      expect(typeof AtomExtractionPhase).toBe('function');
    });

    it('should be instantiable', () => {
      const phase = new AtomExtractionPhase();
      expect(phase).toBeDefined();
    });

    it('should have correct phase name', () => {
      const phase = new AtomExtractionPhase();
      expect(phase.name).toBe('atom-extraction');
    });

    it('should extend ExtractionPhase', async () => {
      const { ExtractionPhase } = await import('../../../../../../src/layer-a-static/pipeline/phases/base-phase.js');
      const phase = new AtomExtractionPhase();
      expect(phase).toBeInstanceOf(ExtractionPhase);
    });
  });

  // ============================================================================
  // Required Methods
  // ============================================================================
  describe('Required Methods', () => {
    it('should have execute method', () => {
      const phase = new AtomExtractionPhase();
      expect(typeof phase.execute).toBe('function');
    });

    it('should have canExecute method', () => {
      const phase = new AtomExtractionPhase();
      expect(typeof phase.canExecute).toBe('function');
    });

    it('should have validateContext method', () => {
      const phase = new AtomExtractionPhase();
      expect(typeof phase.validateContext).toBe('function');
    });
  });

  // ============================================================================
  // canExecute() Contract
  // ============================================================================
  describe('canExecute() Contract', () => {
    it('should return true by default', () => {
      const phase = new AtomExtractionPhase();
      expect(phase.canExecute({})).toBe(true);
    });

    it('should return true with valid context', () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create().build();
      expect(phase.canExecute(context)).toBe(true);
    });

    it('should return true with null context', () => {
      const phase = new AtomExtractionPhase();
      expect(phase.canExecute(null)).toBe(true);
    });
  });

  // ============================================================================
  // execute() Contract - Basic
  // ============================================================================
  describe('execute() Contract - Basic', () => {
    it('should throw when context is null', async () => {
      const phase = new AtomExtractionPhase();
      await expect(phase.execute(null)).rejects.toThrow();
    });

    it('should throw when context is undefined', async () => {
      const phase = new AtomExtractionPhase();
      await expect(phase.execute(undefined)).rejects.toThrow();
    });

    it('should throw when filePath is missing', async () => {
      const phase = new AtomExtractionPhase();
      const context = { code: '', fileInfo: {}, fileMetadata: {} };
      await expect(phase.execute(context)).rejects.toThrow();
    });

    it('should throw when code is missing', async () => {
      const phase = new AtomExtractionPhase();
      const context = { filePath: 'test.js', fileInfo: {}, fileMetadata: {} };
      await expect(phase.execute(context)).rejects.toThrow();
    });

    it('should throw when fileInfo is missing', async () => {
      const phase = new AtomExtractionPhase();
      const context = { filePath: 'test.js', code: '', fileMetadata: {} };
      await expect(phase.execute(context)).rejects.toThrow();
    });
  });

  // ============================================================================
  // execute() Contract - Function Extraction
  // ============================================================================
  describe('execute() Contract - Function Extraction', () => {
    it('should extract atoms from single function', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('testFunc').atLines(1, 3).build()]
        })
        .withCode('function testFunc() { return 1; }')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result).toHaveProperty('atoms');
      expect(result).toHaveProperty('atomCount');
      expect(Array.isArray(result.atoms)).toBe(true);
      expect(result.atomCount).toBe(1);
      expect(result.atoms).toHaveLength(1);
    });

    it('should extract atoms from multiple functions', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [
            FunctionInfoBuilder.create('funcA').atLines(1, 3).build(),
            FunctionInfoBuilder.create('funcB').atLines(4, 6).build(),
            FunctionInfoBuilder.create('funcC').atLines(7, 9).build()
          ]
        })
        .withCode(`
          function funcA() { return 1; }
          function funcB() { return 2; }
          function funcC() { return 3; }
        `)
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atomCount).toBe(3);
      expect(result.atoms).toHaveLength(3);
    });

    it('should extract atoms from empty functions array', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({ functions: [] })
        .withCode('// no functions')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atomCount).toBe(0);
      expect(result.atoms).toEqual([]);
    });

    it('should handle functions without fileMetadata', async () => {
      const phase = new AtomExtractionPhase();
      const context = {
        filePath: 'test.js',
        code: 'function test() { return 1; }',
        fileInfo: {
          functions: [FunctionInfoBuilder.create('test').build()]
        },
        fileMetadata: undefined
      };
      
      const result = await phase.execute(context);
      expect(result.atoms).toBeDefined();
    });
  });

  // ============================================================================
  // execute() Contract - Atom Structure
  // ============================================================================
  describe('execute() Contract - Atom Structure', () => {
    it('should create valid atoms', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('testFunc').build()]
        })
        .withCode('function testFunc() { return 1; }')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      const atom = result.atoms[0];
      expect(PhaseValidator.isValidAtom(atom)).toBe(true);
    });

    it('should include all required atom fields', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('testFunc').build()]
        })
        .withCode('function testFunc() { return 1; }')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      const atom = result.atoms[0];
      
      expect(atom).toHaveProperty('id');
      expect(atom).toHaveProperty('name');
      expect(atom).toHaveProperty('type');
      expect(atom).toHaveProperty('filePath');
      expect(atom).toHaveProperty('line');
      expect(atom).toHaveProperty('complexity');
      expect(atom).toHaveProperty('archetype');
    });

    it('should set correct atom name', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('myFunction').build()]
        })
        .withCode('function myFunction() { return 1; }')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atoms[0].name).toBe('myFunction');
    });

    it('should set correct file path', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFilePath('src/utils/helpers.js')
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('helper').build()]
        })
        .withCode('function helper() { return 1; }')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atoms[0].filePath).toBe('src/utils/helpers.js');
    });

    it('should calculate archetype for each atom', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('testFunc').build()]
        })
        .withCode('function testFunc() { return 1; }')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(PhaseValidator.isValidArchetype(result.atoms[0].archetype)).toBe(true);
    });
  });

  // ============================================================================
  // execute() Contract - Call Graph Building
  // ============================================================================
  describe('execute() Contract - Call Graph Building', () => {
    it('should build call graph with internal calls', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [
            FunctionInfoBuilder.create('main').withCalls([{ name: 'helper' }]).build(),
            FunctionInfoBuilder.create('helper').build()
          ]
        })
        .withCode(`
          function main() { helper(); }
          function helper() { return 1; }
        `)
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      const mainAtom = result.atoms.find(a => a.name === 'main');
      const helperAtom = result.atoms.find(a => a.name === 'helper');
      
      expect(mainAtom.calls).toHaveLength(1);
      expect(helperAtom.calledBy).toContain(mainAtom.id);
    });

    it('should handle external calls', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [
            FunctionInfoBuilder.create('main')
              .withCalls([{ name: 'externalFunc' }])
              .build()
          ]
        })
        .withCode('function main() { externalFunc(); }')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atoms[0].externalCalls.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // execute() Contract - Archetype Recalculation
  // ============================================================================
  describe('execute() Contract - Archetype Recalculation', () => {
    it('should recalculate archetypes after building call graph', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [
            FunctionInfoBuilder.create('main').withCalls([{ name: 'helper' }]).build(),
            FunctionInfoBuilder.create('helper').isExported(false).build()
          ]
        })
        .withCode(`
          function main() { helper(); }
          function helper() { return 1; }
        `)
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      // Helper should now have callers and not be dead
      const helperAtom = result.atoms.find(a => a.name === 'helper');
      expect(helperAtom.calledBy.length).toBeGreaterThan(0);
      expect(helperAtom.archetype).toBeDefined();
    });
  });

  // ============================================================================
  // Integration - Factory Pattern
  // ============================================================================
  describe('Integration - Factory Pattern', () => {
    it('should work with PhaseContextBuilder', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFilePath('test.js')
        .withCode('function test() { return 1; }')
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('test').build()]
        })
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atoms).toHaveLength(1);
    });

    it('should work with AtomScenarios', async () => {
      const phase = new AtomExtractionPhase();
      
      const { AtomScenarios } = await import('../../../../../factories/phases-test.factory.js');
      const atoms = AtomScenarios.atomChain();
      
      const context = PhaseContextBuilder.create()
        .withAtoms(atoms)
        .build();
      
      expect(context.atoms).toHaveLength(4);
      expect(PhaseValidator.areValidAtoms(context.atoms)).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle functions with missing properties gracefully', async () => {
      const phase = new AtomExtractionPhase();
      const context = {
        filePath: 'test.js',
        code: 'function test() {}',
        fileInfo: {
          functions: [{}] // Empty function info
        },
        fileMetadata: {}
      };
      
      const result = await phase.execute(context);
      // Should not throw, but result may be partial
      expect(result).toBeDefined();
    });

    it('should handle malformed code gracefully', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('test').atLines(1, 5).build()]
        })
        .withCode('not valid javascript {{{')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      // Should handle gracefully, possibly with default values
      const result = await phase.execute(context);
      expect(result).toBeDefined();
      expect(result.atoms).toBeDefined();
    });

    it('should handle missing function code range', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [{ name: 'test', line: 1 }] // Missing endLine
        })
        .withCode('function test() {}')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle large number of functions', async () => {
      const phase = new AtomExtractionPhase();
      const functions = Array.from({ length: 50 }, (_, i) => 
        FunctionInfoBuilder.create(`func${i}`).atLines(i * 2 + 1, i * 2 + 2).build()
      );
      
      const code = functions.map((f, i) => `function ${f.name}() { return ${i}; }`).join('\n');
      
      const context = PhaseContextBuilder.create()
        .withFileInfo({ functions })
        .withCode(code)
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atomCount).toBe(50);
      expect(result.atoms).toHaveLength(50);
    });

    it('should handle class methods', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [
            FunctionInfoBuilder.create('constructor').inClass('MyClass').build(),
            FunctionInfoBuilder.create('method').inClass('MyClass').build()
          ]
        })
        .withCode(`
          class MyClass {
            constructor() {}
            method() {}
          }
        `)
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atoms).toHaveLength(2);
      expect(result.atoms[0].className).toBe('MyClass');
      expect(result.atoms[1].className).toBe('MyClass');
    });

    it('should handle arrow functions', async () => {
      const phase = new AtomExtractionPhase();
      const context = PhaseContextBuilder.create()
        .withFileInfo({
          functions: [FunctionInfoBuilder.create('arrowFunc').ofType('arrow').build()]
        })
        .withCode('const arrowFunc = () => 1;')
        .withFileMetadata(FileMetadataBuilder.create().build())
        .build();
      
      const result = await phase.execute(context);
      
      expect(result.atoms).toHaveLength(1);
      expect(result.atoms[0].name).toBe('arrowFunc');
    });
  });
});
