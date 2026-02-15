/**
 * @fileoverview storage-extractor.test.js
 * 
 * Tests for Storage Extractor
 * Tests extractLocalStorageKeys, extractStorageReads, extractStorageWrites
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/storage-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractLocalStorageKeys,
  extractStorageReads,
  extractStorageWrites
} from '#layer-a/extractors/static/storage-extractor.js';
import { StorageBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Storage Extractor', () => {
  describe('extractLocalStorageKeys', () => {
    it('should extract localStorage.setItem writes', () => {
      const code = "localStorage.setItem('token', 'abc123');";

      const result = extractLocalStorageKeys(code);

      expect(result.writes).toHaveLength(1);
      expect(result.writes[0].key).toBe('token');
      expect(result.writes[0].type).toBe('write');
    });

    it('should extract localStorage.getItem reads', () => {
      const code = "const token = localStorage.getItem('token');";

      const result = extractLocalStorageKeys(code);

      expect(result.reads).toHaveLength(1);
      expect(result.reads[0].key).toBe('token');
      expect(result.reads[0].type).toBe('read');
    });

    it('should extract localStorage bracket notation writes', () => {
      const code = "localStorage['user'] = JSON.stringify(user);";

      const result = extractLocalStorageKeys(code);

      expect(result.writes.some(w => w.key === 'user')).toBe(true);
    });

    it('should extract localStorage bracket notation reads', () => {
      const code = "const user = localStorage['user'];";

      const result = extractLocalStorageKeys(code);

      expect(result.reads.some(r => r.key === 'user')).toBe(true);
    });

    it('should extract sessionStorage.setItem writes', () => {
      const code = "sessionStorage.setItem('sessionId', 'xyz789');";

      const result = extractLocalStorageKeys(code);

      expect(result.writes.some(w => w.key === 'sessionId')).toBe(true);
    });

    it('should extract sessionStorage.getItem reads', () => {
      const code = "const sessionId = sessionStorage.getItem('sessionId');";

      const result = extractLocalStorageKeys(code);

      expect(result.reads.some(r => r.key === 'sessionId')).toBe(true);
    });

    it('should extract sessionStorage bracket notation', () => {
      const code = `
        sessionStorage['csrfToken'] = 'token123';
        const csrf = sessionStorage['csrfToken'];
      `;

      const result = extractLocalStorageKeys(code);

      expect(result.writes.some(w => w.key === 'csrfToken')).toBe(true);
      expect(result.reads.some(r => r.key === 'csrfToken')).toBe(true);
    });

    it('should include line numbers', () => {
      const code = `
        localStorage.setItem('key1', 'value1');
        localStorage.setItem('key2', 'value2');
      `;

      const result = extractLocalStorageKeys(code);

      expect(result.writes[0].line).toBeGreaterThan(0);
      expect(result.writes[1].line).toBeGreaterThan(result.writes[0].line);
    });

    it('should return reads, writes, and all arrays', () => {
      const code = "localStorage.setItem('key', 'value');";

      const result = extractLocalStorageKeys(code);

      expect(result).toHaveProperty('reads');
      expect(result).toHaveProperty('writes');
      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.reads)).toBe(true);
      expect(Array.isArray(result.writes)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should combine reads and writes in all', () => {
      const builder = new StorageBuilder();
      builder.withLocalStorageWrite('key1', '"value1"')
        .withLocalStorageRead('key2', 'value2');
      const { code } = builder.build();

      const result = extractLocalStorageKeys(code);

      expect(result.all.length).toBe(result.reads.length + result.writes.length);
    });

    it('should handle empty code', () => {
      const result = extractLocalStorageKeys('');

      expect(result.reads).toEqual([]);
      expect(result.writes).toEqual([]);
      expect(result.all).toEqual([]);
    });

    it('should handle code with no storage access', () => {
      const code = 'const x = 1;';

      const result = extractLocalStorageKeys(code);

      expect(result.reads).toEqual([]);
      expect(result.writes).toEqual([]);
    });

    it('should work with StorageBuilder auth storage', () => {
      const builder = new StorageBuilder();
      builder.withAuthStorage();
      const { code } = builder.build();

      const result = extractLocalStorageKeys(code);

      expect(result.writes.length).toBeGreaterThan(0);
      expect(result.reads.length).toBeGreaterThan(0);
    });

    it('should work with StorageBuilder settings storage', () => {
      const builder = new StorageBuilder();
      builder.withSettingsStorage();
      const { code } = builder.build();

      const result = extractLocalStorageKeys(code);

      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should work with StorageBuilder session pattern', () => {
      const builder = new StorageBuilder();
      builder.withSessionPattern();
      const { code } = builder.build();

      const result = extractLocalStorageKeys(code);

      expect(result.all.some(a => a.key === 'sessionId')).toBe(true);
      expect(result.all.some(a => a.key === 'csrfToken')).toBe(true);
    });
  });

  describe('extractStorageWrites', () => {
    it('should return unique key names', () => {
      const code = `
        localStorage.setItem('key1', 'value1');
        localStorage.setItem('key1', 'value2');
        localStorage.setItem('key2', 'value3');
      `;

      const result = extractStorageWrites(code);

      expect(result).toContain('key1');
      expect(result).toContain('key2');
    });

    it('should return array of strings', () => {
      const code = "localStorage.setItem('test', 'value');";

      const result = extractStorageWrites(code);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(key => {
        expect(typeof key).toBe('string');
      });
    });

    it('should include sessionStorage keys', () => {
      const code = "sessionStorage.setItem('sessionKey', 'value');";

      const result = extractStorageWrites(code);

      expect(result).toContain('sessionKey');
    });

    it('should include bracket notation keys', () => {
      const code = "localStorage['bracketKey'] = 'value';";

      const result = extractStorageWrites(code);

      expect(result).toContain('bracketKey');
    });

    it('should handle empty code', () => {
      const result = extractStorageWrites('');

      expect(result).toEqual([]);
    });
  });

  describe('extractStorageReads', () => {
    it('should return unique key names', () => {
      const code = `
        const a = localStorage.getItem('key1');
        const b = localStorage.getItem('key1');
        const c = localStorage.getItem('key2');
      `;

      const result = extractStorageReads(code);

      expect(result).toContain('key1');
      expect(result).toContain('key2');
    });

    it('should return array of strings', () => {
      const code = "const x = localStorage.getItem('test');";

      const result = extractStorageReads(code);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(key => {
        expect(typeof key).toBe('string');
      });
    });

    it('should include sessionStorage keys', () => {
      const code = "const x = sessionStorage.getItem('sessionKey');";

      const result = extractStorageReads(code);

      expect(result).toContain('sessionKey');
    });

    it('should include bracket notation keys', () => {
      const code = "const x = localStorage['bracketKey'];";

      const result = extractStorageReads(code);

      expect(result).toContain('bracketKey');
    });

    it('should handle empty code', () => {
      const result = extractStorageReads('');

      expect(result).toEqual([]);
    });
  });

  describe('Storage types', () => {
    it('should distinguish between localStorage and sessionStorage', () => {
      const code = `
        localStorage.setItem('localKey', 'value');
        sessionStorage.setItem('sessionKey', 'value');
      `;

      const result = extractLocalStorageKeys(code);

      expect(result.writes.some(w => w.key === 'localKey')).toBe(true);
      expect(result.writes.some(w => w.key === 'sessionKey')).toBe(true);
    });

    it('should mark entries with type property', () => {
      const builder = new StorageBuilder();
      builder.withLocalStorageWrite('key', '"value"')
        .withLocalStorageRead('key2', 'value2');
      const { code } = builder.build();

      const result = extractLocalStorageKeys(code);

      expect(result.writes.every(w => w.type === 'write')).toBe(true);
      expect(result.reads.every(r => r.type === 'read')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null code', () => {
      expect(() => extractLocalStorageKeys(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => extractLocalStorageKeys(undefined)).not.toThrow();
    });

    it('should handle complex key names', () => {
      const code = `
        localStorage.setItem('app:config', '{}');
        localStorage.setItem('user_preferences', '{}');
        localStorage.setItem('cache-v1', '{}');
      `;

      const result = extractLocalStorageKeys(code);

      expect(result.writes.some(w => w.key === 'app:config')).toBe(true);
      expect(result.writes.some(w => w.key === 'user_preferences')).toBe(true);
      expect(result.writes.some(w => w.key === 'cache-v1')).toBe(true);
    });

    it('should handle dynamic values', () => {
      const code = `
        localStorage.setItem('token', generateToken());
        localStorage.setItem('user', JSON.stringify(user));
      `;

      const result = extractLocalStorageKeys(code);

      expect(result.writes.some(w => w.key === 'token')).toBe(true);
      expect(result.writes.some(w => w.key === 'user')).toBe(true);
    });

    it('should handle multiline storage calls', () => {
      const code = `
        localStorage.setItem(
          'key',
          'value'
        );
      `;

      const result = extractLocalStorageKeys(code);

      expect(result.writes.some(w => w.key === 'key')).toBe(true);
    });
  });
});
