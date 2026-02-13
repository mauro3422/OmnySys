# Data Flow Fractal

**Versión**: v0.7.1  
**Estado**: Fase 1 (v2) ✅ 95% | Fases 2-5 🟡 Planned  
**Última actualización**: 2026-02-12

---

## 🎯 Qué es Data Flow Fractal

Sistema que rastrea el **viaje de los datos** desde entrada (parámetros) hasta salida (return/side effects) a **4 niveles de escala**.

```
SISTEMA (Entry → Modules → Side Effects)
    ↑ DERIVA
MÓDULO (Imports → Files → Exports)
    ↑ DERIVA
MOLÉCULA (Inputs → Chains → Outputs)
    ↑ DERIVA
ÁTOMO (Params → Transform → Return) ← ✅ IMPLEMENTADO v0.7.1
```

**Metáfora**: Como **Google Maps para datos**. No solo "qué calles existen", sino "cómo ir de A a B".

---

## 📚 Documentos en esta Sección

### Fundamentos
| Documento | Descripción | Leer primero |
|-----------|-------------|--------------|
| [concepts.md](./concepts.md) | **3 conceptos clave**: Cables vs Señales, Fractal A→B→C, Zero LLM | ✅ Sí |
| [atom-extraction.md](./atom-extraction.md) | **Fase 1**: Extracción atómica implementada (v2) | Después de concepts |
| [roadmap.md](./roadmap.md) | **Fases 2-5**: Cross-function chains, simulation, system level | Para roadmap |

---

## 🧠 Conceptos en 30 Segundos

### 1. "Cables, Not Signals"

Mapeamos **conexiones** (cables), no **valores** (señales).

```
CABLES (lo que mapeamos):
- Interruptor → Foco (existe conexión)
- userData → validateUser → saveUser (el flujo existe)

SEÑALES (lo que NO mapeamos):
- ¿Cuántos volts? (valor runtime)
- ¿userData.name = "Juan" o "María"? (no importa)
```

**Ventaja**: Cobertura del **0% → 97%** incluso con `eval()`, código dinámico, o third-party.

### 2. Fractal A→B→C

Mismo patrón en los 4 niveles:

```
A (Entrada) → B (Transformación) → C (Salida)

Átomo:   Params → Transform → Return
Molécula: Inputs → Chains    → Outputs
Módulo:  Imports → Internal  → Exports
Sistema: Entry   → Business  → Side Effects
```

### 3. Zero LLM

- **Extracción**: 100% determinística (AST, regex)
- **Solo LLM**: Cuando `confidence < 0.8` (~2-5% de funciones)

---

## 📊 Estado de Implementación

| Fase | Nivel | Estado | Cobertura |
|------|-------|--------|-----------|
| **Fase 1** | Átomo (función) | ✅ v2 (95%) | ~85% |
| **Fase 2** | Cross-function chains | 🟡 Diseñado | ~92% |
| **Fase 3** | Módulo/Sistema | 🟡 Planificado | ~94% |
| **Fase 4** | Race conditions | 🟡 Planificado | ~96% |
| **Fase 5** | Simulation engine | 🟡 Planificado | ~97% |

---

## 🔗 Relación con Otros Sistemas

```
01-core/principles.md (4 Pilares)
    ↓
02-architecture/data-flow/ (este directorio)
    ↓
03-orchestrator/ (flujo de vida de archivos)
    ↓
MCP Tools: get_function_details, explain_value_flow
```

**Integraciones**:
- **Atom Extraction Phase**: Usa Data Flow v2 para enriquecer átomos
- **Shadow Registry**: Data flow forma parte del ADN
- **MCP Tools**: `get_function_details`, `explain_value_flow`

---

## 🚀 Uso Rápido

```javascript
import { extractDataFlow } from './extractors/data-flow-v2/core/index.js';

// Extraer de una función
const result = await extractDataFlow(ast, code, 'processOrder', 'src/api.js');

// Resultado
console.log(result.standardized.flowPattern);  // "read-transform-persist"
console.log(result._meta.confidence);           // 0.85
```

**Vía MCP Tool**:
```javascript
const details = await get_function_details({
  filePath: 'src/utils.js',
  functionName: 'processUser'
});
console.log(details.dataFlow);
```

---

## 📁 Ubicación en Código

```
src/layer-a-static/extractors/
├── data-flow/           ← v1 (legacy, fallback)
│   └── index.js
│
└── data-flow-v2/        ← v2 (actual, 12 archivos)
    ├── core/
    ├── visitors/
    ├── analyzers/
    └── output/
```

---

**Siguiente paso**: Lee [concepts.md](./concepts.md) para entender los fundamentos.
