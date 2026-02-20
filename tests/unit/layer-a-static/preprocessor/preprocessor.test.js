/**
 * @fileoverview Tests para Omny Preprocessor Framework
 * 
 * Verifica que el preprocesador resuelve correctamente las ambigüedades
 * de # en JavaScript:
 * - Shebangs
 * - Private fields
 * - Pipeline topic tokens
 * 
 * @module tests/unit/layer-a-static/preprocessor
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ContextModel, CONTEXTS } from '#layer-a/preprocessor/context-model.js';
import { TokenClassifier, ACTIONS, HASH_TYPES, RuleBuilder } from '#layer-a/preprocessor/token-classifier.js';
import { JavaScriptContextHandler } from '#layer-a/preprocessor/handlers/javascript.js';
import { TypeScriptContextHandler } from '#layer-a/preprocessor/handlers/typescript.js';
import { PreprocessorEngine } from '#layer-a/preprocessor/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// ContextModel Tests
// ═══════════════════════════════════════════════════════════════════════

describe('ContextModel', () => {
  let context;

  beforeEach(() => {
    context = new ContextModel();
  });

  describe('Context Stack', () => {
    test('inicia en TOP_LEVEL', () => {
      expect(context.current()).toBe(CONTEXTS.TOP_LEVEL);
    });

    test('enter() agrega contexto al stack', () => {
      context.enter(CONTEXTS.CLASS_BODY);
      expect(context.current()).toBe(CONTEXTS.CLASS_BODY);
      expect(context.getAll()).toEqual([CONTEXTS.CLASS_BODY]);
    });

    test('exit() remueve el último contexto', () => {
      context.enter(CONTEXTS.CLASS_BODY);
      context.enter(CONTEXTS.FUNCTION_BODY);
      
      const exited = context.exit();
      
      expect(exited).toBe(CONTEXTS.FUNCTION_BODY);
      expect(context.current()).toBe(CONTEXTS.CLASS_BODY);
    });

    test('exit() en stack vacío retorna null', () => {
      expect(context.exit()).toBeNull();
    });

    test('múltiples contextos se apilan correctamente', () => {
      context.enter(CONTEXTS.CLASS_BODY);
      context.enter(CONTEXTS.FUNCTION_BODY);
      context.enter(CONTEXTS.ARROW_BODY);
      
      expect(context.getAll()).toEqual([
        CONTEXTS.CLASS_BODY,
        CONTEXTS.FUNCTION_BODY,
        CONTEXTS.ARROW_BODY
      ]);
    });
  });

  describe('Context Queries', () => {
    test('isIn() detecta contexto en cualquier posición del stack', () => {
      context.enter(CONTEXTS.CLASS_BODY);
      context.enter(CONTEXTS.FUNCTION_BODY);
      
      expect(context.isIn(CONTEXTS.CLASS_BODY)).toBe(true);
      expect(context.isIn(CONTEXTS.FUNCTION_BODY)).toBe(true);
      expect(context.isIn(CONTEXTS.PIPELINE_EXPR)).toBe(false);
    });

    test('isCurrent() solo detecta contexto en el top', () => {
      context.enter(CONTEXTS.CLASS_BODY);
      context.enter(CONTEXTS.FUNCTION_BODY);
      
      expect(context.isCurrent(CONTEXTS.CLASS_BODY)).toBe(false);
      expect(context.isCurrent(CONTEXTS.FUNCTION_BODY)).toBe(true);
    });

    test('isInAny() detecta cualquier contexto del array', () => {
      context.enter(CONTEXTS.CLASS_BODY);
      
      expect(context.isInAny([CONTEXTS.FUNCTION_BODY, CONTEXTS.CLASS_BODY])).toBe(true);
      expect(context.isInAny([CONTEXTS.FUNCTION_BODY, CONTEXTS.PIPELINE_EXPR])).toBe(false);
    });
  });

  describe('Depth Tracking', () => {
    test('incrementa y decrementa profundidad', () => {
      expect(context.getDepth('braces')).toBe(0);
      
      context.incrementDepth('braces');
      expect(context.getDepth('braces')).toBe(1);
      
      context.incrementDepth('braces');
      expect(context.getDepth('braces')).toBe(2);
      
      context.decrementDepth('braces');
      expect(context.getDepth('braces')).toBe(1);
    });

    test('no decrementa bajo 0', () => {
      context.decrementDepth('braces');
      expect(context.getDepth('braces')).toBe(0);
    });
  });

  describe('Token History', () => {
    test('pushToken() agrega tokens al historial', () => {
      context.pushToken('|>', 'operator');
      context.pushToken('{', 'bracket');
      
      const lastTokens = context.getLastTokens(2);
      expect(lastTokens).toEqual([
        { value: '|>', type: 'operator' },
        { value: '{', type: 'bracket' }
      ]);
    });

    test('historial tiene límite de tamaño', () => {
      for (let i = 0; i < 20; i++) {
        context.pushToken(`token${i}`, 'test');
      }
      
      // Debería mantener solo los últimos 10
      const all = context.getLastTokens(20);
      expect(all.length).toBeLessThanOrEqual(10);
    });

    test('matchPattern() detecta patrones', () => {
      context.pushToken('class', 'keyword');
      context.pushToken('{', 'bracket');
      
      expect(context.matchPattern(['class', '{'])).toBe(true);
      expect(context.matchPattern(['function', '{'])).toBe(false);
    });
  });

  describe('Snapshot/Restore', () => {
    test('snapshot() y restore() preservan estado', () => {
      context.enter(CONTEXTS.CLASS_BODY);
      context.incrementDepth('braces');
      context.pushToken('test', 'test');
      
      const snap = context.snapshot();
      
      context.enter(CONTEXTS.FUNCTION_BODY);
      context.incrementDepth('braces');
      
      context.restore(snap);
      
      expect(context.current()).toBe(CONTEXTS.CLASS_BODY);
      expect(context.getDepth('braces')).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TokenClassifier Tests
// ═══════════════════════════════════════════════════════════════════════

describe('TokenClassifier', () => {
  let classifier;
  let context;

  beforeEach(() => {
    context = new ContextModel();
    classifier = new TokenClassifier('javascript', context, []);
  });

  describe('Rule Management', () => {
    test('addRule() agrega reglas', () => {
      const rule = new RuleBuilder()
        .named('test_rule')
        .forToken('#')
        .withType(HASH_TYPES.UNKNOWN)
        .withAction(ACTIONS.KEEP)
        .matchWhen(() => ({ matched: true }))
        .build();
      
      classifier.addRule(rule);
      
      expect(classifier.rules.length).toBe(1);
    });

    test('validateRules() detecta reglas mal formadas', () => {
      classifier.addRule({ name: 'bad_rule' }); // Falta match function
      
      const result = classifier.validateRules();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('RuleBuilder', () => {
    test('crea reglas válidas', () => {
      const rule = new RuleBuilder()
        .named('test')
        .forToken('#')
        .withType(HASH_TYPES.PIPELINE_TOPIC)
        .withAction(ACTIONS.KEEP)
        .matchWhen((token) => ({ matched: token === '#' }))
        .build();
      
      expect(rule.name).toBe('test');
      expect(rule.token).toBe('#');
      expect(rule.type).toBe(HASH_TYPES.PIPELINE_TOPIC);
      expect(typeof rule.match).toBe('function');
    });

    test('lanza error si falta name', () => {
      expect(() => {
        new RuleBuilder()
          .forToken('#')
          .matchWhen(() => ({ matched: true }))
          .build();
      }).toThrow('Rule requires a name');
    });
  });

  describe('Classification', () => {
    test('retorna LITERAL si no hay reglas', () => {
      const result = classifier.classify('#', 0, { nextChar: '!' });
      
      expect(result.type).toBe('LITERAL');
      expect(result.action).toBe(ACTIONS.KEEP);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// JavaScriptContextHandler Tests
// ═══════════════════════════════════════════════════════════════════════

describe('JavaScriptContextHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new JavaScriptContextHandler();
  });

  describe('Rules', () => {
    test('tiene 4 reglas para #', () => {
      const rules = handler.getRules();
      const hashRules = rules.filter(r => r.token === '#');
      
      expect(hashRules.length).toBe(4);
    });

    test('nombres de reglas son descriptivos', () => {
      const rules = handler.getRules();
      const names = rules.map(r => r.name);
      
      expect(names).toContain('shebang');
      expect(names).toContain('private_field_access');
      expect(names).toContain('private_field_declaration');
      expect(names).toContain('pipeline_topic');
    });
  });

  describe('Feature Detection', () => {
    test('detecta shebang', () => {
      const result = handler.detectFeatures('#!/usr/bin/env node\nconst x = 1;');
      
      expect(result.features).toContain('shebang');
      expect(result.needsPreprocessing).toBe(true);
    });

    test('detecta private fields', () => {
      const result = handler.detectFeatures('class A { #field = 1; }');
      
      expect(result.features).toContain('private_fields');
    });

    test('detecta pipeline operator', () => {
      const result = handler.detectFeatures('const x = data |> JSON.parse');
      
      expect(result.features).toContain('pipeline_operator');
    });

    test('detecta múltiples features', () => {
      const result = handler.detectFeatures('#!/usr/bin/env node\nclass A { #f = 1; }\ndata |> f');
      
      expect(result.features).toContain('shebang');
      expect(result.features).toContain('private_fields');
      expect(result.features).toContain('pipeline_operator');
    });

    test('sin features problemáticas', () => {
      const result = handler.detectFeatures('const x = 1 + 2;');
      
      expect(result.needsPreprocessing).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PreprocessorEngine Tests
// ═══════════════════════════════════════════════════════════════════════

describe('PreprocessorEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PreprocessorEngine('javascript');
  });

  describe('Initialization', () => {
    test('crea componentes correctamente', () => {
      expect(engine.context).toBeDefined();
      expect(engine.handler).toBeDefined();
      expect(engine.classifier).toBeDefined();
    });

    test('lanza error para lenguaje no soportado', () => {
      expect(() => {
        new PreprocessorEngine('python');
      }).toThrow('Lenguaje no soportado');
    });
  });

  describe('Preprocessing', () => {
    test('retorna código sin cambios si no hay features', () => {
      const code = 'const x = 1 + 2;';
      const result = engine.preprocess(code);
      
      expect(result.code).toBe(code);
      expect(result.transformations).toEqual([]);
    });

    test('procesa shebang', () => {
      const code = '#!/usr/bin/env node\nconst x = 1;';
      const result = engine.preprocess(code);
      
      expect(result.code).toContain('__OMNY_SHEBANG__');
      expect(result.transformations.length).toBe(1);
      expect(result.transformations[0].type).toBe(HASH_TYPES.SHEBANG);
      expect(result.features).toContain('shebang');
    });

    test('mantiene pipeline operator sin cambios', () => {
      // Pipeline operator con # topic token - el # debe mantenerse
      const code = 'const result = data |> f(#)';
      const result = engine.preprocess(code);
      
      // El # en pipeline no debe ser transformado
      expect(result.code).toContain('#');
    });

    test('crea placeholders únicos para private fields', () => {
      const code = 'class A { #field1 = 1; #field2 = 2; }';
      const result = engine.preprocess(code);
      
      const placeholders = result.transformations.map(t => t.placeholder);
      const uniquePlaceholders = new Set(placeholders);
      
      expect(uniquePlaceholders.size).toBe(placeholders.length);
    });
  });

  describe('Validation', () => {
    test('validateTransformations() detecta problemas', () => {
      // Agregar transformación inválida manualmente
      engine.transformations = [
        { placeholder: '', original: '#' } // placeholder vacío
      ];
      
      const result = engine.validateTransformations();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Convenience Functions', () => {
    test('needsPreprocessing() funciona', () => {
      expect(engine.needsPreprocessing('#!/usr/bin/env node\ncode')).toBe(true);
      expect(engine.needsPreprocessing('const x = 1;')).toBe(false);
    });

    test('getFeatures() retorna información', () => {
      const features = engine.getFeatures('#!/usr/bin/env node\nclass A { #f = 1; }');
      
      expect(features.features).toContain('shebang');
      expect(features.features).toContain('private_fields');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Integration Tests
// ═══════════════════════════════════════════════════════════════════════

describe('Preprocessor Integration', () => {
  let engine;

  beforeEach(() => {
    engine = new PreprocessorEngine('javascript', { debug: true });
  });

  describe('Complex Scenarios', () => {
    test('archivo con shebang + private fields + pipeline', () => {
      const code = `#!/usr/bin/env node

class Processor {
  #data = null;
  
  process(input) {
    return input
      |> JSON.parse(#)
      |> this.#transform(#);
  }
  
  #transform(data) {
    return data;
  }
}`;
      
      const result = engine.preprocess(code);
      
      // Verificar que se detectaron todas las features
      expect(result.features).toContain('shebang');
      expect(result.features).toContain('private_fields');
      expect(result.features).toContain('pipeline_operator');
      
      // Verificar que hay transformaciones
      expect(result.transformations.length).toBeGreaterThan(0);
      
      // Verificar debug info
      expect(result.debug).toBeDefined();
    });

    test('código con solo private fields', () => {
      const code = `
class Counter {
  #count = 0;
  
  increment() {
    this.#count++;
  }
  
  getCount() {
    return this.#count;
  }
}`;
      
      const result = engine.preprocess(code);
      
      expect(result.features).toContain('private_fields');
      expect(result.transformations.some(t => t.type === HASH_TYPES.PRIVATE_FIELD)).toBe(true);
      expect(result.transformations.some(t => t.type === HASH_TYPES.PRIVATE_FIELD_ACCESS)).toBe(true);
    });

    test('código con solo pipeline operators', () => {
      const code = `
const process = (data) => 
  data
  |> JSON.parse(#)
  |> #.items
  |> #.filter(x => x.active)
  |> #.map(x => x.name);
`;
      
      const result = engine.preprocess(code);
      
      expect(result.features).toContain('pipeline_operator');
      // Pipeline topic tokens se mantienen, no se transforman
      expect(result.code).toContain('#');
    });
  });

  describe('Edge Cases', () => {
    test('archivo vacío', () => {
      const result = engine.preprocess('');
      
      expect(result.code).toBe('');
      expect(result.transformations).toEqual([]);
    });

    test('solo shebang', () => {
      const result = engine.preprocess('#!/usr/bin/env node');
      
      expect(result.transformations.length).toBe(1);
    });

    test('private field sin class body no causa error', () => {
      // Esto no debería pasar en código válido, pero el preprocesador
      // debe manejarlo gracefully
      const result = engine.preprocess('const x = obj.#field;');
      
      // Debería procesar sin crashear
      expect(result).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TypeScript Handler Tests
// ═══════════════════════════════════════════════════════════════════════

describe('TypeScriptContextHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new TypeScriptContextHandler();
  });

  test('extiende JavaScript handler', () => {
    expect(handler.getRules().length).toBeGreaterThanOrEqual(4);
  });

  test('detecta interfaces', () => {
    const result = handler.detectFeatures('interface User { name: string; }');
    
    expect(result.features).toContain('interface');
  });

  test('detecta type aliases', () => {
    const result = handler.detectFeatures('type Name = string;');
    
    expect(result.features).toContain('type_alias');
  });

  test('detecta type annotations', () => {
    const result = handler.detectFeatures('function greet(name: string): void {}');
    
    expect(result.features).toContain('type_annotations');
  });
});