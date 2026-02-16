/**
 * @fileoverview Tests for build-time-deps.js extractor
 * 
 * @module tests/build-time-deps
 */

import { describe, it, expect } from 'vitest';
import { extractBuildTimeDependencies } from '#layer-a/extractors/metadata/build-time-deps.js';

describe('build-time-deps', () => {
  describe('basic structure', () => {
    it('should export extractBuildTimeDependencies function', () => {
      expect(typeof extractBuildTimeDependencies).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractBuildTimeDependencies('');
      expect(result).toHaveProperty('envVars');
      expect(result).toHaveProperty('devFlags');
      expect(result).toHaveProperty('platformChecks');
      expect(result).toHaveProperty('featureFlags');
      expect(result).toHaveProperty('deadCodeCandidates');
      expect(result).toHaveProperty('all');
    });
  });

  describe('environment variable detection', () => {
    it('should detect process.env variables', () => {
      const code = 'const apiUrl = process.env.API_URL;';
      const result = extractBuildTimeDependencies(code);
      expect(result.envVars).toHaveLength(1);
      expect(result.envVars[0]).toMatchObject({
        type: 'env_var',
        name: 'API_URL'
      });
    });

    it('should detect import.meta.env variables', () => {
      const code = 'const key = import.meta.env.VITE_API_KEY;';
      const result = extractBuildTimeDependencies(code);
      expect(result.envVars).toHaveLength(1);
      expect(result.envVars[0].name).toBe('VITE_API_KEY');
    });

    it('should detect multiple env vars', () => {
      const code = `
        const a = process.env.A;
        const b = process.env.B;
        const c = import.meta.env.C;
      `;
      const result = extractBuildTimeDependencies(code);
      expect(result.envVars).toHaveLength(3);
    });

    it('should include line numbers for env vars', () => {
      const code = 'process.env.TEST';
      const result = extractBuildTimeDependencies(code);
      expect(result.envVars[0].line).toBeDefined();
      expect(typeof result.envVars[0].line).toBe('number');
    });
  });

  describe('build flag detection', () => {
    it('should detect __DEV__ flag', () => {
      const code = 'if (__DEV__) { console.log("debug"); }';
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags).toHaveLength(1);
      expect(result.devFlags[0]).toMatchObject({
        type: 'build_flag',
        name: 'DEV'
      });
    });

    it('should detect __PROD__ flag', () => {
      const code = 'const config = __PROD__ ? prodConfig : devConfig;';
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags.some(f => f.name === 'PROD')).toBe(true);
    });

    it('should detect __TEST__ flag', () => {
      const code = 'const mock = __TEST__ ? mockData : realData;';
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags.some(f => f.name === 'TEST')).toBe(true);
    });

    it('should detect __DEBUG__ flag', () => {
      const code = 'if (__DEBUG__) debugger;';
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags.some(f => f.name === 'DEBUG')).toBe(true);
    });

    it('should mark DEV/DEBUG as dead code candidates', () => {
      const code = 'if (__DEV__) { console.log("debug"); }';
      const result = extractBuildTimeDependencies(code);
      expect(result.deadCodeCandidates).toHaveLength(1);
      expect(result.deadCodeCandidates[0]).toMatchObject({
        type: 'dev_only_code',
        flag: 'DEV'
      });
    });
  });

  describe('NODE_ENV detection', () => {
    it('should detect NODE_ENV equality check', () => {
      const code = "if (process.env.NODE_ENV === 'development') { }";
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags).toHaveLength(1);
      expect(result.devFlags[0]).toMatchObject({
        type: 'node_env',
        value: 'development'
      });
    });

    it('should detect NODE_ENV with double equals', () => {
      const code = 'if (process.env.NODE_ENV == "production") { }';
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags[0].value).toBe('production');
    });
  });

  describe('platform check detection', () => {
    it('should detect window check', () => {
      const code = "if (typeof window !== 'undefined') { }";
      const result = extractBuildTimeDependencies(code);
      expect(result.platformChecks).toHaveLength(1);
      expect(result.platformChecks[0]).toMatchObject({
        type: 'platform_check',
        platform: 'window'
      });
    });

    it('should detect document check', () => {
      const code = "if (typeof document !== 'undefined') { }";
      const result = extractBuildTimeDependencies(code);
      expect(result.platformChecks[0].platform).toBe('document');
    });

    it('should detect global check', () => {
      const code = "if (typeof global !== 'undefined') { }";
      const result = extractBuildTimeDependencies(code);
      expect(result.platformChecks[0].platform).toBe('global');
    });

    it('should detect process check', () => {
      const code = "if (typeof process !== 'undefined') { }";
      const result = extractBuildTimeDependencies(code);
      expect(result.platformChecks[0].platform).toBe('process');
    });
  });

  describe('feature flag detection', () => {
    it('should detect flags.* pattern', () => {
      const code = 'if (flags.newFeature) { enableFeature(); }';
      const result = extractBuildTimeDependencies(code);
      expect(result.featureFlags).toHaveLength(1);
      expect(result.featureFlags[0]).toMatchObject({
        type: 'feature_flag',
        name: 'newFeature'
      });
    });

    it('should detect featureFlags.* pattern', () => {
      const code = 'const enabled = featureFlags.betaFeature;';
      const result = extractBuildTimeDependencies(code);
      expect(result.featureFlags[0].name).toBe('betaFeature');
    });

    it('should detect multiple feature flags', () => {
      const code = `
        const a = flags.featureA;
        const b = featureFlags.featureB;
      `;
      const result = extractBuildTimeDependencies(code);
      expect(result.featureFlags).toHaveLength(2);
    });
  });

  describe('debug detection', () => {
    it('should detect DEBUG usage', () => {
      const code = 'DEBUG && console.log("debug info");';
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags.some(f => f.name === 'DEBUG')).toBe(true);
    });

    it('should detect debug() call', () => {
      const code = 'debug("message");';
      const result = extractBuildTimeDependencies(code);
      expect(result.devFlags.some(f => f.type === 'debug_call')).toBe(true);
    });
  });

  describe('all array', () => {
    it('should combine all dependencies', () => {
      const code = `
        const url = process.env.API_URL;
        if (__DEV__) { }
        const check = typeof window !== 'undefined';
      `;
      const result = extractBuildTimeDependencies(code);
      const allCount = result.envVars.length + result.devFlags.length + result.platformChecks.length + result.featureFlags.length;
      expect(result.all.length).toBeGreaterThanOrEqual(allCount);
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractBuildTimeDependencies('');
      expect(result.envVars).toHaveLength(0);
      expect(result.devFlags).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should handle code without build-time deps', () => {
      const code = 'function simple() { return 42; }';
      const result = extractBuildTimeDependencies(code);
      expect(result.all).toHaveLength(0);
    });

    it('should handle complex real-world code', () => {
      const code = `
        const config = {
          apiUrl: process.env.API_URL,
          debug: __DEV__ || __DEBUG__,
          isBrowser: typeof window !== 'undefined'
        };
        
        if (flags.experimental) {
          enableExperimental();
        }
      `;
      const result = extractBuildTimeDependencies(code);
      expect(result.all.length).toBeGreaterThan(0);
    });
  });
});
