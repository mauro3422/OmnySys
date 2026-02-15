/**
 * @fileoverview colocation-extractor.test.js
 * 
 * Tests for Colocation Extractor
 * Tests detectColocatedFiles, getColocatedFilesFor, hasTestCompanion
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/colocation-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  detectColocatedFiles,
  getColocatedFilesFor,
  hasTestCompanion
} from '#layer-a/extractors/static/colocation-extractor.js';
import { ConnectionType } from '#layer-a/extractors/static/constants.js';

describe('Colocation Extractor', () => {
  describe('detectColocatedFiles', () => {
    it('should detect test companions (.test.js)', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].colocationType).toBe('test-companion');
    });

    it('should detect spec companions (.spec.js)', () => {
      const files = [
        'src/utils/helper.js',
        'src/utils/helper.spec.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].colocationType).toBe('test-companion');
    });

    it('should detect Storybook companions (.stories.js)', () => {
      const files = [
        'src/components/Card.jsx',
        'src/components/Card.stories.jsx'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.colocationType === 'storybook')).toBe(true);
    });

    it('should detect CSS module companions', () => {
      const files = [
        'src/components/Header.jsx',
        'src/components/Header.module.css'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.colocationType === 'css-module')).toBe(true);
    });

    it('should detect SCSS module companions', () => {
      const files = [
        'src/components/Footer.jsx',
        'src/components/Footer.module.scss'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.colocationType === 'css-module')).toBe(true);
    });

    it('should detect style file companions (.styles.js)', () => {
      const files = [
        'src/components/Modal.js',
        'src/components/Modal.styles.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.colocationType === 'style-file')).toBe(true);
    });

    it('should detect mock file companions (.mock.js)', () => {
      const files = [
        'src/services/api.js',
        'src/services/api.mock.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.colocationType === 'mock-file')).toBe(true);
    });

    it('should detect fixture companions (.fixture.js)', () => {
      const files = [
        'src/components/List.jsx',
        'src/components/List.fixture.jsx'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.colocationType === 'test-fixture')).toBe(true);
    });

    it('should create connection with correct structure', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections[0]).toHaveProperty('id');
      expect(connections[0]).toHaveProperty('sourceFile');
      expect(connections[0]).toHaveProperty('targetFile');
      expect(connections[0]).toHaveProperty('type');
      expect(connections[0]).toHaveProperty('via');
      expect(connections[0]).toHaveProperty('colocationType');
      expect(connections[0]).toHaveProperty('direction');
      expect(connections[0]).toHaveProperty('confidence');
      expect(connections[0]).toHaveProperty('reason');
    });

    it('should set correct connection type', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections[0].type).toBe(ConnectionType.COLOCATED);
    });

    it('should set via to naming-convention', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections[0].via).toBe('naming-convention');
    });

    it('should handle multiple colocated files', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js',
        'src/components/Button.stories.js',
        'src/components/Button.module.css'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.length).toBe(3);
    });

    it('should handle files in different directories', () => {
      const files = [
        'src/a/Button.js',
        'src/b/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);

      // Different directories should not match
      expect(connections).toEqual([]);
    });

    it('should return empty array for no matches', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Modal.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections).toEqual([]);
    });

    it('should handle empty file list', () => {
      const connections = detectColocatedFiles([]);

      expect(connections).toEqual([]);
    });

    it('should handle single file', () => {
      const connections = detectColocatedFiles(['src/components/Button.js']);

      expect(connections).toEqual([]);
    });
  });

  describe('getColocatedFilesFor', () => {
    it('should return connections for specific file', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js',
        'src/components/Modal.js',
        'src/components/Modal.test.js'
      ];

      const connections = getColocatedFilesFor('src/components/Button.js', files);

      expect(connections.length).toBe(1);
      expect(connections[0].sourceFile).toBe('src/components/Button.js');
    });

    it('should return connections where file is target', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = getColocatedFilesFor('src/components/Button.test.js', files);

      expect(connections.length).toBe(1);
      expect(connections[0].targetFile).toBe('src/components/Button.test.js');
    });

    it('should return empty array for file with no companions', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = getColocatedFilesFor('src/components/Modal.js', files);

      expect(connections).toEqual([]);
    });

    it('should return empty array for empty file list', () => {
      const connections = getColocatedFilesFor('src/test.js', []);

      expect(connections).toEqual([]);
    });
  });

  describe('hasTestCompanion', () => {
    it('should return true when file has test companion', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const result = hasTestCompanion('src/components/Button.js', files);

      expect(result).toBe(true);
    });

    it('should return true for spec companion', () => {
      const files = [
        'src/utils/helper.js',
        'src/utils/helper.spec.js'
      ];

      const result = hasTestCompanion('src/utils/helper.js', files);

      expect(result).toBe(true);
    });

    it('should return false when no test companion', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Modal.js'
      ];

      const result = hasTestCompanion('src/components/Button.js', files);

      expect(result).toBe(false);
    });

    it('should return false for test file itself', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      // Button.test.js doesn't have a Button.test.test.js
      const result = hasTestCompanion('src/components/Button.test.js', files);

      expect(result).toBe(false);
    });

    it('should return false for empty file list', () => {
      const result = hasTestCompanion('src/test.js', []);

      expect(result).toBe(false);
    });
  });

  describe('Directory patterns', () => {
    it('should detect files in __tests__ directory', () => {
      const files = [
        'src/components/Button.js',
        'src/components/__tests__/Button.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.via === 'directory-convention')).toBe(true);
      expect(connections.some(c => c.colocationType === 'test-companion')).toBe(true);
    });

    it('should detect files in __mocks__ directory', () => {
      const files = [
        'src/services/api.js',
        'src/services/__mocks__/api.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.via === 'directory-convention')).toBe(true);
      expect(connections.some(c => c.colocationType === 'mock-file')).toBe(true);
    });

    it('should detect files in __fixtures__ directory', () => {
      const files = [
        'src/components/Form.jsx',
        'src/components/__fixtures__/Form.jsx'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.via === 'directory-convention')).toBe(true);
      expect(connections.some(c => c.colocationType === 'test-fixture')).toBe(true);
    });

    it('should detect files in __stories__ directory', () => {
      const files = [
        'src/components/Card.jsx',
        'src/components/__stories__/Card.jsx'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.some(c => c.via === 'directory-convention')).toBe(true);
      expect(connections.some(c => c.colocationType === 'storybook')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle files with multiple dots in name', () => {
      const files = [
        'src/components/User.Profile.js',
        'src/components/User.Profile.test.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.length).toBeGreaterThan(0);
    });

    it('should handle different file extensions', () => {
      const files = [
        'src/components/Button.jsx',
        'src/components/Button.test.jsx'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.length).toBeGreaterThan(0);
    });

    it('should handle TypeScript files', () => {
      const files = [
        'src/components/Button.tsx',
        'src/components/Button.test.tsx'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.length).toBeGreaterThan(0);
    });

    it('should not create duplicate connections', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);
      const uniqueIds = new Set(connections.map(c => c.id));

      expect(uniqueIds.size).toBe(connections.length);
    });

    it('should handle absolute paths', () => {
      const files = [
        '/project/src/components/Button.js',
        '/project/src/components/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections.length).toBeGreaterThan(0);
    });
  });

  describe('Connection direction', () => {
    it('should include direction description', () => {
      const files = [
        'src/components/Button.js',
        'src/components/Button.test.js'
      ];

      const connections = detectColocatedFiles(files);

      expect(connections[0].direction).toContain('Button.js');
      expect(connections[0].direction).toContain('Button.test.js');
    });
  });
});
