/**
 * @fileoverview helpers.test.js - ROOT INFRASTRUCTURE TEST
 * 
 * Tests for analyses/helpers.js - Shared analysis utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isLikelyEntryPoint,
  isPublicAPI
} from '#layer-a/analyses/helpers.js';

describe('ROOT INFRASTRUCTURE: analyses/helpers.js', () => {
  describe('Structure Contract', () => {
    it('MUST export isLikelyEntryPoint function', () => {
      expect(isLikelyEntryPoint).toBeDefined();
      expect(typeof isLikelyEntryPoint).toBe('function');
    });

    it('MUST export isPublicAPI function', () => {
      expect(isPublicAPI).toBeDefined();
      expect(typeof isPublicAPI).toBe('function');
    });
  });

  describe('isLikelyEntryPoint', () => {
    it('MUST return true for index.js files', () => {
      expect(isLikelyEntryPoint('src/index.js')).toBe(true);
      expect(isLikelyEntryPoint('lib/index.ts')).toBe(true);
    });

    it('MUST return true for main.js files', () => {
      expect(isLikelyEntryPoint('src/main.js')).toBe(true);
      expect(isLikelyEntryPoint('main.ts')).toBe(true);
    });

    it('MUST return true for app.js files', () => {
      expect(isLikelyEntryPoint('src/app.js')).toBe(true);
      expect(isLikelyEntryPoint('app.ts')).toBe(true);
    });

    it('MUST return true for cli.js files', () => {
      expect(isLikelyEntryPoint('src/cli.js')).toBe(true);
      expect(isLikelyEntryPoint('bin/cli.js')).toBe(true);
    });

    it('MUST return true for server.js files', () => {
      expect(isLikelyEntryPoint('src/server.js')).toBe(true);
      expect(isLikelyEntryPoint('server.ts')).toBe(true);
    });

    it('MUST return true for start.js files', () => {
      expect(isLikelyEntryPoint('src/start.js')).toBe(true);
    });

    it('MUST return false for regular module files', () => {
      expect(isLikelyEntryPoint('src/utils.js')).toBe(false);
      expect(isLikelyEntryPoint('src/components/Button.jsx')).toBe(false);
    });

    it('MUST be case-insensitive', () => {
      expect(isLikelyEntryPoint('src/INDEX.js')).toBe(true);
      expect(isLikelyEntryPoint('src/Main.JS')).toBe(true);
    });

    it('MUST handle paths with directories', () => {
      expect(isLikelyEntryPoint('packages/core/src/index.js')).toBe(true);
      expect(isLikelyEntryPoint('deep/nested/path/main.js')).toBe(true);
    });
  });

  describe('isPublicAPI', () => {
    it('MUST return true for main module API functions', () => {
      expect(isPublicAPI('src/indexer.js', 'indexProject')).toBe(true);
      expect(isPublicAPI('src/scanner.js', 'scanProject')).toBe(true);
    });

    it('MUST return true for functions starting with "build" in main modules', () => {
      expect(isPublicAPI('src/graph-builder.js', 'buildGraph')).toBe(true);
    });

    it('MUST return true for functions starting with "parse" in main modules', () => {
      expect(isPublicAPI('src/parser.js', 'parseFile')).toBe(true);
    });

    it('MUST return true for functions starting with "resolve" in main modules', () => {
      expect(isPublicAPI('src/resolver.js', 'resolveImports')).toBe(true);
    });

    it('MUST return true for functions starting with "scan" in main modules', () => {
      expect(isPublicAPI('src/scanner.js', 'scanDirectory')).toBe(true);
    });

    it('MUST return true for functions starting with "analyze" in main modules', () => {
      expect(isPublicAPI('src/analyzer.js', 'analyzeCode')).toBe(true);
    });

    it('MUST return true for functions starting with "get" in main modules', () => {
      expect(isPublicAPI('src/indexer.js', 'getSystemMap')).toBe(true);
    });

    it('MUST return true for functions starting with "generate" in main modules', () => {
      expect(isPublicAPI('src/analyzer.js', 'generateReport')).toBe(true);
    });

    it('MUST return false for internal functions', () => {
      expect(isPublicAPI('src/utils/helpers.js', 'internalHelper')).toBe(false);
    });

    it('MUST return false for analysis utilities', () => {
      expect(isPublicAPI('src/analyses/utils.js', 'someUtil')).toBe(false);
    });

    it('MUST return false for non-public function names', () => {
      expect(isPublicAPI('src/indexer.js', 'privateHelper')).toBe(false);
    });

    it('MUST return false for internal subdirectories', () => {
      expect(isPublicAPI('src/analyses/tier1/hotspots.js', 'findHotspots')).toBe(false);
      expect(isPublicAPI('src/utils/formatters.js', 'formatDate')).toBe(false);
    });
  });
});
