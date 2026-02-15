/**
 * @fileoverview selector-detector.test.js
 * 
 * Tests for selector-detector.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/redux/selector-detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectUseSelectors,
  detectConnectHOC,
  detectMapStateFunctions,
  detectAllSelectors
} from '#layer-a/extractors/state-management/redux/selector-detector.js';
import { ReduxType } from '#layer-a/extractors/state-management/constants.js';
import { ReduxBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Selector Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectUseSelectors).toBe('function');
      expect(typeof detectConnectHOC).toBe('function');
      expect(typeof detectMapStateFunctions).toBe('function');
      expect(typeof detectAllSelectors).toBe('function');
    });
  });

  // ============================================================================
  // detectUseSelectors
  // ============================================================================
  describe('detectUseSelectors', () => {
    it('should return empty array for empty code', () => {
      const result = detectUseSelectors('');
      expect(result).toEqual([]);
    });

    it('should detect useSelector hook', () => {
      const code = 'const value = useSelector(state => state.counter.value);';
      const result = detectUseSelectors(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.USE_SELECTOR);
    });

    it('should extract state paths from selector', () => {
      const code = 'const value = useSelector(state => state.counter.value);';
      const result = detectUseSelectors(code);

      expect(result[0].paths).toContain('state.counter.value');
    });

    it('should extract selector body', () => {
      const code = 'const value = useSelector(state => state.counter.value);';
      const result = detectUseSelectors(code);

      expect(result[0]).toHaveProperty('body');
      expect(typeof result[0].body).toBe('string');
    });

    it('should include line number', () => {
      const code = 'const value = useSelector(state => state.counter.value);';
      const result = detectUseSelectors(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect multiple useSelector hooks', () => {
      const code = `
        const count = useSelector(state => state.counter.value);
        const user = useSelector(state => state.user.name);
      `;
      const result = detectUseSelectors(code);

      expect(result).toHaveLength(2);
    });

    it('should detect useSelector with destructuring', () => {
      const code = 'const { count } = useSelector(state => state.counter);';
      const result = detectUseSelectors(code);

      expect(result).toHaveLength(1);
    });

    it('should detect useSelector with parenthesized state', () => {
      const code = 'const value = useSelector((state) => state.value);';
      const result = detectUseSelectors(code);

      expect(result).toHaveLength(1);
    });

    it('should detect multiple state paths in single selector', () => {
      const code = 'const data = useSelector(state => state.user.name + state.user.email);';
      const result = detectUseSelectors(code);

      expect(result[0].paths.length).toBeGreaterThan(0);
    });

    it('should truncate long selector bodies', () => {
      const longPath = 'state.' + 'a.'.repeat(100) + 'value';
      const code = `const v = useSelector(state => ${longPath});`;
      const result = detectUseSelectors(code);

      expect(result[0].body.length).toBeLessThanOrEqual(103);
    });
  });

  // ============================================================================
  // detectConnectHOC
  // ============================================================================
  describe('detectConnectHOC', () => {
    it('should return empty array for empty code', () => {
      const result = detectConnectHOC('');
      expect(result).toEqual([]);
    });

    it('should detect connect HOC', () => {
      const code = 'export default connect(mapStateToProps)(Component);';
      const result = detectConnectHOC(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.CONNECT_HOC);
    });

    it('should extract mapState function name', () => {
      const code = 'connect(mapStateToProps)(Component);';
      const result = detectConnectHOC(code);

      expect(result[0].mapState).toBe('mapStateToProps');
    });

    it('should extract mapDispatch function name', () => {
      const code = 'connect(mapStateToProps, mapDispatchToProps)(Component);';
      const result = detectConnectHOC(code);

      expect(result[0].mapDispatch).toBe('mapDispatchToProps');
    });

    it('should include line number', () => {
      const code = 'connect(mapStateToProps)(Component);';
      const result = detectConnectHOC(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect multiple connect usages', () => {
      const code = `
        connect(mapState1)(Component1);
        connect(mapState2)(Component2);
      `;
      const result = detectConnectHOC(code);

      expect(result).toHaveLength(2);
    });

    it('should handle connect without mapState', () => {
      const code = 'connect(null, mapDispatch)(Component);';
      const result = detectConnectHOC(code);

      expect(result).toHaveLength(1);
    });

    it('should handle connect with only mapState', () => {
      const code = 'connect(mapStateToProps)(Component);';
      const result = detectConnectHOC(code);

      expect(result[0].mapState).toBe('mapStateToProps');
      expect(result[0].mapDispatch).toBeUndefined();
    });
  });

  // ============================================================================
  // detectMapStateFunctions
  // ============================================================================
  describe('detectMapStateFunctions', () => {
    it('should return empty array for empty code', () => {
      const result = detectMapStateFunctions('');
      expect(result).toEqual([]);
    });

    it('should detect mapStateToProps function', () => {
      const code = 'const mapStateToProps = (state) => ({ count: state.counter });';
      const result = detectMapStateFunctions(code);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(ReduxType.MAP_STATE_FUNCTION);
    });

    it('should extract function name', () => {
      const code = 'const mapStateToProps = (state) => ({ count: state.counter });';
      const result = detectMapStateFunctions(code);

      expect(result[0].name).toBe('mapStateToProps');
    });

    it('should include line number', () => {
      const code = 'const mapStateToProps = (state) => ({ count: state.counter });';
      const result = detectMapStateFunctions(code);

      expect(result[0]).toHaveProperty('line');
      expect(typeof result[0].line).toBe('number');
    });

    it('should detect function declaration', () => {
      const code = 'function mapStateToProps(state) { return { count: state.counter }; }';
      const result = detectMapStateFunctions(code);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('mapStateToProps');
    });

    it('should detect variations of mapState function names', () => {
      const codes = [
        'const mapStateToProps = () => {};',
        'const mapState = () => {};',
        'const getStateProps = () => {};'
      ];

      codes.forEach(code => {
        const result = detectMapStateFunctions(code);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should detect multiple mapState functions', () => {
      const code = `
        const mapStateToProps1 = (state) => state;
        const mapStateToProps2 = (state) => state;
      `;
      const result = detectMapStateFunctions(code);

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // detectAllSelectors
  // ============================================================================
  describe('detectAllSelectors', () => {
    it('should return empty array for empty code', () => {
      const result = detectAllSelectors('');
      expect(result).toEqual([]);
    });

    it('should combine all selector types', () => {
      const code = `
        const value = useSelector(state => state.value);
        connect(mapStateToProps)(Component);
        const mapStateToProps = (state) => state;
      `;
      const result = detectAllSelectors(code);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should include type for each selector', () => {
      const code = `
        const value = useSelector(state => state.value);
        connect(mapState)(Component);
        const mapStateToProps = (state) => state;
      `;
      const result = detectAllSelectors(code);

      result.forEach(selector => {
        expect(selector).toHaveProperty('type');
        expect(Object.values(ReduxType)).toContain(selector.type);
      });
    });

    it('should include line number for each selector', () => {
      const code = `
        const a = useSelector(state => state.a);
        const b = useSelector(state => state.b);
      `;
      const result = detectAllSelectors(code);

      result.forEach(selector => {
        expect(selector).toHaveProperty('line');
        expect(typeof selector.line).toBe('number');
      });
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with ReduxBuilder useSelector', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports()
        .withUseSelector('state.user.name', 'userName');
      const { code } = builder.build();

      const result = detectUseSelectors(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].paths).toContain('state.user.name');
    });

    it('should work with ReduxBuilder connect HOC', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports()
        .withConnectHOC('mapStateToProps', 'mapDispatchToProps');
      const { code } = builder.build();

      const result = detectConnectHOC(code);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with ReduxBuilder mapState function', () => {
      const builder = new ReduxBuilder();
      builder.withReactReduxImports()
        .withMapStateFunction('mapStateToProps', { user: 'state.user' });
      const { code } = builder.build();

      const result = detectMapStateFunctions(code);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('mapStateToProps');
    });

    it('should work with ReduxBuilder legacy connect component', () => {
      const builder = new ReduxBuilder();
      builder.withLegacyConnectComponent();
      const { code } = builder.build();

      const result = detectAllSelectors(code);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle null code', () => {
      expect(() => detectUseSelectors(null)).not.toThrow();
      expect(() => detectConnectHOC(null)).not.toThrow();
      expect(() => detectMapStateFunctions(null)).not.toThrow();
      expect(() => detectAllSelectors(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => detectUseSelectors(undefined)).not.toThrow();
      expect(() => detectConnectHOC(undefined)).not.toThrow();
      expect(() => detectMapStateFunctions(undefined)).not.toThrow();
      expect(() => detectAllSelectors(undefined)).not.toThrow();
    });

    it('should return empty array for invalid code', () => {
      expect(detectUseSelectors('invalid {')).toEqual([]);
      expect(detectConnectHOC('invalid {')).toEqual([]);
      expect(detectMapStateFunctions('invalid {')).toEqual([]);
    });

    it('should handle whitespace-only code', () => {
      expect(detectUseSelectors('   \n\t   ')).toEqual([]);
      expect(detectConnectHOC('   \n\t   ')).toEqual([]);
    });

    it('should handle code with only comments', () => {
      const code = `
        // useSelector(state => state.value)
        /* connect(mapState)(Component) */
      `;
      expect(detectUseSelectors(code)).toEqual([]);
      expect(detectConnectHOC(code)).toEqual([]);
    });
  });
});
