/**
 * @fileoverview chain-builder.test.js
 * 
 * Tests for chain-builder.js backward compatibility module
 * 
 * @module tests/unit/molecular-chains/builders/chain-builder
 */

import { describe, it, expect } from 'vitest';

describe('chain-builder (backward compatibility)', () => {
  // ============================================================================
  // Exports
  // ============================================================================
  describe('exports', () => {
    it('should export ChainBuilder', async () => {
      const module = await import('#molecular-chains/chain-builder.js');
      
      expect(module.ChainBuilder).toBeDefined();
    });

    it('should export ChainBuilder as default', async () => {
      const module = await import('#molecular-chains/chain-builder.js');
      const { ChainBuilder } = await import('#molecular-chains/builders/ChainBuilder.js');
      
      expect(module.default).toBe(ChainBuilder);
    });

    it('should re-export ChainBuilder from index', async () => {
      const wrapperModule = await import('#molecular-chains/chain-builder.js');
      const indexModule = await import('#molecular-chains/index.js');
      
      expect(wrapperModule.ChainBuilder).toBe(indexModule.ChainBuilder);
    });
  });

  // ============================================================================
  // Functionality
  // ============================================================================
  describe('functionality', () => {
    it('should create working ChainBuilder instance', async () => {
      const { ChainBuilder } = await import('#molecular-chains/chain-builder.js');
      
      const atoms = [{
        id: 'test::fn',
        name: 'fn',
        isExported: true,
        calledBy: [],
        calls: [],
        dataFlow: { inputs: [], outputs: [], transformations: [] }
      }];
      
      const builder = new ChainBuilder(atoms);
      const result = builder.build();
      
      expect(result).toBeDefined();
      expect(result.chains).toBeDefined();
    });
  });
});
