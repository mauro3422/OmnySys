# 🧪 Testing - OmnySys

**Guía de Testing Oficial**

---

## 🚀 Quick Start

```bash
# Todos los tests
npm test

# Solo unit tests (rápido - 2 min)
npm run test:unit

# Solo Layer A Core
npm run test:layer-a:core

# Tests de contrato (obligatorio)
npm run test:contracts

# Modo watch (desarrollo)
npm run test:watch

# Con cobertura
npm run test:coverage
```

---

## 📁 Estructura

```
tests/
├── config/           # Configuraciones de Vitest
├── contracts/        # Tests de contrato (OBLIGATORIOS)
├── factories/        # Generadores de tests
├── fixtures/         # Datos de prueba
├── unit/            # Tests unitarios por sistema
├── integration/     # Tests de integración
├── e2e/            # End-to-end tests
└── performance/     # Benchmarks
```

---

## 🏗️ Arquitectura

Ver [ARCHITECTURE_TESTING.md](../docs/ARCHITECTURE_TESTING.md) para documentación completa.

### Principios
1. **DRY**: Usar factories y parametrización
2. **Contract-First**: Todos los componentes cumplen contratos
3. **Pirámide**: 80% unit, 15% integration, 5% e2e
4. **Fast**: Tests < 1s cada uno
5. **Determinístico**: Mismo input = mismo output

---

## 📝 Agregar Tests

### Para un nuevo extractor:

```javascript
// tests/unit/layer-a/extractors/my-lang.test.js
import { createExtractorSuite } from '../../factories/extractor.factory.js';
import { parseMyLang } from '#layer-a/parser/my-lang.js';

createExtractorSuite({
  name: 'MyLanguage',
  extensions: ['my'],
  parseFunction: (code, ext) => parseMyLang(code),
  fixtures: {
    empty: '',
    my: {
      withImports: 'import x from "y"',
      withExports: 'export x',
    },
  },
});
```

Los **contract tests** se ejecutan automáticamente.

---

## 🔍 Debugging

```bash
# Verbose output
npx vitest run --reporter=verbose

# Solo un archivo
npx vitest run tests/unit/layer-a/parser.test.js

# Con logs
npx vitest run --reporter=verbose --no-coverage 2>&1 | head -100
```

---

## 📊 Cobertura

| Sistema | Objetivo | Actual |
|---------|----------|--------|
| Layer A Core | 95% | 97% ✅ |
| Layer A Extractors | 80% | - |
| Layer B | 75% | - |
| Layer C | 75% | - |

---

## 🤝 Contribuir

1. Seguir [ARCHITECTURE_TESTING.md](../docs/ARCHITECTURE_TESTING.md)
2. Usar factories cuando sea posible
3. Tests parametrizados para múltiples casos
4. Siempre incluir tests de contrato
5. Verificar CI pasa antes de PR

---

**Documentación completa**: [docs/ARCHITECTURE_TESTING.md](../docs/ARCHITECTURE_TESTING.md)
