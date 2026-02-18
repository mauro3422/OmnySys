import { describe, it, expect } from 'vitest';
import { cleanLLMResponse, normalizeAnalysisResponse } from '#ai/llm/response-cleaner.js';
import { LLMResponseBuilder, NormalizedAnalysisBuilder } from '#test-factories/ai/builders.js';

describe('cleanLLMResponse', () => {
  describe('input validation', () => {
    it('should return null/undefined as-is', () => {
      expect(cleanLLMResponse(null)).toBe(null);
      expect(cleanLLMResponse(undefined)).toBe(undefined);
    });

    it('should return non-string as-is', () => {
      expect(cleanLLMResponse(123)).toBe(123);
      expect(cleanLLMResponse({})).toEqual({});
      expect(cleanLLMResponse([])).toEqual([]);
    });

    it('should return empty string as-is', () => {
      expect(cleanLLMResponse('')).toBe('');
    });
  });

  describe('markdown removal', () => {
    it('should remove ```json blocks', () => {
      const input = '```json\n{"test": true}\n```';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test": true}');
    });

    it('should remove ``` blocks without json label', () => {
      const input = '```\n{"test": true}\n```';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test": true}');
    });

    it('should handle multiple code blocks', () => {
      const input = '```json\n{"a": 1}\n```\nSome text\n```json\n{"b": 2}\n```';
      const result = cleanLLMResponse(input);
      expect(result).toContain('{"a": 1}');
    });

    it('should handle case-insensitive JSON label', () => {
      const input = '```JSON\n{"test": true}\n```';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test": true}');
    });
  });

  describe('comment removal', () => {
    it('should remove single-line comments', () => {
      const input = '{"test": true // this is a comment\n}';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test": true \n}');
    });

    it('should remove multi-line comments', () => {
      const input = '{"test": /* comment */ true}';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test":  true}');
    });

    it('should handle comments at various positions', () => {
      const input = `{
        // comment at start
        "key": "value", // inline comment
        "other": /* block */ "value"
      }`;
      const result = cleanLLMResponse(input);
      expect(result).not.toContain('// comment');
      expect(result).not.toContain('/* block */');
    });
  });

  describe('trailing comma removal', () => {
    it('should remove trailing comma in objects', () => {
      const input = '{"a": 1, "b": 2,}';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"a": 1, "b": 2}');
    });

    it('should remove trailing comma in arrays', () => {
      const input = '[1, 2, 3,]';
      const result = cleanLLMResponse(input);
      expect(result).toBe('[1, 2, 3]');
    });

    it('should handle nested trailing commas', () => {
      const input = '{"arr": [1, 2,], "obj": {"x": 1,},}';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"arr": [1, 2], "obj": {"x": 1}}');
    });
  });

  describe('quote normalization', () => {
    it('should convert single quotes to double quotes', () => {
      const input = "{'key': 'value'}";
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"key": "value"}');
    });

    it('should preserve double quotes inside strings', () => {
      const input = '{"key": "value with \\"quotes\\""}';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"key": "value with \\"quotes\\""}');
    });

    it('should handle mixed quotes', () => {
      const input = "{'key': \"value\"}";
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"key": "value"}');
    });
  });

  describe('JSON extraction', () => {
    it('should extract JSON from text prefix', () => {
      const input = 'Here is the result: {"test": true}';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test": true}');
    });

    it('should extract JSON array from text prefix', () => {
      const input = 'Results: [{"a": 1}, {"b": 2}]';
      const result = cleanLLMResponse(input);
      expect(result).toBe('[{"a": 1}, {"b": 2}]');
    });

    it('should remove text after JSON object', () => {
      const input = '{"test": true} End of response';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test": true}');
    });

    it('should remove text after JSON array', () => {
      const input = '[1, 2, 3] Additional text';
      const result = cleanLLMResponse(input);
      expect(result).toBe('[1, 2, 3]');
    });
  });

  describe('complex responses', () => {
    it('should clean complex LLM response', () => {
      const response = LLMResponseBuilder.create()
        .withSharedState([{ property: 'store.state', type: 'read', line: 5 }])
        .addEvent('dataUpdated', 'emit', 10)
        .asConnected()
        .buildWithMarkdown();

      const result = cleanLLMResponse(response);
      const parsed = JSON.parse(result);
      
      expect(parsed.sharedState).toHaveLength(1);
      expect(parsed.events).toHaveLength(1);
      expect(parsed.subsystemStatus).toBe('connected');
    });

    it('should handle response with comments and markdown', () => {
      const input = LLMResponseBuilder.create()
        .withSharedState([{ property: 'test', type: 'read', line: 1 }])
        .buildWithComments();

      const markdown = '```json\n' + input + '\n```';
      const result = cleanLLMResponse(markdown);
      
      expect(result).not.toContain('//');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle incomplete JSON gracefully', () => {
      const input = '{"test": true';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"test": true');
    });
  });

  describe('edge cases', () => {
    it('should handle escaped characters', () => {
      const input = '{"path": "C:\\\\Users\\\\test", "newline": "line1\\nline2"}';
      const result = cleanLLMResponse(input);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle nested objects', () => {
      const input = '{"outer": {"inner": {"deep": "value"}}}';
      const result = cleanLLMResponse(input);
      expect(result).toBe('{"outer": {"inner": {"deep": "value"}}}');
    });

    it('should handle arrays of objects', () => {
      const input = '[{"a": 1}, {"b": 2}, {"c": 3}]';
      const result = cleanLLMResponse(input);
      expect(result).toBe('[{"a": 1}, {"b": 2}, {"c": 3}]');
    });
  });
});

describe('normalizeAnalysisResponse', () => {
  describe('input validation', () => {
    it('should return null/undefined as-is', () => {
      expect(normalizeAnalysisResponse(null)).toBe(null);
      expect(normalizeAnalysisResponse(undefined)).toBe(undefined);
    });

    it('should return non-object as-is', () => {
      expect(normalizeAnalysisResponse('string')).toBe('string');
      expect(normalizeAnalysisResponse(123)).toBe(123);
    });

    it('should handle empty object', () => {
      const result = normalizeAnalysisResponse({});
      expect(result.analysis).toBeDefined();
      expect(result.analysis.orphan).toBeDefined();
      expect(result.analysis.semantic).toBeDefined();
      expect(result.analysis.patterns).toBeDefined();
    });
  });

  describe('orphan normalization', () => {
    it('should convert boolean orphan to object structure', () => {
      const input = { orphan: true };
      const result = normalizeAnalysisResponse(input);
      
      expect(result.orphan).toBeUndefined();
      expect(result.analysis.orphan.isOrphan).toBe(true);
    });

    it('should handle false orphan boolean', () => {
      const input = { orphan: false };
      const result = normalizeAnalysisResponse(input);
      
      expect(result.orphan).toBeUndefined();
      expect(result.analysis.orphan.isOrphan).toBe(false);
    });

    it('should preserve existing orphan analysis', () => {
      const input = {
        analysis: {
          orphan: {
            isOrphan: true,
            dependentCount: 5,
            suggestions: ['Add imports']
          }
        }
      };
      const result = normalizeAnalysisResponse(input);
      
      expect(result.analysis.orphan.isOrphan).toBe(true);
      expect(result.analysis.orphan.dependentCount).toBe(5);
      expect(result.analysis.orphan.suggestions).toContain('Add imports');
    });
  });

  describe('semantic normalization', () => {
    it('should ensure semantic structure exists', () => {
      const result = normalizeAnalysisResponse({});
      
      expect(result.analysis.semantic).toBeDefined();
      expect(result.analysis.semantic.sharedState).toEqual([]);
      expect(result.analysis.semantic.events).toEqual({ emits: [], listens: [] });
      expect(result.analysis.semantic.connections).toEqual([]);
    });

    it('should convert sharedState to array if not', () => {
      const input = {
        analysis: {
          semantic: {
            sharedState: 'not-an-array'
          }
        }
      };
      const result = normalizeAnalysisResponse(input);
      
      expect(Array.isArray(result.analysis.semantic.sharedState)).toBe(true);
    });

    it('should preserve valid semantic data', () => {
      const input = {
        analysis: {
          semantic: {
            sharedState: [{ property: 'state', type: 'read', line: 1 }],
            events: { emits: ['event1'], listens: ['event2'] },
            connections: ['file1.js']
          }
        }
      };
      const result = normalizeAnalysisResponse(input);
      
      expect(result.analysis.semantic.sharedState).toHaveLength(1);
      expect(result.analysis.semantic.events.emits).toContain('event1');
    });
  });

  describe('patterns normalization', () => {
    it('should ensure patterns structure exists', () => {
      const result = normalizeAnalysisResponse({});
      
      expect(result.analysis.patterns).toBeDefined();
      expect(result.analysis.patterns.isStateManager).toBe(false);
      expect(result.analysis.patterns.isSingleton).toBe(false);
      expect(result.analysis.patterns.isGodObject).toBe(false);
      expect(result.analysis.patterns.hasSideEffects).toBe(false);
    });

    it('should preserve existing pattern data', () => {
      const input = {
        analysis: {
          patterns: {
            isStateManager: true,
            isSingleton: true
          }
        }
      };
      const result = normalizeAnalysisResponse(input);
      
      expect(result.analysis.patterns.isStateManager).toBe(true);
      expect(result.analysis.patterns.isSingleton).toBe(true);
    });
  });

  describe('full normalization', () => {
    it('should normalize complete LLM response', () => {
      const input = LLMResponseBuilder.create()
        .withSharedState([{ property: 'store', type: 'read', line: 5 }])
        .addEvent('update', 'emit', 10)
        .asConnected()
        .build();

      const result = normalizeAnalysisResponse(input);
      
      expect(result.sharedState).toHaveLength(1);
      expect(result.events).toHaveLength(1);
      expect(result.analysis).toBeDefined();
    });

    it('should handle flat orphan with analysis', () => {
      const input = {
        orphan: true,
        analysis: {
          orphan: {
            dependentCount: 3
          }
        }
      };
      const result = normalizeAnalysisResponse(input);
      
      expect(result.orphan).toBeUndefined();
      expect(result.analysis.orphan.isOrphan).toBe(true);
      expect(result.analysis.orphan.dependentCount).toBe(3);
    });
  });
});
