# OmnySys - Roadmap de Desarrollo

**Versión actual**: v0.7.1 - Data Flow Fractal Phase 1 ✅  
**Última actualización**: 2026-02-09  
**Estado**: Production Ready - Core Stable

---

## 🎯 Propósito Central (El "Por Qué")

> **"Dar a las IAs el contexto exacto de un archivo específico, como si un desarrollador senior que conoce TODO el codebase estuviera sentado al lado"**

### La Metáfora: De Cajas a Electrones

```
SISTEMA TRADICIONAL (v0.5):
┌─────────────────────────────────────────┐
│  Levantas una caja (archivo)            │
│  └── Ves cables (imports/exports)       │
│      └── "Este archivo importa React"   │
│                                         │
│  ❌ No sabes QUÉ hace la función        │
│  ❌ No sabes CÓMO fluyen los datos      │
│  ❌ No sabes el IMPACTO de cambiar X    │
└─────────────────────────────────────────┘

OMNYSYS v0.6 (Molecular):
┌─────────────────────────────────────────┐
│  Dentro de la caja hay ÁTOMOS          │
│  └── Cada función es un átomo           │
│      └── Con propiedades (metadata)     │
│                                         │
│  ✅ Sabes que existe processOrder()     │
│  ✅ Sabes que tiene 3 parámetros        │
│  ✅ Sabes que llama a calculateTotal    │
│  ❌ Pero NO sabes qué hace cada uno     │
└─────────────────────────────────────────┘

OMNYSYS v0.7+ (Data Flow Fractal):
┌─────────────────────────────────────────┐
│  Dentro del átomo hay ELECTRONES        │
│  └── Fluyen por ÓRBITAS definidas       │
│                                         │
│  ✅ "order entra por aquí"              │
│  ✅ "se transforma en total aquí"       │
│  ✅ "sale como orderId aquí"            │
│  ✅ "Si cambias order.items, afecta X"  │
│                                         │
│  ⚡ Contexto COMPLETO para la IA        │
└─────────────────────────────────────────┘
```

### Más Allá del Código: Patrones Universales

Esta arquitectura aplica a **cualquier sistema complejo**:

| Dominio | "Cajas" | "Átomos" | "Electrones" |
|---------|---------|----------|--------------|
| **Software** | Archivos | Funciones | Flujo de datos |
| **Organizaciones** | Departamentos | Procesos | Información |
| **Hardware** | PCBs | Componentes | Señales eléctricas |
| **Biología** | Células | Organelos | Moléculas |
| **Legal** | Contratos | Cláusulas | Derechos/Obligaciones |

> **OmnySys es un motor de comprensión de sistemas complejos, usando código como primer caso de uso.**

---

## 🧬 Evolución del Sistema

```
v0.5 - Box Test (2026-01)
   └── Levantas la caja, ves cables (conexiones entre archivos)
   └── 11 arquetipos de archivos
   └── 57 campos de metadata
   
v0.6 - Molecular (2026-02-08)
   └── Dentro de la caja hay átomos (funciones)
   └── 12 herramientas MCP (3 atómicas nuevas)
   └── Análisis función por función
   └── 4 Pilares consolidados
   
v0.7 - Data Flow Fractal (2026-02-09)
   └── Dentro del átomo ves electrones orbitando
   └── Fase 1: Inputs → Transforms → Outputs
   └── Meta-Validator: 4 capas de validación
   └── Logger System: 475+ logs centralizados
   
v0.8 - IDE Consciente (Próximo)
   └── Simulación del flujo de datos
   └── Predicción de impacto antes de escribir
   └── Autocompletado basado en contexto real
   
v1.0 - Artificial Intuition (Futuro)
   └── La IA "entiende" el sistema como un senior
   └── Sugerencias de refactoring proactivas
   └── Detección de bugs antes de que existan
```

---

## ✅ Fases Completadas

### ✅ FASE 0-5: Fundamentos (v0.1 - v0.5)

**Capa A (Static)**: Parser, imports/exports, grafo de dependencias, 15+ detectores  
**Capa B (Semantic)**: Análisis híbrido (estático + IA), validadores, conexiones semánticas  
**Capa C (Memory)**: MCP tools, caché unificado, WebSocket, BatchProcessor  
**Orchestrator**: AnalysisQueue, FileWatcher, StateManager, ProcessManager  

**Resultado**: 12 herramientas MCP funcionando, sistema estable, ~147 módulos.

---

### ✅ FASE 6: Molecular Architecture (v0.6.0)

**El Gran Salto**: De archivos a funciones como unidad atómica.

```javascript
// ANTES (v0.5): Análisis a nivel archivo
{
  "src/api.js": {
    exports: ["processOrder"],
    imports: ["calculateTotal"],
    type: "network-hub"
  }
}

// DESPUÉS (v0.6): Análisis a nivel función
{
  "atoms": {
    "src/api.js::processOrder": {
      type: "fragile-network",
      severity: 8,
      complexity: 35,
      calls: ["calculateTotal"],
      calledBy: ["UserCard.jsx::loadUser"]
    },
    "src/api.js::validateToken": {
      type: "validator",
      severity: 3,
      complexity: 8
    }
  }
}
```

**Deliverables**:
- ✅ Sistema atómico (funciones con metadata completa)
- ✅ Tools atómicas: `get_function_details()`, `get_molecule_summary()`
- ✅ Archetypes atómicos: god-function, fragile-network, validator, etc.
- ✅ Derivación molecular: archivos componen sus propiedades de átomos
- ✅ 4 Pilares documentados: Box Test, Metadata Insights, Atomic Composition, Fractal A→B→C

---

### ✅ FASE 7: Race Conditions + Robustez (v0.7.0 - v0.7.1)

**Detectar el invisible**: Cuando dos funciones async pueden pisarse.

```javascript
// Detectado automáticamente:
async updateCart() { localStorage.cart = ... }      // ← WRITE
async applyDiscount() { localStorage.cart = ... }   // ← WRITE (RACE!)

// Sistema alerta:
⚠️  WW Race Condition detected in localStorage.cart
   Severity: HIGH
   Mitigation: Add lock or transaction
```

**Deliverables**:
- ✅ **8 TODOs implementados**: sameBusinessFlow, findCapturedVariables, etc.
- ✅ **27+ tests**: Derivation engine + Race detector
- ✅ **Logger System**: 475+ console.log → sistema jerárquico
- ✅ **Refactorización masiva**: 69% menos líneas de código, SOLID/SSOT
- ✅ **Meta-Validator**: 4 capas de validación de integridad

---

### ✅ FASE 8: Data Flow Fractal - Fase 1 (v0.7.1) ✅ ACTUAL

**Ver el flujo de datos**: inputs → transforms → outputs

```javascript
// Metadata extraída automáticamente:
{
  name: "processOrder",
  dataFlow: {
    inputs: [
      { name: "order", usages: [
        { type: "property_access", property: "items", passedTo: "calculateTotal" },
        { type: "spread", passedTo: "saveOrder" }
      ]}
    ],
    transformations: [
      { from: "order.items", to: "total", via: "calculateTotal", operation: "calculation" },
      { from: ["total", "discount"], to: "finalTotal", operation: "arithmetic" }
    ],
    outputs: [
      { type: "side_effect", target: "saveOrder", operation: "persistence" },
      { type: "return", shape: "{ orderId, total }" }
    ]
  },
  analysis: {
    coherence: 85,      // 0-100 qué tan coherente es el flujo
    unusedInputs: [],   // parámetros no usados
    deadVariables: []   // variables definidas pero no usadas
  }
}
```

**Deliverables**:
- ✅ **Input Extractor**: Parámetros simples, destructuring, rest
- ✅ **Transformation Extractor**: Asignaciones, operaciones, llamadas
- ✅ **Output Extractor**: Returns, side effects, throws
- ✅ **Flow Analyzer**: Detecta inputs no usados, variables muertas
- ✅ Integrado en pipeline de extracción

---

## 🏗️ Fases en Progreso / Próximas

### 🔄 FASE 9: Data Flow Fractal - Fases 2-3

**Estimado**: 1-2 semanas  
**Propósito**: Entender el SIGNIFICADO del código para ML y detección de patrones.

#### Fase 2: Análisis Semántico (Nombres)

```javascript
// Extraer significado del nombre de función:
"validateUserPayment" → {
  verbo: "validate",
  dominio: "user",
  entidad: "payment",
  tipoOperacion: "validation",
  confidence: 0.95
}

"fetchUserData" → {
  verbo: "fetch",
  dominio: "user",
  entidad: "data",
  tipoOperacion: "network_read",
  confidence: 0.98
}
```

**Para qué sirve**:
- Agrupar funciones por propósito semántico
- Detectar inconsistencias (función llamada "validate" que hace "delete")
- Catalogar para entrenamiento de IA

#### Fase 3: Estandarización de Patrones

```javascript
// Convertir código específico a patrón universal:

// Original A:              Original B:
validateUser(user)        validateOrder(order)

// Estandarizado (ambos):
VALIDATE_FUNC(ENTITY_PARAM)

// Pattern hash: "a3f7d29c1b5e..."
// Flow type: "validation"
```

**Índice de Patrones** (`.omnysysdata/patterns/{hash}.json`):
```javascript
{
  hash: "a3f7d29c1b5e",
  pattern: "VALIDATE_FUNC(ENTITY_PARAM)",
  atoms: [
    "src/api.js::processOrder",
    "src/cart.js::processCart",
    "src/orders.js::processPayment"
  ],
  count: 15,
  statistics: {
    avgComplexity: 12.4,
    commonDomains: ["order", "payment", "cart"],
    successRate: 0.94  // % que funcionan correctamente
  },
  trainingReady: true  // Exportable para ML
}
```

**Deliverables**:
- [ ] Semantic name parser (verb-noun patterns)
- [ ] Pattern standardization engine
- [ ] Pattern index manager
- [ ] Exportación a datasets de entrenamiento

---

### ⏭️ FASE 10: Data Flow Fractal - Fases 4-7 (El Core del IDE)

**Estimado**: 3-4 semanas  
**Propósito**: Conectar todo para simular y predecir.

#### Fase 4: Cadenas Cross-Function

```
processOrder(order) 
  → llama a: calculateTotal(order.items)
  → recibe: total
  → pasa a: applyDiscount(total)
  → recibe: finalTotal
  → retorna: { orderId, finalTotal }
  
// Cadena completa del viaje del dato:
order.items → calculateTotal → total → applyDiscount → finalTotal → return
```

**Deliverables**:
- [ ] Cross-function data flow tracking
- [ ] Chain builder (conectar output de A con input de B)
- [ ] Dead data detection (datos que no llegan a ningún output)

#### Fase 5: Race Conditions (✅ Ya implementado en v0.7.0)

Ya tenemos detección completa de race conditions en shared state.

#### Fase 6: Motor de Simulación ⭐ CRÍTICO

```javascript
// Simular: "Qué pasa si order.items es null?"

simulator.run({
  entryPoint: "processOrder",
  input: { order: { items: null }, userId: 123 }
});

// Resultado:
Step 1: processOrder recibe order={items: null}
Step 2: calculateTotal(order.items) → ERROR: Cannot read property of null
Step 3: ❌ Simulación falla en línea 15

// Sugerencia automática:
💡 Agregar validación: if (!order?.items) throw new ValidationError(...)
```

**Deliverables**:
- [ ] Virtual Data Flow Simulator
- [ ] Test probe injection (inyectar valores de prueba)
- [ ] Path prediction (predecir caminos de ejecución)
- [ ] Impact pre-analysis (antes de escribir código)

#### Fase 7: Nivel Módulo y Sistema

```javascript
// Análisis a nivel de carpeta (feature):
auth/
  ├── login.js      → Entry point
  ├── validate.js   → Transformer
  └── store.js      → Side effect

// Metadata derivada:
{
  module: "auth",
  flowType: "entry-transform-persist",
  inputs: ["credentials"],
  outputs: ["session", "localStorage.session"],
  risk: "HIGH" // Porque maneja auth + storage
}
```

---

### ⏭️ FASE 11: IDE Consciente (El "OmnyIDE")

**Estimado**: 2-3 meses  
**Visión**: Un IDE que "entiende" tu código como un senior developer.

```
┌─────────────────────────────────────────────────────────────────┐
│                    IDE CONSCIENTE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💡 Autocompletado Contextual                                   │
│  Escribes: "order."                                             │
│  Sugiere: "items" (usado en calculateTotal), "id" (en return)  │
│  NO sugiere: "metadata" (nunca usado en esta función)          │
│                                                                 │
│  🔮 Predicción de Impacto (antes de guardar)                    │
│  "Si cambias este parámetro, afecta 12 archivos"               │
│  "¿Quieres ver el análisis de impacto?"                        │
│                                                                 │
│  🧪 Test Generation                                            │
│  "Detecté un edge case no manejado: order.items vacío"         │
│  "¿Generar test para este caso?"                               │
│                                                                 │
│  🚨 Prevenición de Bugs                                        │
│  "⚠️  Esta función puede causar race condition con línea 45"   │
│  "Sugerencia: Agregar await o mutex"                           │
│                                                                 │
│  📊 System Health Dashboard                                     │
│  "Deuda técnica: 3 archivos god-object detectados"             │
│  "Riesgo acumulado en módulo 'payment': 8.5/10"                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementación**: VS Code Extension + Web UI

**Deliverables**:
- [ ] VS Code Extension con integración MCP
- [ ] Panel de System Health en tiempo real
- [ ] Impact Preview (antes de guardar archivo)
- [ ] Decoraciones de riesgo en el editor
- [ ] Autocompletado basado en data flow

---

### ⏭️ FASE 12: Artificial Intuition (v1.0)

**Visión**: La IA no solo sugiere, "siente" el sistema.

```javascript
// La IA detecta patrones de riesgo automáticamente:

"He visto este patrón antes..."
"3 veces en proyectos similares, cambiar X sin actualizar Y"
"causó bugs en producción."

"Recomendación: Agregar validación de Y antes de mergear."
```

**Basado en**:
- Catálogo de patrones de .omnysysdata/patterns/
- Historial de cambios exitosos vs fallidos
- ML entrenado en patrones universales

---

## 📊 Estado Actual Detallado

### Componentes Core

| Componente | Estado | Módulos | Cobertura | Notas |
|------------|--------|---------|-----------|-------|
| **Capa A (Static)** | 95% ✅ | ~30 | 70% | Parser, extractors, graph, data flow |
| **Capa B (Semantic)** | 90% ✅ | ~40 | 60% | LLM analysis, validators, archetypes |
| **Capa C (Memory/MCP)** | 100% ✅ | ~25 | 60% | 12 tools, cache, WebSocket |
| **Orchestrator** | 95% ✅ | ~25 | 40% | Queue, workers, file watcher |
| **Race Detector** | 100% ✅ | ~15 | 70% | 8 TODOs implementados |
| **Meta-Validator** | 80% ✅ | ~10 | 30% | 4 capas, Source/Derivation funcionando |
| **Data Flow Fractal** | 30% 🔄 | ~8 | 20% | Fase 1 lista, 2-7 pendientes |
| **TOTAL** | **82%** | **~147** | **50%** | |

### Data Flow Fractal - Progreso Detallado

| Fase | Descripción | Estado | Bloquea |
|------|-------------|--------|---------|
| **Fase 1** | Data Flow Atómico | ✅ 100% | - |
| **Fase 2** | Análisis Semántico | ⏭️ 0% | Fase 1 |
| **Fase 3** | Estandarización | ⏭️ 0% | Fase 2 |
| **Fase 4** | Cadenas Cross-Function | ⏭️ 0% | Fase 1 |
| **Fase 5** | Race Conditions | ✅ 100% | - |
| **Fase 6** | Simulación | ⏭️ 0% | Fase 4 |
| **Fase 7** | Nivel Sistema | ⏭️ 0% | Fase 6 |

---

## 🎯 Decisiones de Diseño Clave

### 1. "Cables, No Señales"

No rastreamos VALORES (user.name = "John"), rastreamos CONEXIONES (user → validate → save).

**Por qué**:
- 97% cobertura vs 20% si rastreamos valores
- No necesitamos ejecutar el código
- Funciona con eval(), dynamic imports, etc.
- Los valores son para runtime, las conexiones son para análisis estático

### 2. Zero LLM para Extracción

Toda la extracción es determinística (AST + regex). LLM solo para:
- Confidence < 0.8
- Semantic analysis de nombres
- Casos ambiguos

**Resultado**: 90%+ de archivos sin necesidad de LLM.

### 3. Fractal A→B→C

Mismo patrón en todas las escalas:
```
Átomo:   Inputs → Transform → Output
Molécula: Exports → Chains → Returns
Módulo:  Imports → Flows → Exports
Sistema: Entry → Processing → Response
```

### 4. Single Source of Truth (SSOT)

Los átomos tienen la verdad. Las moléculas DERIVAN de átomos. Si cambia un átomo, se invalida todo hacia arriba.

---

## 🚀 Próximos Pasos Inmediatos

### Prioridad 1: Data Flow Fase 2-3 (Semana 1-2)
- Parser semántico de nombres de funciones
- Engine de estandarización de patrones
- Índice de patrones para ML

### Prioridad 2: Data Flow Fase 4 (Semana 3-4)
- Cross-function chain builder
- Conectar outputs con inputs entre funciones
- Detección de "data sinks" (datos que mueren)

### Prioridad 3: Integración Completa (Semana 5-6)
- Meta-Validator usando datos reales
- Pipeline de análisis con data flow
- Tests end-to-end con proyectos reales

### Prioridad 4: IDE Consciente (Mes 2-3)
- VS Code Extension básica
- Autocompletado contextual
- Impact Preview

---

## 📚 Documentación Clave

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| `docs/FISICA_DEL_SOFTWARE.md` | Visión UNIFICADA del sistema | ✅ Actualizado |
| `docs/DATA_FLOW/README.md` | Arquitectura Fractal completa | ✅ Actualizado |
| `docs/architecture/CORE_PRINCIPLES.md` | Los 4 Pilares | ✅ Actualizado |
| `docs/OMNY_IDE_CONSCIENTE_PRACTICO.md` | Roadmap al IDE | ✅ Actualizado |
| `changelog/v0.7.1.md` | Cambios recientes | ✅ Actualizado |
| `PLAN_MAESTRO_CORRECCION.md` | Plan técnico detallado | ✅ Completo |

---

## 🎓 Metáforas para Recordar

### Para Usuarios (Desarrolladores):
> **"OmnySys es como tener un desarrollador senior que ya leyó TODO tu código, sentado a tu lado. Cuando vas a cambar algo, te dice: 'Espera, eso afecta a 12 archivos, mira...'"**

### Para Clientes (Empresas):
> **"OmnySys reduce el tiempo de onboarding a codebase de semanas a minutos. Un desarrollador nuevo puede hacer cambios seguros en su primer día."**

### Para Inversores:
> **"OmnySys es el Google Maps para código. No solo sabe QUÉ calles existen, sabe CÓMO llegar de A a B. Aplicamos esto a software hoy, pero el motor sirve para cualquier sistema complejo."**

### Para la Comunidad (Open Source):
> **"OmnySys democratiza el conocimiento de sistemas complejos. Antes necesitabas 6 meses para entender un codebase grande. Ahora necesitas 6 minutos preguntándole a la IA."**

---

**OmnySys v0.7.1 - Del código al conocimiento.**

*"Levantas la caja, ves los cables. Miras dentro, ves los átomos. Ves más allá, ves los electrones bailando. Eso es OmnySys."*
