import { describe, it, expect } from 'vitest';
import { UrlValidator } from '../../../../../src/layer-a-static/analyses/tier3/validators/UrlValidator.js';
import { DetectorScenarios, AdvancedAnalysisBuilder } from '../../../../factories/detector-test.factory.js';

describe('Tier 3 - UrlValidator', () => {
  describe('Structure Contract', () => {
    it('should return object with total, byFile, and all properties', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = { fileResults: {} };
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byFile');
      expect(result).toHaveProperty('all');
    });

    it('should return numeric total', () => {
      const validator = new UrlValidator();
      const result = validator.validate({});
      
      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should NOT throw on null/undefined input', () => {
      const validator = new UrlValidator();
      
      expect(() => validator.validate(null)).not.toThrow();
      expect(() => validator.validate(undefined)).not.toThrow();
      expect(() => validator.validate({})).not.toThrow();
    });
  });

  describe('Suspicious URL Detection', () => {
    it('should detect localhost URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000/api')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(1);
      expect(result.all[0].url).toContain('localhost');
    });

    it('should detect 127.0.0.1 URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://127.0.0.1:8080/data')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(1);
      expect(result.all[0].url).toContain('127.0.0.1');
    });

    it('should detect example.com URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/config.js', 'https://example.com/webhook')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(1);
      expect(result.all[0].url).toContain('example.com');
    });

    it('should detect .dev. subdomain URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'https://api.dev.company.com')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    it('should detect hardcoded port numbers', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'https://api.company.com:8443/v1')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    it('should not flag valid production URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'https://api.production.com/v1')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(0);
    });
  });

  describe('WebSocket URL Detection', () => {
    it('should detect suspicious WebSocket URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWebSocketUrl('src/realtime.js', 'ws://localhost:8080')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    it('should detect 127.0.0.1 in WebSocket URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWebSocketUrl('src/ws.js', 'wss://127.0.0.1:8443/socket')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    it('should not flag valid production WebSocket URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWebSocketUrl('src/realtime.js', 'wss://ws.production.com/socket')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(0);
    });
  });

  describe('Multiple URL Detection', () => {
    it('should detect multiple suspicious URLs', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = DetectorScenarios.suspiciousUrls();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(3); // localhost, 127.0.0.1, example.com
    });

    it('should detect multiple URLs in same file', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .withNetworkUrl('src/api.js', 'http://127.0.0.1:8080')
        .withNetworkUrl('src/api.js', 'https://api.production.com')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(2);
    });

    it('should group issues by file', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .withNetworkUrl('src/api.js', 'http://127.0.0.1:8080')
        .withWebSocketUrl('src/ws.js', 'ws://localhost:8080')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(Object.keys(result.byFile)).toContain('src/api.js');
      expect(Object.keys(result.byFile)).toContain('src/ws.js');
      expect(result.byFile['src/api.js']).toHaveLength(2);
      expect(result.byFile['src/ws.js']).toHaveLength(1);
    });
  });

  describe('Issue Format', () => {
    it('should include all required fields', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      const issue = result.all[0];
      expect(issue).toHaveProperty('sourceFile');
      expect(issue).toHaveProperty('url');
      expect(issue).toHaveProperty('line');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('reason');
      expect(issue).toHaveProperty('suggestion');
    });

    it('should have correct type', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.all[0].type).toBe('SUSPICIOUS_URL');
    });

    it('should have MEDIUM severity', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.all[0].severity).toBe('MEDIUM');
    });

    it('should include correct reason', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.all[0].reason).toBe('Hardcoded localhost URL');
    });

    it('should include line number', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000', { line: 42 })
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.all[0].line).toBe(42);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty advanced analysis', () => {
      const validator = new UrlValidator();
      const result = validator.validate({ fileResults: {} });
      
      expect(result.total).toBe(0);
    });

    it('should handle missing fileResults', () => {
      const validator = new UrlValidator();
      const result = validator.validate({});
      
      expect(result.total).toBe(0);
    });

    it('should handle file without network calls', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withFile('src/utils.js', { imports: [] })
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(0);
    });

    it('should handle file with empty URL arrays', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withFile('src/api.js', { networkCalls: { urls: [] } })
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(0);
    });

    it('should handle URL without matching patterns', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'https://api.github.com/users')
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      expect(result.total).toBe(0);
    });

    it('should detect only first matching pattern per URL', () => {
      const validator = new UrlValidator();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000') // matches localhost
        .build();
      
      const result = validator.validate(advancedAnalysis);
      
      // Should only report once, even if multiple patterns might match
      expect(result.total).toBe(1);
    });
  });
});
