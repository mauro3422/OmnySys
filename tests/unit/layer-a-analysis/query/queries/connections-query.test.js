/**
 * @fileoverview Connections Query Tests
 * 
 * Tests for semantic connections query implementations.
 * 
 * @module tests/unit/layer-a-analysis/query/queries/connections-query
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllConnections
} from '#layer-a/query/queries/connections-query.js';
import { ConnectionBuilder } from '../../../../factories/query-test.factory.js';

vi.mock('#layer-a/query/readers/json-reader.js', () => ({
  readJSON: vi.fn(),
  fileExists: vi.fn()
}));

vi.mock('#layer-a/storage/storage-manager.js', () => ({
  getDataDirectory: vi.fn((projectPath) => `${projectPath}/.omnysysdata`)
}));

describe('Connections Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure Contract', () => {
    it('should export getAllConnections function', () => {
      expect(typeof getAllConnections).toBe('function');
    });

    it('should accept rootPath parameter', () => {
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
    it('should read from connections directory', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON.mockResolvedValue({ connections: [], total: 0 });

      await getAllConnections('/test/project');
      
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('shared-state.json')
      );
      expect(readJSON).toHaveBeenCalledWith(
        expect.stringContaining('event-listeners.json')
      );
    });

    it('should return combined connections', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      const connections = ConnectionBuilder.create()
        .withSharedState(2)
        .withEventListeners(3)
        .build();
      
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: connections.sharedState, total: 2 })
        .mockResolvedValueOnce({ connections: connections.eventListeners, total: 3 });

      const result = await getAllConnections('/test/project');
      
      expect(result.sharedState).toHaveLength(2);
      expect(result.eventListeners).toHaveLength(3);
      expect(result.total).toBe(5);
    });

    it('should handle missing shared-state file', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      readJSON.mockResolvedValue({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(result.sharedState).toEqual([]);
      expect(Array.isArray(result.sharedState)).toBe(true);
    });

    it('should handle missing event-listeners file', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      readJSON.mockResolvedValue({ connections: [], total: 0 });

      const result = await getAllConnections('/test/project');
      
      expect(result.eventListeners).toEqual([]);
      expect(Array.isArray(result.eventListeners)).toBe(true);
    });

    it('should handle both files missing', async () => {
      const { fileExists } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(false);

      const result = await getAllConnections('/test/project');
      
      expect(result.sharedState).toEqual([]);
      expect(result.eventListeners).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle null connections in files', async () => {
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

    it('should calculate total correctly', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [{}], total: 2 })
        .mockResolvedValueOnce({ connections: [{}], total: 1 });

      const result = await getAllConnections('/test/project');
      
      expect(result.total).toBe(3);
    });

    it('should default total to 0 when missing', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [{}, {}] })  // 2 items, no total
        .mockResolvedValueOnce({ connections: [{}] });      // 1 item, no total

      const result = await getAllConnections('/test/project');
      
      // Should use connections.length when total is missing
      expect(result.total).toBe(3);
    });
  });

  describe('Connection Properties', () => {
    it('should preserve all connection fields', async () => {
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

    it('should handle event listener connections', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON
        .mockResolvedValueOnce({ connections: [], total: 0 })
        .mockResolvedValueOnce({
          connections: [{
            source: 'src/button.js',
            target: 'src/handler.js',
            event: 'click',
            type: 'event-listener',
            line: 10
          }],
          total: 1
        });

      const result = await getAllConnections('/test/project');
      
      expect(result.eventListeners).toHaveLength(1);
      expect(result.eventListeners[0].event).toBe('click');
    });
  });

  describe('Error Handling Contract', () => {
    it('should propagate read errors', async () => {
      const { fileExists, readJSON } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockResolvedValue(true);
      readJSON.mockRejectedValue(new Error('Read failed'));

      await expect(getAllConnections('/test/project')).rejects.toThrow('Read failed');
    });

    it('should handle fileExists errors', async () => {
      const { fileExists } = await import('#layer-a/query/readers/json-reader.js');
      fileExists.mockRejectedValue(new Error('Stat failed'));

      await expect(getAllConnections('/test/project')).rejects.toThrow('Stat failed');
    });
  });
});
