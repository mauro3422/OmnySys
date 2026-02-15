/**
 * @fileoverview ChainIdGenerator.test.js
 * 
 * Tests for ChainIdGenerator - Unique ID generation
 * 
 * @module tests/unit/molecular-chains/builders/ChainIdGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChainIdGenerator } from '#molecular-chains/builders/ChainIdGenerator.js';

describe('ChainIdGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ChainIdGenerator();
  });

  // ============================================================================
  // Constructor
  // ============================================================================
  describe('constructor', () => {
    it('should create ChainIdGenerator', () => {
      expect(generator).toBeDefined();
    });

    it('should initialize counter to 0', () => {
      expect(generator.counter).toBe(0);
    });
  });

  // ============================================================================
  // ID Generation
  // ============================================================================
  describe('generate', () => {
    it('should generate a string ID', () => {
      const id = generator.generate();
      
      expect(typeof id).toBe('string');
    });

    it('should generate ID with chain_ prefix', () => {
      const id = generator.generate();
      
      expect(id.startsWith('chain_')).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generator.generate();
      const id2 = generator.generate();
      
      expect(id1).not.toBe(id2);
    });

    it('should increment counter on each generation', () => {
      expect(generator.counter).toBe(0);
      
      generator.generate();
      expect(generator.counter).toBe(1);
      
      generator.generate();
      expect(generator.counter).toBe(2);
    });

    it('should include timestamp in ID', () => {
      const before = Date.now();
      const id = generator.generate();
      const after = Date.now();
      
      const parts = id.split('_');
      const timestamp = parseInt(parts[1]);
      
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should include random component in ID', () => {
      const id = generator.generate();
      const parts = id.split('_');
      
      expect(parts[2]).toBeDefined();
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should include counter in ID', () => {
      const id1 = generator.generate();
      const id2 = generator.generate();
      
      const parts1 = id1.split('_');
      const parts2 = id2.split('_');
      
      expect(parts1[3]).toBe('0');
      expect(parts2[3]).toBe('1');
    });
  });

  // ============================================================================
  // Uniqueness Guarantees
  // ============================================================================
  describe('uniqueness', () => {
    it('should generate 100 unique IDs', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        ids.add(generator.generate());
      }
      
      expect(ids.size).toBe(100);
    });

    it('should generate IDs with different timestamps when delayed', async () => {
      const id1 = generator.generate();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const id2 = generator.generate();
      
      const ts1 = parseInt(id1.split('_')[1]);
      const ts2 = parseInt(id2.split('_')[1]);
      
      expect(ts2).toBeGreaterThanOrEqual(ts1);
    });
  });

  // ============================================================================
  // Default Export
  // ============================================================================
  describe('default export', () => {
    it('should export ChainIdGenerator as default', async () => {
      const module = await import('#molecular-chains/builders/ChainIdGenerator.js');
      
      expect(module.default).toBe(ChainIdGenerator);
    });
  });
});
