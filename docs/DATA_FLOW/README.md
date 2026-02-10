# DATA FLOW - Future Phases (Roadmap)

**Versión**: v0.7.1
**Estado**: Fase 1 ✅ Implemented | Fases 2-5 🟡 Planned
**Última actualización**: 2026-02-09

---

## 📌 Important Note

**For complete Data Flow documentation (v1, v2, usage, implementation)**, see:
👉 **[docs/architecture/DATA_FLOW.md](../architecture/DATA_FLOW.md)** - Comprehensive documentation

**This directory** (`docs/DATA_FLOW/`) contains **design documents for future phases** (Fase 2-5) that are planned but not yet implemented.

---

## ✅ Current Status (v0.7.1)

### Fase 1: Atomic Data Flow - ✅ IMPLEMENTED

**What**: Track data flow within a single function (atom level)
**Implementation**: Data Flow v2 (graph-based, 12 files)
**Location**: `src/layer-a-static/extractors/data-flow-v2/`
**Status**: 95% complete (1 stub in invariant-detector.js line 335)

**Documentation**: See [docs/architecture/DATA_FLOW.md](../architecture/DATA_FLOW.md)

---

## 🟡 Future Phases (Planned)

### Fase 2: Cross-Function Chains

**Status**: 🟡 Designed, not implemented
**Documentation**: [FASE_2_CROSS_FUNCTION_CHAINS.md](./FASE_2_CROSS_FUNCTION_CHAINS.md)

**Goal**: Connect output of one function to input of another:

```javascript
processOrder(order)
  → calls: calculateTotal(order.items)
  → receives: total
  → returns: { orderId, total }
```

**Benefit**: Trace data flow across function boundaries

---

### Fase 3: Module & System Level

**Status**: 🟡 Designed, not implemented
**Documentation**: [FASE_3_MODULO_SISTEMA.md](./FASE_3_MODULO_SISTEMA.md)

**Goal**: Derive metadata at:
- **Module level**: Feature/folder data flows
- **System level**: Project-wide data flows

**Benefit**: Understand data flows at architectural level

---

### Fase 4: Cross-Function Chains (Alternative Design)

**Status**: 🟡 Designed, not implemented
**Documentation**: [04_FASE_CADENAS.md](./04_FASE_CADENAS.md)

**Note**: Similar to Fase 2, alternative approach

---

### Fase 5: Simulation Engine

**Status**: 🟡 Designed, not implemented
**Documentation**: [06_FASE_SIMULACION.md](./06_FASE_SIMULACION.md)

**Goal**: "Walk" the graph simulating data journey:

```
> Simulate: "req.body" from "handleRequest"

Step 1: handleRequest → extracts userData
Step 2: validateUser → validates email
Step 3: saveUser → saves to DB
Step 4: sendWelcome → sends email

Result: Traveled through 4 files, 4 functions
```

**Benefit**: Virtual execution to understand data transformations

---

### Fase 6: System Level

**Status**: 🟡 Designed, not implemented
**Documentation**: [07_FASE_SISTEMA.md](./07_FASE_SISTEMA.md)

**Goal**: Derive project-level metadata from modules

---

## 📚 Supporting Documentation

### Core Concepts

**File**: [CONCEPTOS_CLAVE.md](./CONCEPTOS_CLAVE.md)

Explains fundamental concepts:
1. **"Cables, Not Signals"** - Map connections, not values
2. **Fractal Architecture** - Each level derives from below
3. **Deterministic Extraction** - Zero LLM, pure AST

**Read this first** before implementing any phase.

---

## 📁 Archived Design Documents

The following documents have been archived to `docs/archive/design/data-flow/`:

- `01_FASE_ATOMO.md` - Original Fase 1 design (superseded by v2 implementation)
- `02_FASE_SEMANTICA.md` - Semantic analysis design
- `03_FASE_ESTANDARIZACION.md` - Standardization design (implemented in v2)
- `05_FASE_RACE_CONDITIONS.md` - Race condition detection (duplicate)
- `08_FASE_4_RACE_CONDITIONS.md` - Race condition detection (duplicate)
- `09_FASE_5_SIMULATION.md` - Simulation engine (duplicate)

And to `docs/archive/plans/data-flow/`:

- `PLAN_FASE_1_IMPLEMENTADO.md` - Fase 1 implementation plan
- `PLAN_FASE_1_REVISADO.md` - Fase 1 revised plan

**Why archived**: These were pre-implementation design docs that have been superseded by the actual v2 implementation documented in `docs/architecture/DATA_FLOW.md`.

---

## 🎯 Implementation Priority

When implementing future phases, follow this order:

1. **Complete Fase 1** (v0.7.2)
   - Finish invariant-detector.js stub (line 335)
   - Add unit tests

2. **Fase 2: Cross-Function Chains** (v0.8.0)
   - Build on atomic data flow
   - Connect functions via call graph

3. **Fase 4: Race Condition Detector** (v0.8.x)
   - Requires Fase 2 (cross-function chains)
   - Detect async conflicts

4. **Fase 3: Module/System Level** (v0.9.0)
   - Requires Fase 2 (chains across boundaries)
   - Aggregate metadata upwards

5. **Fase 5: Simulation Engine** (v0.9.x)
   - Requires Fase 2, 3 (complete graph)
   - Virtual execution

---

## 📊 Expected Coverage Improvements

| Phase | Additional Coverage | Cumulative |
|-------|---------------------|------------|
| Fase 1 (v0.7.1) ✅ | Atomic data flow | ~85% |
| Fase 2 (Planned) | Cross-function chains | ~92% |
| Fase 3 (Planned) | Module/system levels | ~94% |
| Fase 4 (Planned) | Race conditions | ~96% |
| Fase 5 (Planned) | Simulation | ~97% |

---

## 🔗 Quick Links

- **Current Implementation**: [docs/architecture/DATA_FLOW.md](../architecture/DATA_FLOW.md)
- **Changelog**: [changelog/v0.7.1.md](../../changelog/v0.7.1.md)
- **Source Code**: `src/layer-a-static/extractors/data-flow-v2/`
- **Core Principles**: [docs/CORE_PRINCIPLES.md](../CORE_PRINCIPLES.md)

---

**Remember**: This directory contains **future roadmap**, not current implementation. For current status and usage, always refer to [docs/architecture/DATA_FLOW.md](../architecture/DATA_FLOW.md).
