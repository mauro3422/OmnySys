/**
 * @fileoverview Tests for get_impact_map MCP Tool
 * @module tests/unit/layer-c-memory/mcp/impact-map.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { get_impact_map } from '#layer-c/mcp/tools/impact-map.js';

describe('get_impact_map', () => {
  let tempDir;
  let mockContext;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-impact-test-'));
    
    const dataDir = path.join(tempDir, '.omnysysdata');
    const filesDir = path.join(dataDir, 'files');
    await fs.mkdir(filesDir, { recursive: true });
    
    await fs.mkdir(path.join(filesDir, 'src', 'utils'), { recursive: true });
    await fs.mkdir(path.join(filesDir, 'src', 'core'), { recursive: true });
    await fs.mkdir(path.join(filesDir, 'src', 'api'), { recursive: true });
    
    await fs.writeFile(
      path.join(filesDir, 'src', 'utils', 'helper.js.json'),
      JSON.stringify({
        path: 'src/utils/helper.js',
        exports: [{ name: 'formatDate' }, { name: 'parseInput' }],
        imports: [{ source: 'lodash' }],
        usedBy: ['src/core/main.js', 'src/api/routes.js'],
        semanticConnections: [{ target: 'src/utils/format.js' }],
        riskScore: { severity: 'medium' },
        subsystem: 'utils'
      })
    );
    
    await fs.writeFile(
      path.join(filesDir, 'src', 'core', 'main.js.json'),
      JSON.stringify({
        path: 'src/core/main.js',
        exports: [{ name: 'init' }, { name: 'shutdown' }],
        imports: [{ source: 'src/utils/helper.js' }],
        usedBy: ['src/index.js'],
        semanticConnections: [],
        riskScore: { severity: 'low' },
        subsystem: 'core'
      })
    );
    
    await fs.writeFile(
      path.join(filesDir, 'src', 'api', 'routes.js.json'),
      JSON.stringify({
        path: 'src/api/routes.js',
        exports: [{ name: 'router' }],
        imports: [{ source: 'src/utils/helper.js' }],
        usedBy: [],
        semanticConnections: [],
        riskScore: { severity: 'low' },
        subsystem: 'api'
      })
    );
    
    await fs.writeFile(
      path.join(filesDir, 'src', 'index.js.json'),
      JSON.stringify({
        path: 'src/index.js',
        exports: [],
        imports: [{ source: 'src/core/main.js' }],
        usedBy: [],
        semanticConnections: [],
        riskScore: { severity: 'low' },
        subsystem: 'entry'
      })
    );
    
    await fs.writeFile(
      path.join(dataDir, 'index.json'),
      JSON.stringify({
        projectPath: tempDir,
        fileIndex: {
          'src/utils/helper.js': { exports: [{ name: 'formatDate' }, { name: 'parseInput' }], usedBy: ['src/core/main.js', 'src/api/routes.js'] },
          'src/core/main.js': { exports: [{ name: 'init' }, { name: 'shutdown' }], usedBy: ['src/index.js'] },
          'src/api/routes.js': { exports: [{ name: 'router' }], usedBy: [] },
          'src/index.js': { exports: [], usedBy: [] }
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

  describe('return structure', () => {
    it('returns impact map structure for analyzed file', async () => {
      const result = await get_impact_map({ filePath: 'src/utils/helper.js' }, mockContext);

      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('directlyAffects');
      expect(result).toHaveProperty('transitiveAffects');
      expect(result).toHaveProperty('semanticConnections');
      expect(result).toHaveProperty('totalAffected');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('subsystem');
      expect(result).toHaveProperty('exports');
    });

    it('returns correct file path', async () => {
      const result = await get_impact_map({ filePath: 'src/utils/helper.js' }, mockContext);

      expect(result.file).toBe('src/utils/helper.js');
    });

    it('returns directlyAffects as array', async () => {
      const result = await get_impact_map({ filePath: 'src/utils/helper.js' }, mockContext);

      expect(Array.isArray(result.directlyAffects)).toBe(true);
      expect(result.directlyAffects.length).toBe(2);
    });

    it('calculates totalAffected correctly', async () => {
      const result = await get_impact_map({ filePath: 'src/utils/helper.js' }, mockContext);

      expect(result.totalAffected).toBeGreaterThanOrEqual(result.directlyAffects.length);
    });
  });

  describe('handles missing file', () => {
    it('returns status when file not found', async () => {
      mockContext.server.initialized = false;

      const result = await get_impact_map({ filePath: 'missing.js' }, mockContext);

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('not_ready');
      expect(result).toHaveProperty('message');
    });
  });

  describe('transitive impact calculation', () => {
    it('calculates transitive dependencies', async () => {
      const result = await get_impact_map({ filePath: 'src/utils/helper.js' }, mockContext);

      expect(result.transitiveAffects).toBeDefined();
      expect(Array.isArray(result.transitiveAffects)).toBe(true);
    });

    it('limits transitiveAffects to prevent overload', async () => {
      const result = await get_impact_map({ filePath: 'src/utils/helper.js' }, mockContext);

      expect(result.transitiveAffects.length).toBeLessThanOrEqual(20);
    });
  });

  describe('exports extraction', () => {
    it('extracts export names from file data', async () => {
      const result = await get_impact_map({ filePath: 'src/utils/helper.js' }, mockContext);

      expect(result.exports).toEqual(['formatDate', 'parseInput']);
    });

    it('returns empty array when no exports', async () => {
      const result = await get_impact_map({ filePath: 'src/index.js' }, mockContext);

      expect(result.exports).toEqual([]);
    });
  });

  describe('handles invalid input', () => {
    it('handles missing filePath gracefully', async () => {
      const result = await get_impact_map({}, mockContext);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
    });

    it('handles empty string filePath', async () => {
      const result = await get_impact_map({ filePath: '' }, mockContext);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
    });
  });
});
