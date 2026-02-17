# 📚 Estándares de Testing en OmnySystem

## 🎯 Filosofía General

Los tests son **documentación ejecutable** que garantiza que el código funciona como se espera. Un buen test:
1. **Lee fácilmente** - cualquier dev entiende qué se está testeando
2. **Aisla el comportamiento** - un test, un comportamiento
3. **Usa la API real** - tests que reflejan cómo se usa el código
4. **Falla claramente** - cuando falla, el mensaje explica por qué

---

## 📁 Estructura de Archivos 1:1

### Regla Principal
```
src/
└── layer-a-static/
    └── extractors/
        └── storage/
            ├── index.js           # Código fuente
            ├── StorageExtractor.js # Clase principal
            └── utils.js            # Utilidades

tests/
└── unit/
    └── layer-a-static/             # Mirror de src/
        └── extractors/
            └── storage/
                ├── index.test.js            # Test del módulo
                ├── StorageExtractor.test.js # Test de la clase
                └── utils.test.js            # Test de utilidades
```

### ¿Por qué 1:1?

| Ventaja | Explicación |
|---------|-------------|
| **Localización** | Si modificas `StorageExtractor.js`, el test está al lado |
| **Cobertura** | Fácil ver qué archivos no tienen tests |
| **Mantenimiento** | Eliminar código fuente = eliminar test correspondiente |
| **Naming** | `archivo.test.js` = test de `archivo.js` |

---

## 🧪 Tipos de Tests

### 1. Tests Unitarios (`tests/unit/`)

**Propósito**: Verificar que una función/clase hace lo que debe hacer.

```javascript
// ❌ MAL - Test genérico que no prueba comportamiento real
it('returns array', () => {
  const result = extractKeys(code);
  expect(Array.isArray(result)).toBe(true);
});

// ✅ BIEN - Test específico con assertion significativa
it('extracts localStorage keys from code', () => {
  const code = `localStorage.setItem('user', 'John');`;
  const result = extractKeys(code);
  
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({ key: 'user', operation: 'set', line: 1 });
});
```

### 2. Tests Funcionales (`tests/functional/`)

**Propósito**: Verificar que varios componentes trabajan juntos correctamente.

```javascript
describe('Storage Connections - Integration', () => {
  it('detects files sharing localStorage keys', () => {
    const fileResults = {
      'src/a.js': {
        localStorage: { all: [{ key: 'session' }], writes: [], reads: [] }
      },
      'src/b.js': {
        localStorage: { all: [{ key: 'session' }], writes: [], reads: [] }
      }
    };
    
    const connections = detectLocalStorageConnections(fileResults);
    
    expect(connections).toHaveLength(1);
    expect(connections[0].key).toBe('session');
    expect(connections[0].sourceFile).toBe('src/a.js');
  });
});
```

### 3. Tests de Contrato (`tests/contracts/`)

**Propósito**: Verificar que un módulo exporta lo que debe exportar.

```javascript
describe('storage-extractor contract', () => {
  it('exports required functions', async () => {
    const mod = await import('#layer-a/extractors/storage/index.js');
    
    expect(typeof mod.extractKeys).toBe('function');
    expect(typeof mod.extractReads).toBe('function');
    expect(typeof mod.extractWrites).toBe('function');
  });
});
```

---

## 📝 Plantillas de Tests

### Para una Función

```javascript
/**
 * @fileoverview Tests para extractKeys
 * @module tests/unit/layer-a-static/extractors/storage/extractKeys.test
 */

import { describe, it, expect } from 'vitest';
import { extractKeys } from '#layer-a/extractors/storage/index.js';

describe('extractKeys', () => {
  describe('happy path', () => {
    it('extracts single key', () => {
      const code = `localStorage.setItem('user', data);`;
      expect(extractKeys(code)).toEqual([
        { key: 'user', operation: 'set', line: 1 }
      ]);
    });

    it('extracts multiple keys', () => {
      const code = `
        localStorage.setItem('user', data);
        localStorage.getItem('token');
      `;
      expect(extractKeys(code)).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for no keys', () => {
      expect(extractKeys('const x = 1;')).toEqual([]);
    });

    it('handles empty string', () => {
      expect(extractKeys('')).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('handles null input', () => {
      expect(() => extractKeys(null)).not.toThrow();
    });
  });
});
```

### Para una Clase

```javascript
/**
 * @fileoverview Tests para StorageExtractor
 * @module tests/unit/layer-a-static/extractors/storage/StorageExtractor.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StorageExtractor } from '#layer-a/extractors/storage/StorageExtractor.js';

describe('StorageExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new StorageExtractor();
  });

  describe('constructor', () => {
    it('creates instance with default config', () => {
      expect(extractor.config).toBeDefined();
    });

    it('accepts custom config', () => {
      const custom = new StorageExtractor({ debug: true });
      expect(custom.config.debug).toBe(true);
    });
  });

  describe('extract', () => {
    it('returns extraction results', () => {
      const code = `localStorage.setItem('test', 1);`;
      const result = extractor.extract(code);
      
      expect(result.keys).toHaveLength(1);
    });
  });
});
```

---

## 🎨 Patrones de Assertion

### ✅ Usar `toEqual` para objetos completos

```javascript
expect(result).toEqual({
  key: 'user',
  operation: 'set',
  line: 1
});
```

### ✅ Usar `toContainEqual` para arrays

```javascript
expect(connections).toContainEqual({
  source: 'a.js',
  target: 'b.js',
  type: 'storage'
});
```

### ✅ Usar `toHaveProperty` para existencia

```javascript
expect(result).toHaveProperty('keys');
expect(result).toHaveProperty('metadata.timestamp');
```

### ✅ Usar `toThrow` para errores

```javascript
expect(() => riskyOperation()).toThrow();
expect(() => riskyOperation()).toThrow(Error);
expect(() => riskyOperation()).toThrow('invalid input');
```

---

## 🔧 Configuración

### Vitest Config (`vitest.config.js`)

```javascript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['tests/**', 'scripts/**']
    }
  }
});
```

### Path Aliases

En el código de tests usamos aliases:
```javascript
import { something } from '#layer-a/module/index.js';
//                      ^^^^^^^ alias para src/layer-a-static/
```

---

## 📊 Checklist de Quality

Antes de hacer commit de un test:

- [ ] El nombre del archivo sigue la convención `*.test.js`
- [ ] El test está en el directorio correcto (`unit/` o `functional/`)
- [ ] El test usa la API real del módulo (no mocks innecesarios)
- [ ] Las assertions son específicas (no solo `toBe(true)`)
- [ ] Los casos de edge están cubiertos
- [ ] El test pasa cuando el código funciona
- [ ] El test falla cuando el código rompe

---

## 🚀 Ejecutar Tests

```bash
# Todos los tests
npm test

# Solo unitarios
npm run test:unit

# Solo funcionales
npm run test:functional

# Un archivo específico
npx vitest run tests/unit/layer-a-static/extractors/storage/index.test.js

# Con coverage
npm run test:coverage

# Watch mode
npx vitest watch
```

---

## 📖 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [JavaScript Testing Patterns](https://github.com/testing-library/javascript-testing-library)