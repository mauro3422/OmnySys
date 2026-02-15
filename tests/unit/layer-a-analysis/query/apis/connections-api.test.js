/**
 * @fileoverview Connections API Tests
 * 
 * Tests for semantic connections query operations.
 * 
 * @module tests/unit/layer-a-analysis/query/apis/connections-api
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllConnections
} from '#layer-a/query/apis/connections-api.js';
import { ConnectionBuilder } from '../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/readers/json-reader.js', () => ({
  readJSON: vi.fn(),
  fileExists: vi.fn()
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  getDataDirectory: vi.fn((projectPath) => `${projectPath}/.omnysysdata`)
}));

describe('Connections API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getAllConnections function', () => {
      expect(typeof getAllConnections).toBe('function');
    });

    it('should accept project root as parameter', () => {
      expect(getAllConnections.length).toBe(1);
    });

    it('should return Promise', async () => {
      const { fileExists } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(false);

      const result = getAllConnections('/test/project');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getAllConnections', () => {
    it('should return connections object', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [], total: 0 })
        .mockResolvedValueOnce({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(result).toHaveProperty('sharedState');
      expect(result).toHaveProperty('eventListeners');
      expect(result).toHaveProperty('total');
    });

    it('should return arrays for connection types', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [], total: 0 })
        .mockResolvedValueOnce({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(Array.isArray(result.sharedState)).toBe(true);
      expect(Array.isArray(result.eventListeners)).toBe(true);
    });

    it('should return numeric total', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [{}], total: 1 })
        .mockResolvedValueOnce({ connections: [{}], total: 1 });

      const result = await getAllConnections('/test/project');
      
      expect(typeof result.total).toBe('number');
      expect(result.total).toBe(2);
    });

    it('should read shared-state connections', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const connections = ConnectionBuilder.create()
        .withSharedStateConnection({
          source: 'src/store.js',
          target: 'src/component.js',
          variable: 'appState'
        })
        .build();
      
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: connections.sharedState, total: 1 })
        .mockResolvedValueOnce({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(result.sharedState).toHaveLength(1);
      expect(result.sharedState[0].variable).toBe('appState');
    });

    it('should read event listener connections', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const connections = ConnectionBuilder.create()
        .withEventListener({
          source: 'src/button.js',
          target: 'src/handler.js',
          event: 'click'
        })
        .build();
      
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [], total: 0 })
        .mockResolvedValueOnce({ connections: connections.eventListeners, total: 1 });

      const result = await getAllConnections('/test/project');
      
      expect(result.eventListeners).toHaveLength(1);
      expect(result.eventListeners[0].event).toBe('click');
    });

    it('should handle missing shared-state file', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      readJSON.mockResolvedValue({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(result.sharedState).toHaveLength(0);
      expect(Array.isArray(result.sharedState)).toBe(true);
    });

    it('should handle missing event-listeners file', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      readJSON.mockResolvedValue({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(result.eventListeners).toHaveLength(0);
      expect(Array.isArray(result.eventListeners)).toBe(true);
    });

    it('should handle both files missing', async () => {
      const { fileExists } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(false);

      const result = await getAllConnections('/test/project');
      
      expect(result.sharedState).toHaveLength(0);
      expect(result.eventListeners).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle multiple connections', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const connections = ConnectionBuilder.create()
        .withSharedState(3)
        .withEventListeners(2)
        .build();
      
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: connections.sharedState, total: 3 })
        .mockResolvedValueOnce({ connections: connections.eventListeners, total: 2 });

      const result = await getAllConnections('/test/project');
      
      expect(result.sharedState).toHaveLength(3);
      expect(result.eventListeners).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should handle malformed connection data', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: null, total: 0 })
        .mockResolvedValueOnce({ connections: undefined, total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(Array.isArray(result.sharedState)).toBe(true);
      expect(Array.isArray(result.eventListeners)).toBe(true);
      expect(result.sharedState).toHaveLength(0);
      expect(result.eventListeners).toHaveLength(0);
    });
  });

  describe('Error Handling Contract', () => {
    it('should propagate readJSON errors gracefully', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(getAllConnections('/test/project')).rejects.toThrow('Read failed');
    });

    it('should handle partial file read failures', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [], total: 0 })
        .mockRejectedValueOnce(new Error('Read failed'));

      await expect(getAllConnections('/test/project')).rejects.toThrow('Read failed');
    });
  });

  describe('Connection Properties', () => {
    it('should preserve connection properties', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({
          connections: [{
            source: 'src/a.js',
            target: 'src/b.js',
            type: 'shared-state',
            variable: 'state',
            line: 10
          }],
          total: 1
        })
        .mockResolvedValueOnce({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      const conn = result.sharedState[0];
      expect(conn.source).toBe('src/a.js');
      expect(conn.target).toBe('src/b.js');
      expect(conn.type).toBe('shared-state');
      expect(conn.variable).toBe('state');
      expect(conn.line).toBe(10);
    });
  });
});
