/**
 * @fileoverview styled-connections.test.js
 * 
 * Tests for Styled Component Connections Detector
 * Tests detectStyledComponentConnections
 * 
 * @module tests/unit/layer-a-analysis/extractors/css-in-js-extractor/detectors/styled-connections
 */

import { describe, it, expect } from 'vitest';
import { detectStyledComponentConnections } from '#layer-a/extractors/css-in-js-extractor/detectors/styled-connections.js';
import {
  CSSInJSConnectionBuilder,
  CSSInJSValidators
} from '../../../../../factories/css-in-js-test.factory.js';

describe('Styled Component Connections Detector', () => {
  describe('detectStyledComponentConnections', () => {
    it('should detect connections when components extend the same base', () => {
      const fileResults = {
        'components/Button1.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseButton', line: 1 }
          ]
        },
        'components/Button2.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseButton', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('styledExtension');
      expect(result[0].baseComponent).toBe('BaseButton');
    });

    it('should create connections with correct structure', () => {
      const fileResults = {
        'components/A.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      result.forEach(conn => {
        expect(CSSInJSValidators.isValidConnection(conn)).toBe(true);
      });
    });

    it('should include connection metadata', () => {
      const fileResults = {
        'components/A.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseButton', line: 1 }
          ]
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseButton', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      const conn = result[0];
      expect(conn).toHaveProperty('id');
      expect(conn).toHaveProperty('sourceFile');
      expect(conn).toHaveProperty('targetFile');
      expect(conn).toHaveProperty('type');
      expect(conn).toHaveProperty('via');
      expect(conn).toHaveProperty('confidence');
      expect(conn).toHaveProperty('detectedBy');
      expect(conn).toHaveProperty('reason');
    });

    it('should set correct confidence level', () => {
      const fileResults = {
        'components/A.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result[0].confidence).toBe(0.95);
    });

    it('should set detectedBy to css-in-js-extractor', () => {
      const fileResults = {
        'components/A.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result[0].detectedBy).toBe('css-in-js-extractor');
    });

    it('should return empty array for no connections', () => {
      const fileResults = {
        'components/A.jsx': {
          components: [
            { type: 'styled_tag', tag: 'div', line: 1 }
          ]
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_tag', tag: 'span', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result).toEqual([]);
    });

    it('should return empty array for single file', () => {
      const fileResults = {
        'components/A.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const result = detectStyledComponentConnections({});

      expect(result).toEqual([]);
    });

    it('should handle multiple base components', () => {
      const fileResults = {
        'components/Button1.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseButton', line: 1 }
          ]
        },
        'components/Button2.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseButton', line: 1 }
          ]
        },
        'components/Card1.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseCard', line: 1 }
          ]
        },
        'components/Card2.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'BaseCard', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const baseComponents = result.map(r => r.baseComponent);
      expect(baseComponents).toContain('BaseButton');
      expect(baseComponents).toContain('BaseCard');
    });

    it('should handle files with no components', () => {
      const fileResults = {
        'components/A.jsx': {
          components: []
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result).toEqual([]);
    });

    it('should handle missing components property', () => {
      const fileResults = {
        'components/A.jsx': {},
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      expect(result).toEqual([]);
    });
  });

  describe('Integration with factories', () => {
    it('should work with CSSInJSConnectionBuilder', () => {
      const builder = new CSSInJSConnectionBuilder();
      builder.withStyledExtensionChain(
        'components/BaseButton.jsx',
        'components/ExtendedButton.jsx'
      );
      const files = builder.build();

      const fileResults = {};
      for (const [path, data] of Object.entries(files)) {
        fileResults[path] = { components: data.components || [] };
      }

      const result = detectStyledComponentConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error handling', () => {
    it('should handle null input', () => {
      expect(() => detectStyledComponentConnections(null)).not.toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => detectStyledComponentConnections(undefined)).not.toThrow();
    });

    it('should return empty array for null/undefined', () => {
      expect(detectStyledComponentConnections(null)).toEqual([]);
      expect(detectStyledComponentConnections(undefined)).toEqual([]);
    });
  });
});
