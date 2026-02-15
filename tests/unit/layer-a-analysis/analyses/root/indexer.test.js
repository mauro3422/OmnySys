/**
 * @fileoverview indexer.test.js - ROOT INFRASTRUCTURE TEST
 * 
 * Tests for indexer.js - MAIN ENTRY POINT
 * ⭐ CRITICAL - Main orchestrator for the entire analysis pipeline
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { indexProject } from '#layer-a/indexer.js';

describe('ROOT INFRASTRUCTURE: indexer.js', () => {
  describe('Structure Contract', () => {
    it('MUST export indexProject function', () => {
      expect(indexProject).toBeDefined();
      expect(typeof indexProject).toBe('function');
    });

    it('MUST accept rootPath as first parameter', async () => {
      const result = await indexProject('/non-existent-test-project', { verbose: false });
      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it('MUST accept options as second parameter', async () => {
      const result = await indexProject('/non-existent', {
        outputPath: 'test.json',
        verbose: false
      });
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Function Signature', () => {
    it('SHOULD be an async function', () => {
      expect(indexProject.constructor.name).toBe('AsyncFunction');
    });

    it('SHOULD require rootPath parameter', async () => {
      expect(indexProject.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Options Interface', () => {
    it('SHOULD support outputPath option in signature', () => {
      // Verify through function inspection or documentation
      const fnString = indexProject.toString();
      expect(fnString).toContain('options');
    });

    it('SHOULD support verbose option in signature', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('verbose');
    });

    it('SHOULD support skipLLM option in signature', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('skipLLM');
    });

    it('SHOULD support singleFile option in signature', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('singleFile');
    });
  });

  describe('Pipeline Steps Documentation', () => {
    it('DOCUMENTS: loadProjectInfo step exists in source', () => {
      // Check that the source code mentions the pipeline steps
      const fnString = indexProject.toString();
      expect(fnString).toContain('loadProjectInfo');
    });

    it('DOCUMENTS: scanProjectFiles step exists in source', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('scanProjectFiles');
    });

    it('DOCUMENTS: parseFiles step exists in source', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('parseFiles');
    });

    it('DOCUMENTS: resolveImports step exists in source', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('resolveImports');
    });

    it('DOCUMENTS: buildSystemGraph step exists in source', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('buildSystemGraph');
    });

    it('DOCUMENTS: saveSystemMap step exists in source', () => {
      const fnString = indexProject.toString();
      expect(fnString).toContain('saveSystemMap');
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle invalid rootPath safely', async () => {
      const result = await indexProject('', { verbose: false });
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('MUST handle non-existent path safely', async () => {
      const result = await indexProject('/non/existent/path/12345', { verbose: false });
      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
    });
  });
});
