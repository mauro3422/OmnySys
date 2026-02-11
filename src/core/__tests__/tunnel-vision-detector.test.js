/**
 * @fileoverview Tests for tunnel-vision-detector.js
 * 
 * @module core/__tests__/tunnel-vision-detector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectTunnelVision,
  formatAlert,
  getStats,
  cleanupHistory,
  getModificationHistory
} from '../tunnel-vision-detector.js';

// Mock the query APIs (using new specialized APIs instead of deprecated facade)
vi.mock('../../layer-a-static/query/apis/file-api.js', () => ({
  getAtomDetails: vi.fn(),
  getFileAnalysisWithAtoms: vi.fn()
}));

import { getAtomDetails, getFileAnalysisWithAtoms } from '../../layer-a-static/query/apis/file-api.js';

describe('tunnel-vision-detector', () => {
  beforeEach(() => {
    cleanupHistory();
    vi.clearAllMocks();
  });
  
  describe('detectTunnelVision (atomic mode)', () => {
    it('should detect tunnel vision for modified atom with unmodified callers', async () => {
      const mockAtom = {
        name: 'fetchData',
        complexity: 15,
        isExported: true,
        isAsync: true,
        hasSideEffects: true,
        calledBy: ['src/components/User.jsx::loadUser', 'src/pages/Profile.jsx::init'],
        archetype: { type: 'hot-path', severity: 7 }
      };
      
      getAtomDetails.mockResolvedValue(mockAtom);
      
      const result = await detectTunnelVision(
        '/project',
        'src/api.js',
        'fetchData'
      );
      
      expect(result).toBeDefined();
      expect(result.type).toBe('TUNNEL_VISION_ATOMIC');
      expect(result.modifiedAtom).toBe('src/api.js::fetchData');
      expect(result.callers.total).toBe(2);
      expect(result.callers.unmodified).toBe(2);
    });
    
    it('should return null when no unmodified callers', async () => {
      const mockAtom = {
        name: 'simpleFunc',
        complexity: 5,
        isExported: true,
        calledBy: ['src/other.js::caller'],
        archetype: { type: 'standard', severity: 1 }
      };
      
      getAtomDetails.mockResolvedValue(mockAtom);
      
      const result = await detectTunnelVision(
        '/project',
        'src/simple.js',
        'simpleFunc'
      );
      
      // With only 1 caller (below MIN_UNMODIFIED_DEPENDENTS = 2), should return null
      expect(result).toBeNull();
    });
    
    it('should return null when atom not found', async () => {
      getAtomDetails.mockResolvedValue(null);
      
      const result = await detectTunnelVision(
        '/project',
        'src/notfound.js',
        'missingFunc'
      );
      
      expect(result).toBeNull();
    });
    
    it('should calculate CRITICAL severity for god-functions', async () => {
      const mockAtom = {
        name: 'processEverything',
        complexity: 35,
        isExported: true,
        calledBy: [
          'src/a.js::func1',
          'src/b.js::func2',
          'src/c.js::func3',
          'src/d.js::func4',
          'src/e.js::func5',
          'src/f.js::func6',
          'src/g.js::func7',
          'src/h.js::func8'
        ],
        archetype: { type: 'god-function', severity: 9 }
      };
      
      getAtomDetails.mockResolvedValue(mockAtom);
      
      const result = await detectTunnelVision(
        '/project',
        'src/god.js',
        'processEverything'
      );
      
      expect(result.severity).toBe('CRITICAL');
    });
  });
  
  describe('detectTunnelVision (file mode)', () => {
    it('should detect tunnel vision for all exported atoms in file', async () => {
      const mockFileData = {
        atoms: [
          {
            name: 'exported1',
            id: 'src/api.js::exported1',
            isExported: true,
            calledBy: ['src/a.js::caller1', 'src/b.js::caller2', 'src/c.js::caller3'],
            complexity: 10,
            archetype: { type: 'standard', severity: 1 }
          },
          {
            name: 'exported2',
            id: 'src/api.js::exported2',
            isExported: true,
            calledBy: ['src/d.js::caller4'],
            complexity: 5,
            archetype: { type: 'standard', severity: 1 }
          },
          {
            name: 'internal',
            id: 'src/api.js::internal',
            isExported: false,
            calledBy: [],
            complexity: 3
          }
        ]
      };
      
      getFileAnalysisWithAtoms.mockResolvedValue(mockFileData);
      
      const result = await detectTunnelVision('/project', 'src/api.js');
      
      expect(result).toBeDefined();
      expect(result.type).toBe('TUNNEL_VISION_FILE');
      expect(result.atomsModified.count).toBe(1); // Only exported1 has 3+ callers
    });
    
    it('should return null for file without atoms', async () => {
      getFileAnalysisWithAtoms.mockResolvedValue({ atoms: [] });
      
      const result = await detectTunnelVision('/project', 'src/empty.js');
      
      expect(result).toBeNull();
    });
    
    it('should return null when file data not found', async () => {
      getFileAnalysisWithAtoms.mockResolvedValue(null);
      
      const result = await detectTunnelVision('/project', 'src/notfound.js');
      
      expect(result).toBeNull();
    });
  });
  
  describe('formatAlert', () => {
    it('should format atomic alert correctly', () => {
      const alert = {
        type: 'TUNNEL_VISION_ATOMIC',
        severity: 'HIGH',
        modifiedAtom: 'src/api.js::fetchData',
        filePath: 'src/api.js',
        functionName: 'fetchData',
        atom: {
          name: 'fetchData',
          complexity: 15,
          archetype: { type: 'hot-path' },
          isExported: true
        },
        callers: {
          total: 5,
          unmodified: 4,
          list: ['src/a.js::caller1', 'src/b.js::caller2']
        },
        recommendations: ['Test this!', 'Be careful!']
      };
      
      const formatted = formatAlert(alert);
      
      expect(formatted).toContain('TUNNEL VISION MOLECULAR');
      expect(formatted).toContain('fetchData');
      expect(formatted).toContain('HIGH');
      expect(formatted).toContain('hot-path');
    });
    
    it('should format file alert correctly', () => {
      const alert = {
        type: 'TUNNEL_VISION_FILE',
        severity: 'MEDIUM',
        filePath: 'src/api.js',
        atomsModified: {
          count: 2,
          list: ['func1', 'func2']
        },
        callers: {
          totalAffected: 6
        },
        recommendations: ['Review all!']
      };
      
      const formatted = formatAlert(alert);
      
      expect(formatted).toContain('TUNNEL VISION MOLECULAR');
      expect(formatted).toContain('src/api.js');
      expect(formatted).toContain('2');
    });
    
    it('should return empty string for null alert', () => {
      expect(formatAlert(null)).toBe('');
    });
  });
  
  describe('getStats', () => {
    it('should return correct stats', () => {
      const stats = getStats();
      
      expect(stats.version).toBe('3.0');
      expect(stats.architecture).toBe('molecular');
      expect(stats.minThreshold).toBe(2);
      expect(stats.recentlyModifiedCount).toBe(0);
    });
  });
  
  describe('cleanupHistory', () => {
    it('should remove old modifications', async () => {
      // First, add some modifications
      const mockAtom = {
        name: 'func',
        isExported: true,
        calledBy: ['a::b', 'c::d'],
        archetype: { type: 'standard' }
      };
      getAtomDetails.mockResolvedValue(mockAtom);
      
      await detectTunnelVision('/project', 'src/test.js', 'func');
      
      // Modify the timestamp to be old
      const history = getModificationHistory();
      expect(history).toHaveLength(1);
      
      // Cleanup should not remove recent items
      cleanupHistory();
      expect(getModificationHistory()).toHaveLength(1);
    });
  });
});
