/**
 * @fileoverview context-extractor.test.js
 * 
 * Tests for context-extractor.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/context/context-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractContext,
  extractContexts,
  extractProviders,
  extractConsumers
} from '#layer-a/extractors/state-management/context/context-extractor.js';
import { ContextType } from '#layer-a/extractors/state-management/constants.js';
import { ContextBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Context Extractor', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof extractContext).toBe('function');
      expect(typeof extractContexts).toBe('function');
      expect(typeof extractProviders).toBe('function');
      expect(typeof extractConsumers).toBe('function');
    });
  });

  // ============================================================================
  // extractContext
  // ============================================================================
  describe('extractContext', () => {
    it('should return object with required fields', () => {
      const result = extractContext('');

      expect(result).toHaveProperty('contexts');
      expect(result).toHaveProperty('providers');
      expect(result).toHaveProperty('consumers');
      expect(result).toHaveProperty('all');
    });

    it('should return arrays for all fields', () => {
      const result = extractContext('');

      expect(Array.isArray(result.contexts)).toBe(true);
      expect(Array.isArray(result.providers)).toBe(true);
      expect(Array.isArray(result.consumers)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractContext('');

      expect(result.contexts).toHaveLength(0);
      expect(result.providers).toHaveLength(0);
      expect(result.consumers).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should extract contexts', () => {
      const code = 'const MyContext = createContext();';
      const result = extractContext(code);

      expect(result.contexts.length).toBeGreaterThan(0);
      expect(result.contexts[0].type).toBe(ContextType.CONTEXT_CREATION);
    });

    it('should extract providers', () => {
      const code = '<MyContext.Provider value={value}></MyContext.Provider>';
      const result = extractContext(code);

      expect(result.providers.length).toBeGreaterThan(0);
      expect(result.providers[0].type).toBe(ContextType.CONTEXT_PROVIDER);
    });

    it('should extract consumers', () => {
      const code = 'const value = useContext(MyContext);';
      const result = extractContext(code);

      expect(result.consumers.length).toBeGreaterThan(0);
      expect(result.consumers[0].type).toBe(ContextType.USE_CONTEXT);
    });

    it('should combine all into all array', () => {
      const code = `
        const MyContext = createContext();
        <MyContext.Provider value={value}></MyContext.Provider>
        const value = useContext(MyContext);
      `;
      const result = extractContext(code);

      expect(result.all.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle complex context file', () => {
      const builder = new ContextBuilder();
      builder.withCompleteContext('AppContext');
      const { code } = builder.build();

      const result = extractContext(code);

      expect(result.contexts.length).toBeGreaterThan(0);
      expect(result.providers.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // extractContexts
  // ============================================================================
  describe('extractContexts', () => {
    it('should return empty array for empty code', () => {
      const result = extractContexts('');
      expect(result).toEqual([]);
    });

    it('should return only contexts', () => {
      const code = `
        const MyContext = createContext();
        <MyContext.Provider value={value}></MyContext.Provider>
      `;
      const result = extractContexts(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(c => c.type === ContextType.CONTEXT_CREATION)).toBe(true);
    });

    it('should not include providers or consumers', () => {
      const code = `
        const MyContext = createContext();
        <MyContext.Provider value={value}></MyContext.Provider>
        const value = useContext(MyContext);
      `;
      const result = extractContexts(code);

      expect(result.every(c => c.type === ContextType.CONTEXT_CREATION)).toBe(true);
    });
  });

  // ============================================================================
  // extractProviders
  // ============================================================================
  describe('extractProviders', () => {
    it('should return empty array for empty code', () => {
      const result = extractProviders('');
      expect(result).toEqual([]);
    });

    it('should return only providers', () => {
      const code = `
        <MyContext.Provider value={value}></MyContext.Provider>
        const MyContext = createContext();
      `;
      const result = extractProviders(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(p => p.type === ContextType.CONTEXT_PROVIDER)).toBe(true);
    });

    it('should not include contexts or consumers', () => {
      const code = `
        const MyContext = createContext();
        <MyContext.Provider value={value}></MyContext.Provider>
        const value = useContext(MyContext);
      `;
      const result = extractProviders(code);

      expect(result.every(p => p.type === ContextType.CONTEXT_PROVIDER)).toBe(true);
    });

    it('should include contextName for each provider', () => {
      const code = '<ThemeContext.Provider value={theme}></ThemeContext.Provider>';
      const result = extractProviders(code);

      expect(result[0]).toHaveProperty('contextName', 'ThemeContext');
    });
  });

  // ============================================================================
  // extractConsumers
  // ============================================================================
  describe('extractConsumers', () => {
    it('should return empty array for empty code', () => {
      const result = extractConsumers('');
      expect(result).toEqual([]);
    });

    it('should return only consumers', () => {
      const code = `
        const value = useContext(MyContext);
        const MyContext = createContext();
      `;
      const result = extractConsumers(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(c => 
        c.type === ContextType.USE_CONTEXT ||
        c.type === ContextType.CONTEXT_CONSUMER ||
        c.type === ContextType.USE_CONTEXT_NEW
      )).toBe(true);
    });

    it('should detect all consumer types', () => {
      const code = `
        const value = useContext(MyContext);
        <MyContext.Consumer>{value => value}</MyContext.Consumer>
        const data = use(NewContext);
      `;
      const result = extractConsumers(code);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should include contextName for each consumer', () => {
      const code = 'const theme = useContext(ThemeContext);';
      const result = extractConsumers(code);

      expect(result[0]).toHaveProperty('contextName', 'ThemeContext');
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ContextBuilder complete context', () => {
      const builder = new ContextBuilder();
      builder.withCompleteContext('TestContext');
      const { code } = builder.build();

      const result = extractContext(code);

      expect(result.contexts.length).toBeGreaterThan(0);
      expect(result.providers.length).toBeGreaterThan(0);
    });

    it('should work with ContextBuilder theme context', () => {
      const builder = new ContextBuilder();
      builder.withThemeContext();
      const { code } = builder.build();

      const result = extractContext(code);

      expect(result.contexts.some(c => c.type === ContextType.CONTEXT_CREATION)).toBe(true);
    });

    it('should work with ContextBuilder auth context', () => {
      const builder = new ContextBuilder();
      builder.withAuthContext();
      const { code } = builder.build();

      const contexts = extractContexts(code);
      const providers = extractProviders(code);
      const consumers = extractConsumers(code);

      expect(contexts.length).toBeGreaterThan(0);
      expect(providers.length).toBeGreaterThan(0);
      expect(consumers.length).toBeGreaterThan(0);
    });

    it('should work with multiple contexts', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withMultipleContexts(['ThemeContext', 'UserContext', 'LocaleContext']);
      const { code } = builder.build();

      const result = extractContext(code);

      expect(result.contexts.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code', () => {
      expect(() => extractContext(null)).not.toThrow();
      expect(() => extractContexts(null)).not.toThrow();
      expect(() => extractProviders(null)).not.toThrow();
      expect(() => extractConsumers(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => extractContext(undefined)).not.toThrow();
      expect(() => extractContexts(undefined)).not.toThrow();
      expect(() => extractProviders(undefined)).not.toThrow();
      expect(() => extractConsumers(undefined)).not.toThrow();
    });

    it('should return empty arrays for invalid code', () => {
      const result = extractContext('invalid {');

      expect(Array.isArray(result.contexts)).toBe(true);
      expect(Array.isArray(result.providers)).toBe(true);
      expect(Array.isArray(result.consumers)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should handle whitespace-only code', () => {
      const result = extractContext('   \n\t   ');

      expect(result.contexts).toHaveLength(0);
      expect(result.providers).toHaveLength(0);
      expect(result.consumers).toHaveLength(0);
    });

    it('should handle code with only comments', () => {
      const code = `
        // createContext()
        /* <Context.Provider> */
      `;
      const result = extractContext(code);

      expect(result.contexts).toHaveLength(0);
      expect(result.providers).toHaveLength(0);
      expect(result.consumers).toHaveLength(0);
    });
  });
});
