/**
 * @fileoverview Pipeline Phases Index Tests
 * 
 * Tests for the pipeline phases index module.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/index
 */

import { describe, it, expect } from 'vitest';
import {
  ExtractionPhase,
  AtomExtractionPhase,
  ChainBuildingPhase
} from '../../../../../src/layer-a-static/pipeline/phases/index.js';

describe('Pipeline Phases Index', () => {
  // ============================================================================
  // Structure Contract - Exports
  // ============================================================================
  describe('Structure Contract - Exports', () => {
    it('should export ExtractionPhase (base class)', () => {
      expect(ExtractionPhase).toBeDefined();
      expect(typeof ExtractionPhase).toBe('function');
    });

    it('should export AtomExtractionPhase', () => {
      expect(AtomExtractionPhase).toBeDefined();
      expect(typeof AtomExtractionPhase).toBe('function');
    });

    it('should export ChainBuildingPhase', () => {
      expect(ChainBuildingPhase).toBeDefined();
      expect(typeof ChainBuildingPhase).toBe('function');
    });
  });

  // ============================================================================
  // Structure Contract - Class Hierarchy
  // ============================================================================
  describe('Structure Contract - Class Hierarchy', () => {
    it('ExtractionPhase should be base class', () => {
      const phase = new ExtractionPhase('test');
      expect(phase).toBeInstanceOf(ExtractionPhase);
    });

    it('AtomExtractionPhase should extend ExtractionPhase', () => {
      const phase = new AtomExtractionPhase();
      expect(phase).toBeInstanceOf(ExtractionPhase);
      expect(phase).toBeInstanceOf(AtomExtractionPhase);
    });

    it('ChainBuildingPhase should extend ExtractionPhase', () => {
      const phase = new ChainBuildingPhase();
      expect(phase).toBeInstanceOf(ExtractionPhase);
      expect(phase).toBeInstanceOf(ChainBuildingPhase);
    });
  });

  // ============================================================================
  // Structure Contract - Phase Names
  // ============================================================================
  describe('Structure Contract - Phase Names', () => {
    it('AtomExtractionPhase should have correct name', () => {
      const phase = new AtomExtractionPhase();
      expect(phase.name).toBe('atom-extraction');
    });

    it('ChainBuildingPhase should have correct name', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.name).toBe('chain-building');
    });
  });

  // ============================================================================
  // Structure Contract - Required Methods
  // ============================================================================
  describe('Structure Contract - Required Methods', () => {
    it('AtomExtractionPhase should have execute method', () => {
      const phase = new AtomExtractionPhase();
      expect(typeof phase.execute).toBe('function');
    });

    it('ChainBuildingPhase should have execute method', () => {
      const phase = new ChainBuildingPhase();
      expect(typeof phase.execute).toBe('function');
    });

    it('AtomExtractionPhase should have canExecute method', () => {
      const phase = new AtomExtractionPhase();
      expect(typeof phase.canExecute).toBe('function');
    });

    it('ChainBuildingPhase should have canExecute method', () => {
      const phase = new ChainBuildingPhase();
      expect(typeof phase.canExecute).toBe('function');
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('AtomExtractionPhase should handle null context', async () => {
      const phase = new AtomExtractionPhase();
      await expect(phase.execute(null)).rejects.toThrow();
    });

    it('AtomExtractionPhase should handle undefined context', async () => {
      const phase = new AtomExtractionPhase();
      await expect(phase.execute(undefined)).rejects.toThrow();
    });

    it('ChainBuildingPhase should handle null context', async () => {
      const phase = new ChainBuildingPhase();
      const result = await phase.execute(null);
      expect(result).toBeNull();
    });

    it('ChainBuildingPhase should handle empty context', async () => {
      const phase = new ChainBuildingPhase();
      const result = await phase.execute({});
      expect(result).toEqual({ molecularChains: null });
    });

    it('ChainBuildingPhase canExecute should handle null context', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute(null)).toBe(false);
    });

    it('ChainBuildingPhase canExecute should handle undefined context', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute(undefined)).toBe(false);
    });

    it('ChainBuildingPhase canExecute should handle empty atoms array', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute({ atoms: [] })).toBe(false);
    });

    it('ChainBuildingPhase canExecute should handle missing atoms property', () => {
      const phase = new ChainBuildingPhase();
      expect(phase.canExecute({})).toBe(false);
    });
  });

  // ============================================================================
  // Consistency Checks
  // ============================================================================
  describe('Consistency Checks', () => {
    it('all phases should have consistent naming convention', () => {
      const atomPhase = new AtomExtractionPhase();
      const chainPhase = new ChainBuildingPhase();
      
      expect(atomPhase.name).toMatch(/^[a-z-]+$/);
      expect(chainPhase.name).toMatch(/^[a-z-]+$/);
    });

    it('all phases should inherit validateContext from base', () => {
      const atomPhase = new AtomExtractionPhase();
      const chainPhase = new ChainBuildingPhase();
      
      expect(typeof atomPhase.validateContext).toBe('function');
      expect(typeof chainPhase.validateContext).toBe('function');
    });

    it('all phases should inherit handleError from base', () => {
      const atomPhase = new AtomExtractionPhase();
      const chainPhase = new ChainBuildingPhase();
      
      expect(typeof atomPhase.handleError).toBe('function');
      expect(typeof chainPhase.handleError).toBe('function');
    });
  });

  // ============================================================================
  // Integration - Phase instantiation
  // ============================================================================
  describe('Integration - Phase instantiation', () => {
    it('should create all phases without errors', () => {
      expect(() => new AtomExtractionPhase()).not.toThrow();
      expect(() => new ChainBuildingPhase()).not.toThrow();
    });

    it('phases should be independent instances', () => {
      const phase1 = new AtomExtractionPhase();
      const phase2 = new AtomExtractionPhase();
      
      expect(phase1).not.toBe(phase2);
    });

    it('phases should maintain their own state', () => {
      const phase = new AtomExtractionPhase();
      expect(phase.name).toBe('atom-extraction');
    });
  });
});
