import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseHandler, ProcessedResponse } from '#services/llm-service/handlers/response-handler.js';
import { RawResponseBuilder } from '#test-factories/services/builders.js';

describe('ResponseHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ResponseHandler();
  });

  describe('constructor', () => {
    it('should create handler with default config', () => {
      expect(handler.config.maxResponseLength).toBe(500000);
      expect(handler.config.trimWhitespace).toBe(true);
      expect(handler.config.parseJSON).toBe(false);
    });

    it('should merge custom config', () => {
      const customHandler = new ResponseHandler({
        maxResponseLength: 100000,
        parseJSON: true
      });
      expect(customHandler.config.maxResponseLength).toBe(100000);
      expect(customHandler.config.parseJSON).toBe(true);
    });
  });

  describe('process', () => {
    it('should process simple content response', () => {
      const raw = RawResponseBuilder.create().build();
      const result = handler.process(raw);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('This is the LLM response content.');
    });

    it('should process OpenAI format response', () => {
      const raw = RawResponseBuilder.create().withContent(null).asOpenAIFormat().build();
      const result = handler.process(raw);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('OpenAI response');
    });

    it('should process Anthropic format response', () => {
      const raw = RawResponseBuilder.create().withContent(null).asAnthropicFormat().build();
      const result = handler.process(raw);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Anthropic response');
    });

    it('should process string response', () => {
      const raw = RawResponseBuilder.create().withContent(null).asString().build();
      const result = handler.process(raw);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Plain string response');
    });

    it('should return error for empty response', () => {
      const result = handler.process(null);
      
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Empty response received');
    });

    it('should include metadata', () => {
      const raw = RawResponseBuilder.create()
        .withProvider('openai')
        .withModel('gpt-4')
        .build();
      
      const result = handler.process(raw, { requestId: 'req-123' });
      
      expect(result.metadata.requestId).toBe('req-123');
      expect(result.metadata.provider).toBe('openai');
      expect(result.metadata.model).toBe('gpt-4');
      expect(result.metadata.processingTime).toBeDefined();
    });

    it('should trim whitespace when configured', () => {
      const raw = RawResponseBuilder.create()
        .withContent('  trimmed content  ')
        .build();
      
      const result = handler.process(raw);
      
      expect(result.data).toBe('trimmed content');
    });

    it('should not trim whitespace when disabled', () => {
      const noTrimHandler = new ResponseHandler({ trimWhitespace: false });
      const raw = RawResponseBuilder.create()
        .withContent('  content  ')
        .build();
      
      const result = noTrimHandler.process(raw);
      
      expect(result.data).toBe('  content  ');
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON content when requested', () => {
      const raw = RawResponseBuilder.create()
        .withJSONContent({ result: 'success', count: 42 })
        .build();
      
      const result = handler.process(raw, { parseJSON: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success', count: 42 });
      expect(result.metadata.isJSON).toBe(true);
    });

    it('should parse JSON from markdown code blocks', () => {
      const raw = RawResponseBuilder.create()
        .withMarkdownJSON({ result: 'success' })
        .build();
      
      const result = handler.process(raw, { parseJSON: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success' });
    });

    it('should handle parseJSON in config', () => {
      const jsonHandler = new ResponseHandler({ parseJSON: true });
      const raw = RawResponseBuilder.create()
        .withJSONContent({ value: 123 })
        .build();
      
      const result = jsonHandler.process(raw);
      
      expect(result.data).toEqual({ value: 123 });
    });

    it('should not fail for invalid JSON', () => {
      const raw = RawResponseBuilder.create()
        .withContent('not valid json')
        .build();
      
      const result = handler.process(raw, { parseJSON: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('not valid json');
      expect(result.metadata.isJSON).toBe(false);
    });
  });

  describe('processBatch', () => {
    it('should process multiple responses', () => {
      const responses = [
        RawResponseBuilder.create().withContent('response1').build(),
        RawResponseBuilder.create().withContent('response2').build()
      ];
      
      const results = handler.processBatch(responses);
      
      expect(results).toHaveLength(2);
      expect(results[0].data).toBe('response1');
      expect(results[1].data).toBe('response2');
    });

    it('should handle non-array input', () => {
      const results = handler.processBatch('not an array');
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it('should handle errors in individual responses', () => {
      const responses = [
        RawResponseBuilder.create().build(),
        null
      ];
      
      const results = handler.processBatch(responses);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('format', () => {
    it('should format as object by default', () => {
      const raw = RawResponseBuilder.create().build();
      const processed = handler.process(raw);
      
      const formatted = handler.format(processed);
      
      expect(formatted).toBe(processed);
    });

    it('should format as JSON string', () => {
      const raw = RawResponseBuilder.create()
        .withJSONContent({ value: 42 })
        .build();
      const processed = handler.process(raw, { parseJSON: true });
      
      const formatted = handler.format(processed, 'json');
      
      expect(formatted).toBe('{"value":42}');
    });

    it('should format as text', () => {
      const raw = RawResponseBuilder.create().withContent('text content').build();
      const processed = handler.process(raw);
      
      const formatted = handler.format(processed, 'text');
      
      expect(formatted).toBe('text content');
    });

    it('should format error responses', () => {
      const errorResult = ProcessedResponse.error(new Error('test error'));
      
      expect(handler.format(errorResult, 'json')).toBe('{"error":"test error"}');
      expect(handler.format(errorResult, 'text')).toBe('test error');
    });
  });

  describe('isError', () => {
    it('should return true for null response', () => {
      expect(handler.isError(null)).toBe(true);
    });

    it('should return true for response with error', () => {
      expect(handler.isError({ error: 'something' })).toBe(true);
    });

    it('should return true for unsuccessful response', () => {
      expect(handler.isError({ success: false })).toBe(true);
    });

    it('should return false for successful response', () => {
      expect(handler.isError({ success: true, data: 'ok' })).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return message for null response', () => {
      expect(handler.getErrorMessage(null)).toBe('Empty response');
    });

    it('should return error message from error object', () => {
      expect(handler.getErrorMessage({ error: new Error('test') })).toBe('test');
    });

    it('should return error message from string', () => {
      expect(handler.getErrorMessage({ error: 'string error' })).toBe('string error');
    });

    it('should return errorMessage field', () => {
      expect(handler.getErrorMessage({ errorMessage: 'field error' })).toBe('field error');
    });

    it('should return null for valid response', () => {
      expect(handler.getErrorMessage({ success: true })).toBeNull();
    });
  });
});

describe('ProcessedResponse', () => {
  it('should create successful response', () => {
    const response = new ProcessedResponse({ data: 'test' }, { requestId: '123' });
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ data: 'test' });
    expect(response.metadata.requestId).toBe('123');
    expect(response.error).toBeNull();
  });

  it('should create error response', () => {
    const response = ProcessedResponse.error(new Error('test error'), { requestId: '123' });
    
    expect(response.success).toBe(false);
    expect(response.data).toBeNull();
    expect(response.error.message).toBe('test error');
    expect(response.metadata.requestId).toBe('123');
  });

  it('should handle string errors', () => {
    const response = ProcessedResponse.error('string error');
    
    expect(response.error.message).toBe('string error');
  });
});
