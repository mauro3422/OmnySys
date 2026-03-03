import { describe, it, expect, beforeEach } from 'vitest';
import { RequestHandler, ValidationResult } from '#services/llm-service/handlers/request-handler.js';
import { PromptBuilder, RequestOptionsBuilder } from '#test-factories/services/builders.js';

describe('RequestHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new RequestHandler();
  });

  describe('constructor', () => {
    it('should create handler with default config', () => {
      expect(handler.config.maxPromptLength).toBe(100000);
      expect(handler.config.defaultMaxTokens).toBe(2000);
      expect(handler.config.defaultTemperature).toBe(0.7);
    });

    it('should merge custom config', () => {
      const customHandler = new RequestHandler({
        maxPromptLength: 50000,
        defaultMaxTokens: 4000
      });
      expect(customHandler.config.maxPromptLength).toBe(50000);
      expect(customHandler.config.defaultMaxTokens).toBe(4000);
    });
  });

  describe('validate', () => {
    it('should return valid for proper prompt', () => {
      const result = handler.validate('Analyze this code', {});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for missing prompt', () => {
      const result = handler.validate(null, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prompt is required');
    });

    it('BUG: validate returns "Prompt is required" for empty string', () => {
      const result = handler.validate('', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prompt is required');
    });

    it('should return invalid for non-string prompt', () => {
      const result = handler.validate(123, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prompt must be a string');
    });

    it('should return invalid for too long prompt', () => {
      const longPrompt = PromptBuilder.create().long(150000).build();
      const result = handler.validate(longPrompt, {});
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });

    it('should warn for short prompts', () => {
      const result = handler.validate('Hi', {});
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate mode', () => {
      const result = handler.validate('test', { mode: 'invalid' });
      expect(result.valid).toBe(false);
    });

    it('should validate maxTokens', () => {
      const result = handler.validate('test', { maxTokens: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxTokens must be a positive integer');
    });

    it('should warn for high maxTokens', () => {
      const result = handler.validate('test', { maxTokens: 50000 });
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate temperature range', () => {
      const result = handler.validate('test', { temperature: 3 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('temperature must be a number between 0 and 2');
    });

    it('should validate temperature type', () => {
      const result = handler.validate('test', { temperature: 'hot' });
      expect(result.valid).toBe(false);
    });

    it('should validate topP range', () => {
      const result = handler.validate('test', { topP: 1.5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('topP must be a number between 0 and 1');
    });
  });

  describe('prepare', () => {
    it('should prepare request with defaults', () => {
      const prepared = handler.prepare('test prompt', {});
      
      expect(prepared.prompt).toBe('test prompt');
      expect(prepared.options.mode).toBe('auto');
      expect(prepared.options.maxTokens).toBe(2000);
      expect(prepared.options.temperature).toBe(0.7);
      expect(prepared.timestamp).toBeDefined();
      expect(prepared.requestId).toBeDefined();
    });

    it('should throw for invalid request', () => {
      expect(() => handler.prepare('', {})).toThrow('Invalid request');
    });

    it('should apply custom options', () => {
      const options = RequestOptionsBuilder.create()
        .withMode('gpu')
        .withMaxTokens(4000)
        .withTemperature(0.5)
        .build();
      
      const prepared = handler.prepare('test', options);
      
      expect(prepared.options.mode).toBe('gpu');
      expect(prepared.options.maxTokens).toBe(4000);
      expect(prepared.options.temperature).toBe(0.5);
    });

    it('should generate unique request IDs', () => {
      const prepared1 = handler.prepare('test1', {});
      const prepared2 = handler.prepare('test2', {});
      
      expect(prepared1.requestId).not.toBe(prepared2.requestId);
    });

    it('should sanitize prompt', () => {
      const prompt = '  test prompt  ';
      const prepared = handler.prepare(prompt, {});
      
      expect(prepared.prompt).toBe('test prompt');
    });

    it('should remove null bytes from prompt', () => {
      const prompt = PromptBuilder.create().withNullBytes().build();
      const prepared = handler.prepare(prompt, {});
      
      expect(prepared.prompt).not.toContain('\x00');
    });

    it('should normalize line endings', () => {
      const prompt = PromptBuilder.create().withMixedLineEndings().build();
      const prepared = handler.prepare(prompt, {});
      
      expect(prepared.prompt).not.toContain('\r');
    });
  });

  describe('prepareBatch', () => {
    it('should prepare multiple requests', () => {
      const requests = [
        { prompt: 'prompt1', options: {} },
        { prompt: 'prompt2', options: {} }
      ];
      
      const prepared = handler.prepareBatch(requests);
      
      expect(prepared).toHaveLength(2);
      expect(prepared[0].prompt).toBe('prompt1');
      expect(prepared[1].prompt).toBe('prompt2');
    });

    it('should throw for non-array input', () => {
      expect(() => handler.prepareBatch('not an array')).toThrow('must be an array');
    });

    it('should handle failed preparations', () => {
      const requests = [
        { prompt: 'valid', options: {} },
        { prompt: '', options: {} }
      ];
      
      const prepared = handler.prepareBatch(requests);
      
      expect(prepared).toHaveLength(2);
      expect(prepared[0].prompt).toBe('valid');
      expect(prepared[1].error).toBeDefined();
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens for text', () => {
      const text = 'a'.repeat(100);
      const tokens = handler.estimateTokens(text);
      
      expect(tokens).toBe(25);
    });

    it('should return 0 for empty text', () => {
      expect(handler.estimateTokens('')).toBe(0);
      expect(handler.estimateTokens(null)).toBe(0);
    });
  });

  describe('mightExceedTokenLimit', () => {
    it('should return false for short prompts', () => {
      const prompt = 'short prompt';
      expect(handler.mightExceedTokenLimit(prompt)).toBe(false);
    });

    it('should return true for long prompts', () => {
      const prompt = 'x'.repeat(13000);
      expect(handler.mightExceedTokenLimit(prompt)).toBe(true);
    });

    it('BUG: mightExceedTokenLimit calculation is incorrect', () => {
      const prompt = 'x'.repeat(3000);
      expect(handler.mightExceedTokenLimit(prompt, 1000)).toBe(false);
    });
  });
});

describe('ValidationResult', () => {
  it('should create valid result', () => {
    const result = new ValidationResult(true);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should create invalid result with errors', () => {
    const result = new ValidationResult(false, ['error1', 'error2']);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['error1', 'error2']);
  });

  it('should include warnings', () => {
    const result = new ValidationResult(true, [], ['warning1']);
    expect(result.warnings).toEqual(['warning1']);
  });
});
