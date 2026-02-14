/**
 * @fileoverview config.test.js
 * 
 * Tests for configuration module
 */

import { describe, it, expect } from 'vitest';
import { 
  DATA_DIR, 
  getIndexPath, 
  getSystemMapPath,
  getDataPath 
} from '#config/paths.js';

import {
  BATCH,
  ANALYSIS,
  SERVER
} from '#config/limits.js';

import {
  FileChangeType,
  SemanticChangeType,
  Priority
} from '#config/change-types.js';

describe('Config - Paths', () => {
  it('DATA_DIR should be .omnysysdata', () => {
    expect(DATA_DIR).toBe('.omnysysdata');
  });

  it('getIndexPath should construct correct path', () => {
    const path = getIndexPath('/project');
    expect(path).toContain('.omnysysdata');
    expect(path).toContain('index.json');
  });

  it('getSystemMapPath should construct correct path', () => {
    const path = getSystemMapPath('/project');
    expect(path).toContain('system-map.json');
  });
});

describe('Config - Limits', () => {
  it('BATCH.SIZE should be defined', () => {
    expect(typeof BATCH.SIZE).toBe('number');
    expect(BATCH.SIZE).toBeGreaterThan(0);
  });

  it('ANALYSIS.TIMEOUT_MS should be defined', () => {
    expect(typeof ANALYSIS.TIMEOUT_MS).toBe('number');
  });

  it('SERVER.ORCHESTRATOR_PORT should be 9999', () => {
    expect(SERVER.ORCHESTRATOR_PORT).toBe(9999);
  });
});

describe('Config - Change Types', () => {
  it('FileChangeType should have CREATED, MODIFIED, DELETED', () => {
    expect(FileChangeType.CREATED).toBe('created');
    expect(FileChangeType.MODIFIED).toBe('modified');
    expect(FileChangeType.DELETED).toBe('deleted');
  });

  it('SemanticChangeType should have all levels', () => {
    expect(SemanticChangeType.CRITICAL).toBe('critical');
    expect(SemanticChangeType.SEMANTIC).toBe('semantic');
  });

  it('Priority should be ordered correctly', () => {
    expect(Priority.CRITICAL).toBeGreaterThan(Priority.HIGH);
    expect(Priority.HIGH).toBeGreaterThan(Priority.MEDIUM);
  });
});
