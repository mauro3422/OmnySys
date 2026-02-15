/**
 * @fileoverview consumer-detector.test.js
 * 
 * Tests for consumer-detector.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/context/consumer-detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectUseContext,
  detectContextConsumers,
  detectUseContextNew,
  detectAllConsumers
} from '#layer-a/extractors/state-management/context/consumer-detector.js';
import { ContextType } from '#layer-a/extractors/state-management/constants.js';
import { ContextBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Consumer Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectUseContext).toBe('function');
      expect(typeof detectContextConsumers).toBe('function');
      expect(typeof detectUseContextNew).toBe('function');
      expect(typeof detectAllConsumers).toBe('function');
    });
  });

  // ============================================================================
  // detectUseContext
  // ============================================================================
  describe('detectUseContext', () => {
    it('should return empty array for empty code', () => {
      const result = detectUseContext('');
      expect(result).toEqual([]);
    });

    it('should detect useContext hook', () => {
      const code = 'const theme = useContext(ThemeContext);';
      const result = detectUseContext(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ContextType.USE_CONTEXT);
      expect(result[0].contextName).toBe('ThemeContext');
    });

    it('should detect multiple useContext hooks', () => {
      const code = `
        const theme = useContext(ThemeContext);
        const auth = useContext(AuthContext);
      `;
      const result = detectUseContext(code);

      expect(result).toHaveLength(2);
      expect(result[0].contextName).toBe('ThemeContext');
      expect(result[1].contextName).toBe('AuthContext');
    });

    it('should include line number', () => {
      const code = 'const theme = useContext(ThemeContext);';
      const result = detectUseContext(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
      expect(result[0].line).toBeGreaterThanOrEqual(1);
    });

    it('should detect useContext with complex expressions', () => {
      const code = `
        const { user, login } = useContext(AuthContext);
        const value = useContext(MyContext);
      `;
      const result = detectUseContext(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle useContext with whitespace variations', () => {
      const codes = [
        'useContext(ThemeContext)',
        'useContext( ThemeContext )',
        'useContext(  ThemeContext  )'
      ];

      codes.forEach(code => {
        const result = detectUseContext(code);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // detectContextConsumers
  // ============================================================================
  describe('detectContextConsumers', () => {
    it('should return empty array for empty code', () => {
      const result = detectContextConsumers('');
      expect(result).toEqual([]);
    });

    it('should detect Context.Consumer usage', () => {
      const code = '<ThemeContext.Consumer>{value => <div>{value}</div>}</ThemeContext.Consumer>';
      const result = detectContextConsumers(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ContextType.CONTEXT_CONSUMER);
      expect(result[0].contextName).toBe('ThemeContext');
    });

    it('should detect multiple Context.Consumer usages', () => {
      const code = `
        <ThemeContext.Consumer>{value => <div>{value}</div>}</ThemeContext.Consumer>
        <AuthContext.Consumer>{value => <span>{value}</span>}</AuthContext.Consumer>
      `;
      const result = detectContextConsumers(code);

      expect(result).toHaveLength(2);
    });

    it('should include line number', () => {
      const code = '<ThemeContext.Consumer>{value => value}</ThemeContext.Consumer>';
      const result = detectContextConsumers(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect standalone Context.Consumer references', () => {
      const code = 'const Consumer = ThemeContext.Consumer;';
      const result = detectContextConsumers(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].contextName).toBe('ThemeContext');
    });
  });

  // ============================================================================
  // detectUseContextNew
  // ============================================================================
  describe('detectUseContextNew (React 18+)', () => {
    it('should return empty array for empty code', () => {
      const result = detectUseContextNew('');
      expect(result).toEqual([]);
    });

    it('should detect use() hook with context', () => {
      const code = 'const theme = use(ThemeContext);';
      const result = detectUseContextNew(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ContextType.USE_CONTEXT_NEW);
      expect(result[0].contextName).toBe('ThemeContext');
    });

    it('should detect multiple use() hooks', () => {
      const code = `
        const theme = use(ThemeContext);
        const auth = use(AuthContext);
      `;
      const result = detectUseContextNew(code);

      expect(result).toHaveLength(2);
    });

    it('should include line number', () => {
      const code = 'const theme = use(ThemeContext);';
      const result = detectUseContextNew(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should distinguish from regular function calls', () => {
      const code = `
        const theme = use(ThemeContext);
        const result = myFunction(something);
      `;
      const result = detectUseContextNew(code);

      // Should only detect the use() call
      expect(result.length).toBe(1);
      expect(result[0].contextName).toBe('ThemeContext');
    });
  });

  // ============================================================================
  // detectAllConsumers
  // ============================================================================
  describe('detectAllConsumers', () => {
    it('should return empty array for empty code', () => {
      const result = detectAllConsumers('');
      expect(result).toEqual([]);
    });

    it('should combine all consumer types', () => {
      const code = `
        const theme = useContext(ThemeContext);
        <AuthContext.Consumer>{value => value}</AuthContext.Consumer>
        const data = use(DataContext);
      `;
      const result = detectAllConsumers(code);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should include type for each consumer', () => {
      const code = `
        const theme = useContext(ThemeContext);
        const data = use(DataContext);
      `;
      const result = detectAllConsumers(code);

      result.forEach(consumer => {
        expect(consumer).toHaveProperty('type');
        expect(Object.values(ContextType)).toContain(consumer.type);
      });
    });

    it('should include contextName for each consumer', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withUseContext('ThemeContext');
      const { code } = builder.build();

      const result = detectAllConsumers(code);

      result.forEach(consumer => {
        expect(consumer).toHaveProperty('contextName');
        expect(typeof consumer.contextName).toBe('string');
      });
    });

    it('should include line number for each consumer', () => {
      const code = `
        const theme = useContext(ThemeContext);
        const auth = useContext(AuthContext);
      `;
      const result = detectAllConsumers(code);

      result.forEach(consumer => {
        expect(consumer).toHaveProperty('line');
        expect(typeof consumer.line).toBe('number');
      });
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ContextBuilder', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withContext('TestContext')
        .withUseContext('TestContext', 'value');
      const { code } = builder.build();

      const result = detectUseContext(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].contextName).toBe('TestContext');
    });

    it('should work with ContextBuilder Consumer component', () => {
      const builder = new ContextBuilder();
      builder.withReactImports()
        .withContext('TestContext')
        .withConsumerComponent('TestContext');
      const { code } = builder.build();

      const result = detectContextConsumers(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with ContextBuilder React 18+', () => {
      const builder = new ContextBuilder();
      builder.withReact18Imports()
        .withContext('TestContext')
        .withUseHook('TestContext');
      const { code } = builder.build();

      const result = detectUseContextNew(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].contextName).toBe('TestContext');
    });

    it('should work with complete context from factory', () => {
      const builder = new ContextBuilder();
      builder.withCompleteContext('AppContext');
      const { code } = builder.build();

      const result = detectAllConsumers(code);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code', () => {
      expect(() => detectUseContext(null)).not.toThrow();
      expect(() => detectContextConsumers(null)).not.toThrow();
      expect(() => detectUseContextNew(null)).not.toThrow();
      expect(() => detectAllConsumers(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => detectUseContext(undefined)).not.toThrow();
      expect(() => detectContextConsumers(undefined)).not.toThrow();
      expect(() => detectUseContextNew(undefined)).not.toThrow();
      expect(() => detectAllConsumers(undefined)).not.toThrow();
    });

    it('should return empty array for invalid code', () => {
      expect(detectUseContext('invalid {')).toEqual([]);
      expect(detectContextConsumers('invalid {')).toEqual([]);
      expect(detectUseContextNew('invalid {')).toEqual([]);
    });

    it('should handle whitespace-only code', () => {
      expect(detectUseContext('   \n\t   ')).toEqual([]);
      expect(detectContextConsumers('   \n\t   ')).toEqual([]);
      expect(detectUseContextNew('   \n\t   ')).toEqual([]);
    });

    it('should handle code with only comments', () => {
      const code = `
        // useContext(ThemeContext)
        /* <ThemeContext.Consumer> */
      `;
      expect(detectUseContext(code)).toEqual([]);
      expect(detectContextConsumers(code)).toEqual([]);
    });
  });
});
