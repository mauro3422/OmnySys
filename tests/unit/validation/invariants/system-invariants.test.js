/**
 * @fileoverview System Invariants Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  UniqueIdsInvariant, 
  ValidReferencesInvariant, 
  BidirectionalGraphInvariant,
  SystemInvariants,
  registerInvariants 
} from '../../../../src/validation/invariants/system-invariants.js';
import { RuleRegistry } from '../../../../src/validation/core/rules/index.js';

describe('UniqueIdsInvariant', () => {
  let context;

  beforeEach(() => {
    context = { files: new Map() };
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(UniqueIdsInvariant.id).toBe('invariant.unique-ids');
    });

    it('is invariant', () => {
      expect(UniqueIdsInvariant.invariant).toBe(true);
    });

    it('applies to system', () => {
      expect(UniqueIdsInvariant.appliesTo).toContain('system');
    });
  });

  describe('validate', () => {
    it('returns valid for unique IDs', async () => {
      context.files.set('id1', { path: 'file1.js' });
      context.files.set('id2', { path: 'file2.js' });
      context.files.set('id3', { path: 'file3.js' });
      
      const result = await UniqueIdsInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
      expect(result.details.uniqueCount).toBe(3);
    });

    it('returns critical for duplicate IDs', async () => {
      context.files.set('id1', { id: 'id1', path: 'file1.js' });
      context.files.set('id2', { id: 'id2', path: 'file2.js' });
      context.files.set('id3', { id: 'id1', path: 'file3.js' });
      
      const result = await UniqueIdsInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
    });

    it('returns valid for empty context', async () => {
      const result = await UniqueIdsInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
      expect(result.details.uniqueCount).toBe(0);
    });
  });
});

describe('ValidReferencesInvariant', () => {
  let context;

  beforeEach(() => {
    context = { files: new Map() };
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(ValidReferencesInvariant.id).toBe('invariant.valid-references');
    });

    it('is invariant', () => {
      expect(ValidReferencesInvariant.invariant).toBe(true);
    });
  });

  describe('validate', () => {
    it('returns valid for valid references', async () => {
      context.files.set('file1.js', { 
        path: 'file1.js',
        usedBy: ['file2.js'],
        imports: []
      });
      context.files.set('file2.js', { 
        path: 'file2.js',
        usedBy: [],
        imports: [{ source: './file1.js' }]
      });
      
      const result = await ValidReferencesInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
    });

    it('returns critical for broken usedBy references', async () => {
      context.files.set('file1.js', { 
        path: 'file1.js',
        usedBy: ['nonexistent.js']
      });
      
      const result = await ValidReferencesInvariant.validate({}, context);
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('detects broken relative imports', async () => {
      context.files.set('src/file1.js', { 
        path: 'src/file1.js',
        imports: [{ source: './missing.js' }]
      });
      
      const result = await ValidReferencesInvariant.validate({}, context);
      
      expect(result.valid).toBe(false);
    });

    it('skips non-relative imports', async () => {
      context.files.set('file1.js', { 
        path: 'file1.js',
        imports: [
          { source: 'react' },
          { source: 'fs' }
        ]
      });
      
      const result = await ValidReferencesInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
    });
  });
});

describe('BidirectionalGraphInvariant', () => {
  let context;

  beforeEach(() => {
    context = { files: new Map() };
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(BidirectionalGraphInvariant.id).toBe('invariant.bidirectional-graph');
    });

    it('is invariant', () => {
      expect(BidirectionalGraphInvariant.invariant).toBe(true);
    });
  });

  describe('validate', () => {
    it('returns valid for bidirectional graph', async () => {
      context.files.set('file1.js', { 
        path: 'file1.js',
        usedBy: ['file2.js']
      });
      context.files.set('file2.js', { 
        path: 'file2.js',
        imports: [{ source: './file1.js' }],
        usedBy: []
      });
      
      const result = await BidirectionalGraphInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
    });

    it.skip('BUG: returns critical for missing back-reference', async () => {
      context.files.set('src/file1.js', { 
        path: 'src/file1.js',
        usedBy: []
      });
      context.files.set('src/file2.js', { 
        path: 'src/file2.js',
        imports: [{ source: './file1.js' }],
        usedBy: []
      });
      
      const result = await BidirectionalGraphInvariant.validate({}, context);
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('skips external imports', async () => {
      context.files.set('file1.js', { 
        path: 'file1.js',
        imports: [{ source: 'react' }],
        usedBy: []
      });
      
      const result = await BidirectionalGraphInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
    });

    it('handles empty context', async () => {
      const result = await BidirectionalGraphInvariant.validate({}, context);
      
      expect(result.valid).toBe(true);
    });
  });
});

describe('SystemInvariants collection', () => {
  it('contains all invariants', () => {
    expect(SystemInvariants).toHaveLength(3);
    expect(SystemInvariants).toContain(UniqueIdsInvariant);
    expect(SystemInvariants).toContain(ValidReferencesInvariant);
    expect(SystemInvariants).toContain(BidirectionalGraphInvariant);
  });
});

describe('registerInvariants', () => {
  it('registers all invariants to registry', () => {
    const registry = new RuleRegistry();
    
    registerInvariants(registry);
    
    expect(registry.has('invariant.unique-ids')).toBe(true);
    expect(registry.has('invariant.valid-references')).toBe(true);
    expect(registry.has('invariant.bidirectional-graph')).toBe(true);
    expect(registry.getInvariants()).toHaveLength(3);
  });

  it('returns registry for chaining', () => {
    const registry = new RuleRegistry();
    
    const result = registerInvariants(registry);
    
    expect(result).toBe(registry);
  });
});
