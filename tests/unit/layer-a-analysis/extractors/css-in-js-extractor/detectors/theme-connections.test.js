/**
 * @fileoverview theme-connections.test.js
 * 
 * Tests for Theme Connections Detector
 * Tests detectThemeConnections
 * 
 * @module tests/unit/layer-a-analysis/extractors/css-in-js-extractor/detectors/theme-connections
 */

import { describe, it, expect } from 'vitest';
import { detectThemeConnections } from '#layer-a/extractors/css-in-js-extractor/detectors/theme-connections.js';
import {
  CSSInJSConnectionBuilder,
  CSSInJSValidators
} from '../../../../../factories/css-in-js-test.factory.js';

describe('Theme Connections Detector', () => {
  describe('detectThemeConnections', () => {
    it('should detect theme provider -> consumer connections', () => {
      const fileResults = {
        'theme/ThemeProvider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Button.jsx': {
          themes: [
            { type: 'theme_access', path: 'colors.primary', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('sharedTheme');
    });

    it('should detect useTheme consumer connections', () => {
      const fileResults = {
        'theme/ThemeProvider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Card.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect withTheme consumer connections', () => {
      const fileResults = {
        'theme/ThemeProvider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Modal.jsx': {
          themes: [
            { type: 'with_theme', component: 'ModalComponent', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should create connections with correct structure', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'theme_access', path: 'colors.primary', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      result.forEach(conn => {
        expect(CSSInJSValidators.isValidConnection(conn)).toBe(true);
      });
    });

    it('should include connection metadata', () => {
      const fileResults = {
        'theme/ThemeProvider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'appTheme', line: 1 }
          ]
        },
        'components/Button.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      const conn = result[0];
      expect(conn).toHaveProperty('id');
      expect(conn).toHaveProperty('sourceFile');
      expect(conn).toHaveProperty('targetFile');
      expect(conn).toHaveProperty('type');
      expect(conn).toHaveProperty('via');
      expect(conn).toHaveProperty('provider');
      expect(conn).toHaveProperty('consumer');
      expect(conn).toHaveProperty('confidence');
      expect(conn).toHaveProperty('detectedBy');
      expect(conn).toHaveProperty('reason');
    });

    it('should set correct confidence level', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'theme_access', path: 'colors.primary', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result[0].confidence).toBe(0.9);
    });

    it('should set detectedBy to css-in-js-extractor', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'theme_access', path: 'colors.primary', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result[0].detectedBy).toBe('css-in-js-extractor');
    });

    it('should set direction from provider to consumer', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result[0].sourceFile).toBe('theme/Provider.jsx');
      expect(result[0].targetFile).toBe('components/Consumer.jsx');
    });

    it('should not create connection for same file', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 },
            { type: 'use_theme', line: 2 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result).toEqual([]);
    });

    it('should return empty array for no providers', () => {
      const fileResults = {
        'components/A.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        },
        'components/B.jsx': {
          themes: [
            { type: 'theme_access', path: 'colors.primary', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result).toEqual([]);
    });

    it('should return empty array for no consumers', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'utils/helpers.jsx': {
          themes: []
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result).toEqual([]);
    });

    it('should handle multiple providers and consumers', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Button.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        },
        'components/Card.jsx': {
          themes: [
            { type: 'with_theme', component: 'Card', line: 1 }
          ]
        },
        'components/Text.jsx': {
          themes: [
            { type: 'theme_access', path: 'colors.primary', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array for empty input', () => {
      const result = detectThemeConnections({});

      expect(result).toEqual([]);
    });

    it('should handle files with no themes property', () => {
      const fileResults = {
        'theme/Provider.jsx': {},
        'components/Consumer.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result).toEqual([]);
    });

    it('should handle missing themes array', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: null
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      expect(result).toEqual([]);
    });
  });

  describe('Integration with factories', () => {
    it('should work with CSSInJSConnectionBuilder', () => {
      const builder = new CSSInJSConnectionBuilder();
      builder.withThemeProviderFile('theme/index.js', 'theme')
        .withThemeConsumerFile('components/Button.jsx');
      const files = builder.build();

      const fileResults = {};
      for (const [path, data] of Object.entries(files)) {
        fileResults[path] = {
          themes: data.themes || []
        };
      }

      const result = detectThemeConnections(fileResults);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error handling', () => {
    it('should handle null input', () => {
      expect(() => detectThemeConnections(null)).not.toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => detectThemeConnections(undefined)).not.toThrow();
    });

    it('should return empty array for null/undefined', () => {
      expect(detectThemeConnections(null)).toEqual([]);
      expect(detectThemeConnections(undefined)).toEqual([]);
    });
  });
});
