/**
 * @fileoverview Tests for dependency-depth.js extractor
 * 
 * @module tests/dependency-depth
 */

import { describe, it, expect } from 'vitest';
import { extractDependencyDepth } from '#layer-a/extractors/metadata/dependency-depth.js';

describe('dependency-depth', () => {
  describe('basic structure', () => {
    it('should export extractDependencyDepth function', () => {
      expect(typeof extractDependencyDepth).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractDependencyDepth('');
      expect(result).toHaveProperty('importCount');
      expect(result).toHaveProperty('localImportCount');
      expect(result).toHaveProperty('npmImportCount');
      expect(result).toHaveProperty('dynamicImportCount');
      expect(result).toHaveProperty('reExportCount');
      expect(result).toHaveProperty('importChainIndicators');
      expect(result).toHaveProperty('depthScore');
    });
  });

  describe('import detection', () => {
    it('should count total imports', () => {
      const code = `
        import a from './a.js';
        import b from './b.js';
      `;
      const result = extractDependencyDepth(code);
      expect(result.importCount).toBe(2);
    });

    it('should detect default imports', () => {
      const code = 'import React from "react";';
      const result = extractDependencyDepth(code);
      expect(result.importCount).toBe(1);
    });

    it('should detect named imports', () => {
      const code = 'import { useState, useEffect } from "react";';
      const result = extractDependencyDepth(code);
      expect(result.importCount).toBe(1);
    });

    it('should detect namespace imports', () => {
      const code = 'import * as utils from "./utils.js";';
      const result = extractDependencyDepth(code);
      expect(result.importCount).toBe(1);
    });
  });

  describe('local import detection', () => {
    it('should detect relative imports', () => {
      const code = `
        import a from './local.js';
        import b from '../parent.js';
      `;
      const result = extractDependencyDepth(code);
      expect(result.localImportCount).toBe(2);
    });

    it('should detect index file imports', () => {
      const code = 'import { a } from "./components/index.js";';
      const result = extractDependencyDepth(code);
      expect(result.localImportCount).toBe(1);
      expect(result.importChainIndicators).toHaveLength(1);
      expect(result.importChainIndicators[0]).toMatchObject({
        reason: 'index-file'
      });
    });

    it('should detect shorthand index imports', () => {
      const code = 'import { a } from "./components/index";';
      const result = extractDependencyDepth(code);
      expect(result.importChainIndicators.some(i => i.reason === 'index-file')).toBe(true);
    });
  });

  describe('npm import detection', () => {
    it('should detect package imports', () => {
      const code = `
        import lodash from 'lodash';
        import React from 'react';
      `;
      const result = extractDependencyDepth(code);
      expect(result.npmImportCount).toBe(2);
    });

    it('should not count node: prefixed imports as npm', () => {
      const code = 'import fs from "node:fs";';
      const result = extractDependencyDepth(code);
      expect(result.npmImportCount).toBe(0);
    });

    it('should distinguish local from npm imports', () => {
      const code = `
        import local from './local.js';
        import npm from 'some-package';
      `;
      const result = extractDependencyDepth(code);
      expect(result.localImportCount).toBe(1);
      expect(result.npmImportCount).toBe(1);
    });
  });

  describe('dynamic import detection', () => {
    it('should detect dynamic imports', () => {
      const code = 'const module = await import("./dynamic.js");';
      const result = extractDependencyDepth(code);
      expect(result.dynamicImportCount).toBe(1);
    });

    it('should detect multiple dynamic imports', () => {
      const code = `
        const a = await import('./a.js');
        const b = await import('./b.js');
      `;
      const result = extractDependencyDepth(code);
      expect(result.dynamicImportCount).toBe(2);
    });

    it('should detect import() in expressions', () => {
      const code = 'import("./lazy.js").then(m => m.default);';
      const result = extractDependencyDepth(code);
      expect(result.dynamicImportCount).toBe(1);
    });
  });

  describe('re-export detection', () => {
    it('should detect star re-exports', () => {
      const code = 'export * from "./module.js";';
      const result = extractDependencyDepth(code);
      expect(result.reExportCount).toBe(1);
    });

    it('should detect named re-exports', () => {
      const code = 'export { a, b } from "./module.js";';
      const result = extractDependencyDepth(code);
      expect(result.reExportCount).toBe(1);
    });

    it('should mark re-exports as chain indicators', () => {
      const code = 'export { a } from "./module.js";';
      const result = extractDependencyDepth(code);
      expect(result.importChainIndicators).toHaveLength(1);
      expect(result.importChainIndicators[0]).toMatchObject({
        reason: 're-export'
      });
    });

    it('should detect multiple re-exports', () => {
      const code = `
        export * from "./a.js";
        export { b } from "./b.js";
      `;
      const result = extractDependencyDepth(code);
      expect(result.reExportCount).toBe(2);
    });
  });

  describe('depth score calculation', () => {
    it('should calculate zero for empty file', () => {
      const result = extractDependencyDepth('');
      expect(result.depthScore).toBe(0);
    });

    it('should increase with local imports', () => {
      const code = `
        import a from './a.js';
        import b from './b.js';
      `;
      const result = extractDependencyDepth(code);
      expect(result.depthScore).toBeGreaterThan(0);
    });

    it('should weight npm imports lower', () => {
      const local = extractDependencyDepth('import a from "./a.js";');
      const npm = extractDependencyDepth('import a from "package";');
      expect(local.depthScore).toBeGreaterThan(npm.depthScore);
    });

    it('should weight dynamic imports higher', () => {
      const static_ = extractDependencyDepth('import a from "./a.js";');
      const dynamic = extractDependencyDepth('const a = await import("./a.js");');
      expect(dynamic.depthScore).toBeGreaterThan(static_.depthScore);
    });

    it('should weight re-exports highest', () => {
      const reexport = extractDependencyDepth('export { a } from "./a.js";');
      const local = extractDependencyDepth('import a from "./a.js";');
      expect(reexport.depthScore).toBeGreaterThan(local.depthScore);
    });

    it('should round to one decimal', () => {
      const code = 'import a from "./a.js";';
      const result = extractDependencyDepth(code);
      const decimal = result.depthScore % 1;
      expect(decimal.toString().length).toBeLessThanOrEqual(3);
    });
  });

  describe('chain indicator details', () => {
    it('should include source for chain indicators', () => {
      const code = 'export { a } from "./module.js";';
      const result = extractDependencyDepth(code);
      expect(result.importChainIndicators[0].source).toBe('./module.js');
    });

    it('should include line numbers', () => {
      const code = 'export { a } from "./module.js";';
      const result = extractDependencyDepth(code);
      expect(result.importChainIndicators[0].line).toBeDefined();
      expect(typeof result.importChainIndicators[0].line).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractDependencyDepth('');
      expect(result.importCount).toBe(0);
      expect(result.localImportCount).toBe(0);
      expect(result.npmImportCount).toBe(0);
      expect(result.dynamicImportCount).toBe(0);
      expect(result.reExportCount).toBe(0);
    });

    it('should handle code without imports', () => {
      const code = 'function simple() { return 42; }';
      const result = extractDependencyDepth(code);
      expect(result.importCount).toBe(0);
      expect(result.depthScore).toBe(0);
    });

    it('should handle complex real-world imports', () => {
      const code = `
        import React, { useState, useEffect } from 'react';
        import { helper } from './utils/helpers.js';
        import * as config from '../config/index.js';
        import type { User } from './types.js';
        
        export { default as Component } from './Component.js';
        
        const lazyModule = await import('./lazy.js');
      `;
      const result = extractDependencyDepth(code);
      expect(result.importCount).toBeGreaterThan(0);
      expect(result.importChainIndicators.length).toBeGreaterThan(0);
    });
  });
});
