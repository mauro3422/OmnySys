/**
 * @fileoverview provider-detector.test.js
 * 
 * Tests for provider-detector.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/context/provider-detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectContextCreations,
  detectProviders,
  detectAllProviders
} from '#layer-a/extractors/state-management/context/provider-detector.js';
import { ContextType } from '#layer-a/extractors/state-management/constants.js';
import { ContextBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Provider Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectContextCreations).toBe('function');
      expect(typeof detectProviders).toBe('function');
      expect(typeof detectAllProviders).toBe('function');
    });
  });

  // ============================================================================
  // detectContextCreations
  // ============================================================================
  describe('detectContextCreations', () => {
    it('should return empty array for empty code', () => {
      const result = detectContextCreations('');
      expect(result).toEqual([]);
    });

    it('should detect createContext call', () => {
      const code = 'const MyContext = createContext();';
      const result = detectContextCreations(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ContextType.CONTEXT_CREATION);
    });

    it('should detect multiple createContext calls', () => {
      const code = `
        const ThemeContext = createContext();
        const AuthContext = createContext();
      `;
      const result = detectContextCreations(code);

      expect(result).toHaveLength(2);
    });

    it('should include line number', () => {
      const code = 'const MyContext = createContext();';
      const result = detectContextCreations(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
      expect(result[0].line).toBeGreaterThanOrEqual(1);
    });

    it('should detect createContext with default value', () => {
      const code = `const ThemeContext = createContext('light');`;
      const result = detectContextCreations(code);

      expect(result).toHaveLength(1);
    });

    it('should detect createContext with null default', () => {
      const code = 'const AuthContext = createContext(null);';
      const result = detectContextCreations(code);

      expect(result).toHaveLength(1);
    });

    it('should detect TypeScript generic createContext', () => {
      const code = 'const TypedContext = createContext<string | null>(null);';
      const result = detectContextCreations(code);

      expect(result).toHaveLength(1);
    });

    it('should detect createContext with complex default', () => {
      const code = `const UserContext = createContext({ name: '', email: '' });`;
      const result = detectContextCreations(code);

      expect(result).toHaveLength(1);
    });

    it('should handle createContext with whitespace variations', () => {
      const codes = [
        'createContext()',
        'createContext( )',
        'createContext(  )'
      ];

      codes.forEach(code => {
        const result = detectContextCreations(code);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // detectProviders
  // ============================================================================
  describe('detectProviders', () => {
    it('should return empty array for empty code', () => {
      const result = detectProviders('');
      expect(result).toEqual([]);
    });

    it('should detect Context.Provider JSX', () => {
      const code = '<ThemeContext.Provider value={theme}></ThemeContext.Provider>';
      const result = detectProviders(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ContextType.CONTEXT_PROVIDER);
      expect(result[0].contextName).toBe('ThemeContext');
    });

    it('should detect multiple Context.Provider usages', () => {
      const code = `
        <ThemeContext.Provider value={theme}></ThemeContext.Provider>
        <AuthContext.Provider value={auth}></AuthContext.Provider>
      `;
      const result = detectProviders(code);

      expect(result).toHaveLength(2);
      expect(result[0].contextName).toBe('ThemeContext');
      expect(result[1].contextName).toBe('AuthContext');
    });

    it('should include line number', () => {
      const code = '<MyContext.Provider value={value}></MyContext.Provider>';
      const result = detectProviders(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect nested providers', () => {
      const code = `
        <ThemeContext.Provider value={theme}>
          <AuthContext.Provider value={auth}>
            <App />
          </AuthContext.Provider>
        </ThemeContext.Provider>
      `;
      const result = detectProviders(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect standalone Context.Provider reference', () => {
      const code = 'const Provider = ThemeContext.Provider;';
      const result = detectProviders(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].contextName).toBe('ThemeContext');
    });

    it('should handle self-closing provider tags', () => {
      const code = '<ThemeContext.Provider value={theme} />';
      const result = detectProviders(code);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // detectAllProviders
  // ============================================================================
  describe('detectAllProviders', () => {
    it('should return object with contexts and providers', () => {
      const result = detectAllProviders('');

      expect(result).toHaveProperty('contexts');
      expect(result).toHaveProperty('providers');
      expect(Array.isArray(result.contexts)).toBe(true);
      expect(Array.isArray(result.providers)).toBe(true);
    });

    it('should combine context creations and providers', () => {
      const code = `
        const MyContext = createContext();
        <MyContext.Provider value={value}></MyContext.Provider>
      `;
      const result = detectAllProviders(code);

      expect(result.contexts.length).toBeGreaterThan(0);
      expect(result.providers.length).toBeGreaterThan(0);
    });

    it('should separate contexts from providers correctly', () => {
      const code = `
        const ThemeContext = createContext();
        <ThemeContext.Provider value={theme}></ThemeContext.Provider>
      `;
      const result = detectAllProviders(code);

      expect(result.contexts.every(c => c.type === ContextType.CONTEXT_CREATION)).toBe(true);
      expect(result.providers.every(p => p.type === ContextType.CONTEXT_PROVIDER)).toBe(true);
    });

    it('should handle multiple contexts and providers', () => {
      const code = `
        const ThemeContext = createContext();
        const AuthContext = createContext();
        <ThemeContext.Provider value={theme}>
          <AuthContext.Provider value={auth}>
            <App />
          </AuthContext.Provider>
        </ThemeContext.Provider>
      `;
      const result = detectAllProviders(code);

      expect(result.contexts.length).toBe(2);
      expect(result.providers.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ContextBuilder', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withContext('TestContext');
      const { code } = builder.build();

      const result = detectContextCreations(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with ContextBuilder provider', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withContext('TestContext')
        .withProvider('TestContext', 'TestProvider');
      const { code } = builder.build();

      const contexts = detectContextCreations(code);
      const providers = detectProviders(code);

      expect(contexts.length).toBeGreaterThan(0);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should work with typed context', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withTypedContext('TypedContext', 'string');
      const { code } = builder.build();

      const result = detectContextCreations(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with complete context scenario', () => {
      const builder = new ContextBuilder();
      builder.withCompleteContext('AppContext');
      const { code } = builder.build();

      const result = detectAllProviders(code);

      expect(result.contexts.length).toBeGreaterThan(0);
      expect(result.providers.length).toBeGreaterThan(0);
    });

    it('should work with multiple contexts scenario', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withMultipleContexts(['ThemeContext', 'UserContext', 'LocaleContext']);
      const { code } = builder.build();

      const result = detectContextCreations(code);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code', () => {
      expect(() => detectContextCreations(null)).not.toThrow();
      expect(() => detectProviders(null)).not.toThrow();
      expect(() => detectAllProviders(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => detectContextCreations(undefined)).not.toThrow();
      expect(() => detectProviders(undefined)).not.toThrow();
      expect(() => detectAllProviders(undefined)).not.toThrow();
    });

    it('should return empty arrays for invalid code', () => {
      expect(detectContextCreations('invalid {')).toEqual([]);
      expect(detectProviders('invalid {')).toEqual([]);
      
      const all = detectAllProviders('invalid {');
      expect(all.contexts).toEqual([]);
      expect(all.providers).toEqual([]);
    });

    it('should handle whitespace-only code', () => {
      expect(detectContextCreations('   \n\t   ')).toEqual([]);
      expect(detectProviders('   \n\t   ')).toEqual([]);
    });

    it('should handle code with only comments', () => {
      const code = `
        // createContext()
        /* <Context.Provider> */
      `;
      expect(detectContextCreations(code)).toEqual([]);
      expect(detectProviders(code)).toEqual([]);
    });

    it('should handle very long code', () => {
      const code = '// comment\n'.repeat(10000) + 'const ctx = createContext();';
      
      expect(() => detectContextCreations(code)).not.toThrow();
      const result = detectContextCreations(code);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
