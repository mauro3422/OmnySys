/**
 * @fileoverview Tests for get_risk_assessment MCP Tool
 * @module tests/unit/layer-c-memory/mcp/risk-assessment.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { get_risk_assessment } from '#layer-c/mcp/tools/risk.js';

describe('get_risk_assessment', () => {
  let tempDir;
  let mockContext;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-risk-test-'));
    
    const dataDir = path.join(tempDir, '.omnysysdata');
    const risksDir = path.join(dataDir, 'risks');
    await fs.mkdir(risksDir, { recursive: true });
    
    await fs.writeFile(
      path.join(dataDir, 'index.json'),
      JSON.stringify({
        projectPath: tempDir,
        fileIndex: {
          'src/utils/helper.js': {
            exports: [{ name: 'formatDate' }],
            usedBy: ['src/core/main.js']
          },
          'src/highly-coupled.js': {
            exports: Array(10).fill({ name: 'export' }),
            usedBy: Array(15).fill('dependent')
          },
          'src/orphan.js': {
            exports: [{ name: 'unused' }],
            usedBy: []
          }
        }
      })
    );
    
    await fs.writeFile(
      path.join(risksDir, 'assessment.json'),
      JSON.stringify({
        report: {
          summary: {
            criticalCount: 0,
            highCount: 0,
            mediumCount: 0,
            lowCount: 0,
            totalFiles: 3
          },
          criticalRiskFiles: [],
          highRiskFiles: []
        },
        scores: {}
      })
    );
    
    mockContext = {
      projectPath: tempDir
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('return structure', () => {
    it('returns risk assessment structure', async () => {
      const result = await get_risk_assessment({}, mockContext);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('topRiskFiles');
      expect(result).toHaveProperty('recommendation');
    });

    it('returns summary with all count fields', async () => {
      const result = await get_risk_assessment({}, mockContext);

      expect(result.summary).toHaveProperty('totalFiles');
      expect(result.summary).toHaveProperty('totalIssues');
      expect(result.summary).toHaveProperty('criticalCount');
      expect(result.summary).toHaveProperty('highCount');
      expect(result.summary).toHaveProperty('mediumCount');
      expect(result.summary).toHaveProperty('lowCount');
    });

    it('returns topRiskFiles as array', async () => {
      const result = await get_risk_assessment({}, mockContext);

      expect(Array.isArray(result.topRiskFiles)).toBe(true);
    });

    it('returns recommendation as string', async () => {
      const result = await get_risk_assessment({}, mockContext);

      expect(typeof result.recommendation).toBe('string');
    });
  });

  describe('handles empty project', () => {
    it('returns empty summary for project with no files', async () => {
      const emptyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-risk-empty-'));
      const dataDir = path.join(emptyTempDir, '.omnysysdata');
      const risksDir = path.join(dataDir, 'risks');
      await fs.mkdir(risksDir, { recursive: true });
      
      await fs.writeFile(
        path.join(dataDir, 'index.json'),
        JSON.stringify({ projectPath: emptyTempDir, fileIndex: {} })
      );
      
      await fs.writeFile(
        path.join(risksDir, 'assessment.json'),
        JSON.stringify({
          report: {
            summary: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
            criticalRiskFiles: [],
            highRiskFiles: []
          }
        })
      );

      const result = await get_risk_assessment({}, { projectPath: emptyTempDir });

      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.totalIssues).toBe(0);
      expect(result.topRiskFiles).toEqual([]);

      await fs.rm(emptyTempDir, { recursive: true, force: true });
    });

    it('returns acceptable recommendation for clean project', async () => {
      const result = await get_risk_assessment({}, mockContext);

      expect(result.recommendation).toContain('acceptable');
    });
  });

  describe('recommendation logic', () => {
    it('returns critical warning for critical issues', async () => {
      const criticalTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-risk-critical-'));
      const dataDir = path.join(criticalTempDir, '.omnysysdata');
      const risksDir = path.join(dataDir, 'risks');
      await fs.mkdir(risksDir, { recursive: true });
      
      await fs.writeFile(
        path.join(dataDir, 'index.json'),
        JSON.stringify({ projectPath: criticalTempDir, fileIndex: {} })
      );
      
      await fs.writeFile(
        path.join(risksDir, 'assessment.json'),
        JSON.stringify({
          report: {
            summary: { criticalCount: 3, highCount: 0, mediumCount: 0, lowCount: 0 },
            criticalRiskFiles: [],
            highRiskFiles: []
          }
        })
      );

      const result = await get_risk_assessment({}, { projectPath: criticalTempDir });

      expect(result.recommendation).toContain('Critical');

      await fs.rm(criticalTempDir, { recursive: true, force: true });
    });

    it('returns warning for multiple high-risk files', async () => {
      const highTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-risk-high-'));
      const dataDir = path.join(highTempDir, '.omnysysdata');
      const risksDir = path.join(dataDir, 'risks');
      await fs.mkdir(risksDir, { recursive: true });
      
      await fs.writeFile(
        path.join(dataDir, 'index.json'),
        JSON.stringify({ projectPath: highTempDir, fileIndex: {} })
      );
      
      await fs.writeFile(
        path.join(risksDir, 'assessment.json'),
        JSON.stringify({
          report: {
            summary: { criticalCount: 0, highCount: 8, mediumCount: 0, lowCount: 0 },
            criticalRiskFiles: [],
            highRiskFiles: []
          }
        })
      );

      const result = await get_risk_assessment({}, { projectPath: highTempDir });

      expect(result.recommendation).toContain('high-risk');

      await fs.rm(highTempDir, { recursive: true, force: true });
    });

    it('returns medium warning for several medium-risk files', async () => {
      const mediumTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-risk-medium-'));
      const dataDir = path.join(mediumTempDir, '.omnysysdata');
      const risksDir = path.join(dataDir, 'risks');
      await fs.mkdir(risksDir, { recursive: true });
      
      await fs.writeFile(
        path.join(dataDir, 'index.json'),
        JSON.stringify({ projectPath: mediumTempDir, fileIndex: {} })
      );
      
      await fs.writeFile(
        path.join(risksDir, 'assessment.json'),
        JSON.stringify({
          report: {
            summary: { criticalCount: 0, highCount: 0, mediumCount: 15, lowCount: 0 },
            criticalRiskFiles: [],
            highRiskFiles: []
          }
        })
      );

      const result = await get_risk_assessment({}, { projectPath: mediumTempDir });

      expect(result.recommendation).toContain('medium-risk');

      await fs.rm(mediumTempDir, { recursive: true, force: true });
    });
  });

  describe('risk factors detection', () => {
    it('detects high-coupling files', async () => {
      const result = await get_risk_assessment({}, mockContext);

      const coupledFile = result.topRiskFiles.find(f => f.file === 'src/highly-coupled.js');
      expect(coupledFile).toBeDefined();
      expect(coupledFile.factors).toContain('high-coupling');
    });

    it('detects orphan modules', async () => {
      const result = await get_risk_assessment({}, mockContext);

      const orphanFile = result.topRiskFiles.find(f => f.file === 'src/orphan.js');
      expect(orphanFile).toBeDefined();
      expect(orphanFile.factors).toContain('orphan-module');
    });
  });

  describe('error handling', () => {
    it('handles missing metadata gracefully', async () => {
      const emptyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-risk-nodata-'));

      const result = await get_risk_assessment({}, { projectPath: emptyTempDir });

      expect(result).toBeDefined();
      expect(result.summary.totalFiles).toBe(0);

      await fs.rm(emptyTempDir, { recursive: true, force: true });
    });
  });
});
