import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildPrompt } from '#layer-b/llm-analyzer/prompt-builder.js';

vi.mock('#layer-b/prompt-engine/index.js', () => ({
  default: {
    generatePrompt: vi.fn(),
    validatePrompt: vi.fn()
  }
}));

import promptEngine from '#layer-b/prompt-engine/index.js';

describe('llm-analyzer/prompt-builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('buildPrompt', () => {
    it('should build prompt with valid metadata', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'You are a code analyzer.',
        userPrompt: 'Analyze this code.',
        analysisType: 'semantic'
      });
      promptEngine.validatePrompt.mockReturnValue(true);

      const result = await buildPrompt('const x = 1;', '/src/file.js', {}, {}, {});

      expect(result.systemPrompt).toBe('You are a code analyzer.');
      expect(result.userPrompt).toBe('Analyze this code.');
      expect(result.analysisType).toBe('semantic');
    });

    it('should use provided metadata', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
        analysisType: 'default'
      });

      const metadata = { exports: ['foo'], imports: ['bar'] };
      await buildPrompt('code', '/src/file.js', {}, {}, metadata);

      expect(promptEngine.generatePrompt).toHaveBeenCalledWith(metadata, 'code');
    });

    it('should use empty object if no metadata provided', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: 'User',
        analysisType: 'default'
      });

      await buildPrompt('code', '/src/file.js', {}, {}, null);

      expect(promptEngine.generatePrompt).toHaveBeenCalledWith({}, 'code');
    });

    it('should validate generated prompt', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: 'User',
        analysisType: 'default'
      });

      await buildPrompt('code', '/src/file.js', {}, {}, {});

      expect(promptEngine.validatePrompt).toHaveBeenCalled();
    });

    it('should throw if systemPrompt is not a string', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 123,
        userPrompt: 'User',
        analysisType: 'default'
      });

      const result = await buildPrompt('code', '/src/file.js', {}, {}, {});

      expect(result.systemPrompt).toBe('You are a code analyzer. Return ONLY valid JSON.');
    });

    it('should throw if userPrompt is not a string', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: null,
        analysisType: 'default'
      });

      const result = await buildPrompt('code', '/src/file.js', {}, {}, {});

      expect(result.analysisType).toBe('default');
    });

    it('should return fallback prompts on error', async () => {
      promptEngine.generatePrompt.mockRejectedValue(new Error('Generation failed'));

      const code = 'const x = 1;';
      const result = await buildPrompt(code, '/src/file.js', {}, {}, {});

      expect(result.systemPrompt).toBe('You are a code analyzer. Return ONLY valid JSON.');
      expect(result.userPrompt).toContain('<file_content>');
      expect(result.userPrompt).toContain(code);
      expect(result.analysisType).toBe('default');
    });

    it('should include code in fallback user prompt', async () => {
      promptEngine.generatePrompt.mockRejectedValue(new Error('Error'));

      const code = 'function hello() { return "world"; }';
      const result = await buildPrompt(code, '/src/error.js', {}, {}, {});

      expect(result.userPrompt).toContain(code);
    });

    it('should pass staticAnalysis to prompt engine', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: 'User',
        analysisType: 'default'
      });

      const staticAnalysis = { imports: [], exports: [] };
      await buildPrompt('code', '/src/file.js', staticAnalysis, {}, {});

      expect(promptEngine.generatePrompt).toHaveBeenCalled();
    });

    it('should pass projectContext to prompt engine', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: 'User',
        analysisType: 'default'
      });

      const projectContext = { root: '/project' };
      await buildPrompt('code', '/src/file.js', {}, projectContext, {});

      expect(promptEngine.generatePrompt).toHaveBeenCalled();
    });

    it('should handle empty code string', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: 'User',
        analysisType: 'default'
      });

      const result = await buildPrompt('', '/src/empty.js', {}, {}, {});

      expect(promptEngine.generatePrompt).toHaveBeenCalledWith({}, '');
    });

    it('should handle validatePrompt throwing error', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: 'User',
        analysisType: 'default'
      });
      promptEngine.validatePrompt.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const result = await buildPrompt('code', '/src/file.js', {}, {}, {});

      expect(result.analysisType).toBe('default');
    });

    it('should preserve all prompt config properties', async () => {
      promptEngine.generatePrompt.mockResolvedValue({
        systemPrompt: 'Custom System',
        userPrompt: 'Custom User',
        analysisType: 'react-component'
      });

      const result = await buildPrompt('code', '/src/Component.jsx', {}, {}, {});

      expect(result).toEqual({
        systemPrompt: 'Custom System',
        userPrompt: 'Custom User',
        analysisType: 'react-component'
      });
    });
  });
});
