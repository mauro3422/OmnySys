# OmnySys — Roadmap de Desarrollo

**Versión actual**: v0.9.36  
**Última actualización**: 2026-02-19  
**Estado**: ✅ Estable — 4,366 tests pasando, 0 imports rotos, deuda técnica controlada

---

## 🎯 Propósito Central

> **"Dar a las IAs el contexto exacto de un archivo específico, como si un desarrollador senior que conoce TODO el codebase estuviera sentado al lado"**

### La Metáfora: Cajas → Átomos → Electrones

```
SISTEMA TRADICIONAL:
┌─────────────────────────────────────┐
│  Levantas una caja (archivo)        │
│  └── Ves cables (imports/exports)   │
│  ❌ No sabes qué hace la función    │
│  ❌ No sabes el impacto de cambiar X│
└─────────────────────────────────────┘

OMNYSYS (Molecular):
┌─────────────────────────────────────┐
│  Dentro de la caja hay ÁTOMOS       │
│  └── Cada función es un átomo       │
│  ✅ Sabes que existe processOrder() │
│  ✅ Sabes que tiene 3 parámetros    │
│  ✅ Sabes que llama a calculateTotal│
└─────────────────────────────────────┘

OMNYSYS (Data Flow):
┌─────────────────────────────────────┐
│  Dentro del átomo hay ELECTRONES    │
│  ✅ "order entra por aquí"          │
│  ✅ "se transforma en total aquí"   │
│  ✅ "sale como orderId aquí"        │
│  ✅ "Si cambias order.items → 8 archivos afectados" │
└─────────────────────────────────────┘
```

---

## ✅ Fases Completadas

### ✅ v0.1 – v0.5 — Fundamentos (Completado)
- Capa A: Parser, imports/exports, grafo de dependencias, 15+ detectores
- Capa B: Análisis híbrido estático + IA, validadores, conexiones semánticas
- Capa C: 14 herramientas MCP, caché unificado, WebSocket, BatchProcessor
- 11 arquetipos de archivos, 57 campos de metadata

### ✅ v0.6.0 — Arquitectura Molecular (Completado)
- Funciones (átomos) como unidad primaria de análisis
- 7 arquetipos atómicos: god-function, fragile-network, hot-path, etc.
- Motor de derivación: archivos derivan propiedades de sus funciones
- 3 herramientas MCP atómicas: `get_function_details`, `get_molecule_summary`, `get_atomic_functions`
- Confidence-based LLM bypass: 70% → 90% bypass rate

### ✅ v0.7.x — Race Conditions + Data Flow v1 (Completado)
- Race detector 100% activo (8 TODOs implementados)
- Data Flow v2 graph-based (Fase 1)
- Logger system: 475+ console.log migrados a sistema jerárquico
- Meta-Validator: 4 capas de validación
- Shadow Registry: sistema de linaje de archivos

### ✅ v0.8.0 — Hot Reload + Query Refactor (Completado)
- HotReloadManager: auto-recarga de módulos en desarrollo
- Query refactoring: APIs más limpias
- Self-improvement capability

### ✅ v0.9.0 — Pattern Detection Engine V2 (Completado)
- 99.8% reducción de falsos positivos (473 issues → 1 real)
- Quality Score: 0/100 → 99/100
- Detectores smart con scoring inteligente basado en AST

### ✅ v0.9.1 — MCP Pipeline Hotfix (Completado)
- Startup 85% más rápido: ~2s (antes 30-35s)
- Fixed: orden de inicialización LLM
- Fixed: cache duplication entre Orchestrator y sistema

### ✅ v0.9.2 — LLMService Architecture Refactor (Completado)
- LLMService Singleton con circuit breaker
- Real-time metrics: latencia, errores, throughput
- 50% menos code duplication en LLM clients

### ✅ v0.9.3 – v0.9.4 — Modular Refactoring (Completado)
- 59 monolitos → 400+ módulos especializados
- 984 archivos JavaScript, todos con < 350 líneas
- SOLID principles aplicados en todo el sistema

### ✅ v0.9.5 – v0.9.6 — Cleanup: Wrappers y Deuda Técnica (Completado)
- 18 wrappers legacy eliminados
- -594 líneas de código innecesario
- 100% modular, sin indirecciones

### ✅ v0.9.7 – v0.9.9 — Layer A Test Audit (Completado)
- 90 tests core (Parser, Scanner, Graph, Contracts)
- 440 tests tier 3 (Risk Scoring, Detectors, Advanced)
- Contract Testing pattern para multi-language support
- 8 Critical Fixes: ESM traverse, null-safety, import hoisting

### ✅ v0.9.10 – v0.9.13 — Test Coverage Masivo (Completado)
- 527+ tests Layer A
- 1,222 tests total (Layer A + B + Cross-Layer)
- 12 Factories implementadas
- 23 Source Fixes detectados por los tests

### ✅ v0.9.14 – v0.9.15 — Layer Graph Architecture (Completado)
- Layer Graph creada como capa separada
- 17 módulos, 54 exports públicos
- Movido de Layer A: `graph/`, `algorithms/`, `builders/`, `query/`
- Core refactorizado: cache ahora vive en `src/core/cache/`
- 75 tests nuevos para layer-graph

### ✅ v0.9.16 — Layer Cleanup: Remove Duplications (Completado)
- Eliminado `layer-b-semantic/redux-context-extractor/` (duplicaba Layer A)
- Eliminado `layer-b-semantic/advanced-extractors.js` (wrapper deprecated)
- 59 tests eliminados (del módulo duplicado)
- Arquitectura limpia: Layer B sin duplicación de extractores

---

## 🔧 Estado Actual — Estable (v0.9.60)

### Sistema: ✅ Semantic Algebra + SQLite Determinístico
```
┌─────────────────────────────────────────────────────────────┐
│  OMNYSYS v0.9.60 — Semantic Algebra Production            │
│  ══════════════════════════════════════════════════════    │
│                                                             │
│  Storage:     SQLite (WAL mode, ACID)                      │
│  Vectores:    7 scores por átomo (determinísticos)        │
│  Queries:     Mismo input → Mismo output (100%)            │
│  Startup:     ~1.5 segundos                                │
│  MCP Tools:   28 herramientas                              │
│                                                             │
│  Layer A: Análisis estático → Átomos + Vectores           │
│  Layer B: Análisis semántico → Arquetipos                  │
│  Layer C: SQLite + MCP Tools → Query determinístico        │
└─────────────────────────────────────────────────────────────┘
```

### Tests: ✅ Saludable
```
297+ archivos de test → 4,500+ tests pasando
0 imports rotos
```

### Roadmap v0.9.56-60 Completado
| Versión | Feature |
|---------|---------|
| v0.9.56 | Performance Optimization — Startup 1.5s |
| v0.9.57 | SQLite Modularization — Adapter splitting |
| v0.9.58 | **SQLite Migration Complete** — All tools use SQLite |
| v0.9.59 | Query Optimization — Skip reindex when DB valid |
| v0.9.60 | **Semantic Algebra** — 7 vectors, deterministic queries |

### Documentación: ✅ Actualizada (2026-02-19)

---

## 🚧 Próximos Pasos Inmediatos

### Prioridad 1: Mejorar Coverage de Layer C 🟡
**Tiempo estimado**: 1-2 semanas

Layer C tiene ~30% de cobertura de tests. Objetivo: alcanzar 50%+.

**Acciones**:
- Identificar módulos sin tests en `src/layer-c-memory/`
- Crear tests unitarios para herramientas MCP
- Mejorar tests de integración del servidor

### Prioridad 2: Investigar Tests Skipped (35 tests) 🟡
**Tiempo estimado**: 2-3 días

Hay 35 tests marcados como `skip`. Necesitan ser investigados:
- ¿Por qué están deshabilitados?
- ¿Se pueden rehabilitar?
- ¿O deben eliminarse?

### Prioridad 3: Integrar Scripts de Validación en CI/CD 🟢
**Tiempo estimado**: 1 día

Los scripts de validación están listos pero no integrados:
- `scripts/detect-broken-imports.js` — 0 imports rotos ✅
- `scripts/validate-syntax.js` — sintaxis validada ✅

**Acción**: Agregar a GitHub Actions o similar.

---

## 🔮 Roadmap Futuro

### v0.9.18 — Data Flow Semántico
- Análisis semántico de nombres de funciones (verb-noun patterns)
- Estandarización de patrones cross-function
- Índice de patrones para ML

### v0.9.19 — Cross-Function Chains
- Seguimiento del flujo de datos entre funciones
- `order.items → calculateTotal → total → applyDiscount → finalTotal`
- Detección de "data sinks" (datos que mueren sin usarse)

### v0.9.20 — Motor de Simulación
- Simular: "¿Qué pasa si order.items es null?"
- Virtual Data Flow Simulator
- Test probe injection

### v1.0.0 — Sistema Estable y Completo
- Todos los imports rotos resueltos ✅
- Coverage global > 70% ✅
- Smoke test E2E funcionando ✅
- Data Flow Semántico implementado ✅
- Documentación sincronizada con código ✅
- Soporte Python/Go (básico)

### v1.1.0 — IDE Consciente
- VS Code Extension con integración MCP
- Panel de System Health en tiempo real
- Impact Preview antes de guardar archivo
- Autocompletado basado en data flow

### v2.0.0 — Artificial Intuition
- La IA detecta patrones de riesgo basándose en historial
- ML entrenado en patrones universales del codebase
- Sugerencias proactivas de refactoring

---

## 📊 Métricas de Evolución

| Versión | Tests | Cobertura | Módulos | Herramientas | Storage |
|---------|-------|-----------|---------|-------------|---------|
| v0.5 | ~18 | ~5% | 11 arquetipos | 11 MCP | JSON |
| v0.7 | 350+ | ~15% | modular | 14 MCP | JSON |
| v0.9.7 | 527+ | ~26% | 400+ | 14 MCP | JSON |
| v0.9.13 | 1,222 | ~35% | 500+ | 14 MCP | JSON |
| v0.9.17 | 4,115 | ~40% | 500+ | 14 MCP | JSON |
| v0.9.36 | 4,366 | ~45% | 500+ | 14 MCP | JSON |
| **v0.9.60** | **4,500+** | **~50%** | **600+** | **28 MCP** | **SQLite** |
| v1.0 (target) | 6,000+ | 70%+ | 500+ | 30+ MCP | SQLite |

---

## 🎓 La Visión en Una Frase

> **"OmnySys es como Google Maps para código. No solo sabe QUÉ calles existen, sabe CÓMO llegar de A a B con todos los riesgos del camino."**

---

## 📚 Documentación

Para una visión completa de la arquitectura del sistema ver:
- **[docs/02-architecture/SYSTEM_ARCHITECTURE.md](docs/02-architecture/SYSTEM_ARCHITECTURE.md)** - Arquitectura completa con datos reales del sistema
