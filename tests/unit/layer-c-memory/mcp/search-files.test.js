/**
 * @fileoverview Tests for search_files MCP Tool
 * @module tests/unit/layer-c-memory/mcp/search-files.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { search_files } from '#layer-c/mcp/tools/search.js';

describe('search_files', () => {
  let tempDir;
  let mockContext;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-search-test-'));
    
    const dataDir = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.writeFile(
      path.join(dataDir, 'index.json'),
      JSON.stringify({
        projectPath: tempDir,
        fileIndex: {
          'src/utils/helper.js': {},
          'src/utils/format.js': {},
          'src/core/main.js': {},
          'src/api/routes.js': {},
          'src/userService.js': {},
          'src/admin-service.js': {},
          'src/components/button.js': {},
          'src/components/input.js': {},
          'src/pages/home.js': {},
          'src/Component.js': {},
          'src/COMPONENT.js': {},
          'src/component.js': {},
          'src/a.test.js': {},
          'src/b.test.ts': {},
          'src/c.js': {},
          'src/api/v1/users.js': {},
          'src/api/v2/users.js': {},
          'src/lib/users.js': {},
          'src/[test].js': {},
          'src/(group).js': {},
          'src/a/b/c/d/e/f/deep.js': {},
          'src/shallow.js': {}
        }
      })
    );
    
    mockContext = {
      projectPath: tempDir,
      server: { initialized: true }
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('returns matching files', () => {
    it('returns files matching pattern', async () => {
      const result = await search_files({ pattern: 'utils' }, mockContext);

      expect(result.found).toBe(2);
      expect(result.files).toContain('src/utils/helper.js');
      expect(result.files).toContain('src/utils/format.js');
    });

    it('returns result structure', async () => {
      const result = await search_files({ pattern: 'test' }, mockContext);

      expect(result).toHaveProperty('pattern');
      expect(result).toHaveProperty('found');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('totalIndexed');
    });

    it('includes search pattern in result', async () => {
      const result = await search_files({ pattern: 'component' }, mockContext);

      expect(result.pattern).toBe('component');
    });

    it('returns totalIndexed count', async () => {
      const result = await search_files({ pattern: 'xyz' }, mockContext);

      expect(result.totalIndexed).toBe(22);
    });
  });

  describe('handles no matches', () => {
    it('returns empty array when no matches', async () => {
      const result = await search_files({ pattern: 'nonexistent' }, mockContext);

      expect(result.found).toBe(0);
      expect(result.files).toEqual([]);
    });

    it('handles empty file index', async () => {
      const emptyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-search-empty-'));
      const dataDir = path.join(emptyTempDir, '.omnysysdata');
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(
        path.join(dataDir, 'index.json'),
        JSON.stringify({ projectPath: emptyTempDir, fileIndex: {} })
      );

      const result = await search_files({ pattern: 'anything' }, { projectPath: emptyTempDir });

      expect(result.found).toBe(0);
      expect(result.files).toEqual([]);
      expect(result.totalIndexed).toBe(0);

      await fs.rm(emptyTempDir, { recursive: true, force: true });
    });
  });

  describe('pattern matching works', () => {
    it('matches partial filenames', async () => {
      const result = await search_files({ pattern: 'service' }, mockContext);

      expect(result.found).toBe(2);
    });

    it('matches directory names', async () => {
      const result = await search_files({ pattern: 'components' }, mockContext);

      expect(result.found).toBe(2);
    });

    it('is case insensitive', async () => {
      const result = await search_files({ pattern: 'COMPONENT' }, mockContext);

      expect(result.found).toBe(5);
    });

    it('matches file extensions', async () => {
      const result = await search_files({ pattern: '.test.' }, mockContext);

      expect(result.found).toBe(2);
    });

    it('matches path segments', async () => {
      const result = await search_files({ pattern: 'api/v' }, mockContext);

      expect(result.found).toBe(2);
    });
  });

  describe('limits results', () => {
    it('limits results to 20 files', async () => {
      const manyFiles = {};
      for (let i = 0; i < 50; i++) {
        manyFiles[`src/match${i}.js`] = {};
      }
      
      const manyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-search-many-'));
      const dataDir = path.join(manyTempDir, '.omnysysdata');
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(
        path.join(dataDir, 'index.json'),
        JSON.stringify({ projectPath: manyTempDir, fileIndex: manyFiles })
      );

      const result = await search_files({ pattern: 'match' }, { projectPath: manyTempDir });

      expect(result.files.length).toBeLessThanOrEqual(20);

      await fs.rm(manyTempDir, { recursive: true, force: true });
    });
  });

  describe('handles errors', () => {
    it('handles missing metadata gracefully', async () => {
      const emptyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-search-nodata-'));

      const result = await search_files({ pattern: 'test' }, { projectPath: emptyTempDir });

      expect(result.found).toBe(0);

      await fs.rm(emptyTempDir, { recursive: true, force: true });
    });
  });

  describe('edge cases', () => {
    it('handles empty pattern', async () => {
      const result = await search_files({ pattern: '' }, mockContext);

      expect(result).toBeDefined();
    });

    it('handles special regex characters safely', async () => {
      const result = await search_files({ pattern: '[test]' }, mockContext);

      expect(result).toBeDefined();
    });

    it('handles deeply nested paths', async () => {
      const result = await search_files({ pattern: 'deep' }, mockContext);

      expect(result.found).toBe(1);
    });
  });

  describe('legacy metadata support', () => {
    it('handles files property as alternative to fileIndex', async () => {
      const legacyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-search-legacy-'));
      const dataDir = path.join(legacyTempDir, '.omnysysdata');
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(
        path.join(dataDir, 'index.json'),
        JSON.stringify({
          projectPath: legacyTempDir,
          files: {
            'src/a.js': {},
            'src/b.js': {}
          }
        })
      );

      const result = await search_files({ pattern: 'a' }, { projectPath: legacyTempDir });

      expect(result).toBeDefined();

      await fs.rm(legacyTempDir, { recursive: true, force: true });
    });
  });
});
