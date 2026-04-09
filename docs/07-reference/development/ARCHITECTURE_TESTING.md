# Arquitectura de Testing - OmnySys

**Versión**: v0.9.61  
**Última actualización**: 2026-02-25  
**Estado**: ✅ 79% test coverage (target: 80%)

---

## Visión General

OmnySys tiene una estrategia de testing en **3 niveles**:

```
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 1: Unit Tests (1,957 funciones con tests)           │
│  ─────────────────────────────────────────────────────     │
│  • Tests de funciones individuales                          │
│  • Mocks de dependencias                                    │
│  • Rápidos (<10ms por test)                                 │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 2: Contract Tests (54 contracts)                    │
│  ─────────────────────────────────────────────────────     │
│  • Tests de interfaces entre capas                          │
│  • Validación de esquemas                                   │
│  • Medianos (<100ms por test)                               │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 3: Integration Tests (21 tests)                     │
│  ─────────────────────────────────────────────────────     │
│  • Tests de flujo completo                                  │
│  • SQLite real                                              │
│  • Lentos (>1s por test)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Tests

```
tests/
├── unit/                   # Unit tests
│   ├── layer-a-analysis/   # Tests de Layer A
│   ├── layer-b-semantic/   # Tests de Layer B
│   ├── layer-c/            # Tests de Layer C
│   └── core/               # Tests del core
├── contracts/              # Contract tests
│   ├── layer-a/            # Contracts de Layer A
│   ├── layer-b/            # Contracts de Layer B
│   └── layer-c/            # Contracts de Layer C
├── integration/            # Integration tests
│   ├── helpers/            # Helpers de integration
│   └── full-flow.test.js   # Test de flujo completo
└── factories/              # Test factories
    ├── ai/                 # Factories para IA
    ├── data-flow-test/     # Factories para data flow
    └── shared/             # Factories compartidas
```

---

## Métricas de Testing (v0.9.61)

```
┌─────────────────────────────────────────────────────────────┐
│  Test Coverage: 79%                                        │
├─────────────────────────────────────────────────────────────┤
│  Test Files:     495                                        │
│  Test Atoms:     8,004                                      │
│  Functions w/ Tests: 1,957                                 │
│  Functions w/o Tests: 508                                  │
│  Gaps:           20                                        │
└─────────────────────────────────────────────────────────────┘
```

### Coverage por Capa

| Capa | Tests | Coverage |
|------|-------|----------|
| **layer-c-memory** | 200+ | 85% |
| **core** | 150+ | 82% |
| **layer-b-semantic** | 100+ | 78% |
| **layer-a-static** | 300+ | 88% |
| **cli** | 50+ | 75% |

---

## Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Ver coverage
npm run coverage

# Ejecutar tests específicos
npm test -- tests/unit/layer-c/mcp/tools.test.js

# Ver tests en tiempo real
npm run test:watch

# Generar tests para funciones sin coverage
npm run generate-tests
```

---

## Generación de Tests con MCP

### Usar `generate_batch_tests`

```javascript
// Generar tests para 5 funciones de alta complejidad
const result = await generate_batch_tests({
  dryRun: true,
  limit: 5,
  minComplexity: 10,
  sortBy: 'risk'
});

// Resultado: 31 tests generados para 5 funciones
```

### Ejemplo de Test Generado

```javascript
import { describe, it, expect, vi } from 'vitest';
import { generateRecommendations } from '../../src/cli/commands/check/formatters.js';

describe('generateRecommendations', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', () => {
      const result = generateRecommendations("/test/file.js");
      expect(result).toEqual(expect.objectContaining({}));
    });
  });

  describe('edge cases', () => {
    it('should handle fileData = null/undefined', () => {
      const result = generateRecommendations(null);
      expect(result).toBeDefined();
    });
  });
});
```

---

## Funciones Sin Tests (508 funciones)

### Top 20 Gaps

| Función | Archivo | Risk Score |
|---------|---------|------------|
| `fetchData` | test-cases/scenario-4-localStorage-bridge/src/ApiClient.js | 20 |
| `generateRecommendations` | src/cli/commands/check/formatters.js | 20 |
| `handleCommand` | src/core/orchestrator-server/routes/command-route.js | 20 |
| ... | ... | ... |

**Ver lista completa**: Ejecutar `detect_patterns({ patternType: 'test-coverage' })`

---

## Estrategia de Testing

### 1. Unit Tests (Prioridad Alta)

**Qué testear**:
- Funciones puras
- Extractores de metadata
- Validadores de esquema

**Qué NO testear**:
- Tests de tests (factories)
- Código deprecated (LLM)
- Scripts de utilería

---

### 2. Contract Tests (Prioridad Media)

**Qué testear**:
- Interfaces entre capas
- Esquemas de metadata
- MCP tools

**Qué NO testear**:
- Implementaciones internas
- Helpers privados

---

### 3. Integration Tests (Prioridad Baja)

**Qué testear**:
- Flujo completo (file change → SQLite)
- MCP tools end-to-end
- Hot-reload

**Qué NO testear**:
- Cada combinación posible
- Casos edge extremos

---

## Próximos Pasos

### Q2 2026

- [ ] Alcanzar 80% test coverage
- [ ] Generar tests para 508 funciones sin tests
- [ ] Usar `generate_batch_tests` para automatizar

### Q3 2026

- [ ] Alcanzar 85% test coverage
- [ ] Tests de performance
- [ ] Tests de stress

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ 79% coverage, 1,957 funciones con tests  
**Próximo**: 🎯 Alcanzar 80% coverage
