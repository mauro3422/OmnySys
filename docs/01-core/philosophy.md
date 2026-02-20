# Física del Software + Omnisciencia

**Documento**: philosophy.md  
**Versión**: v0.9.4  
**Estado**: Visión consolidada  
**Metáfora**: De cajas con cables a átomos con electrones orbitando

---

## 🎯 La Gran Visión

OmnySys no es solo un "analizador de código". Es un **sistema de física del software** que modela cómo fluye la información a través de un programa, desde el nivel macro (arquitectura) hasta el nivel cuántico (transformaciones de datos individuales).

**Principio fundamental**: *"El software es un sistema físico observable. Al igual que la física modela partículas y fuerzas, OmnySys modela funciones y flujos de datos."*

**Meta final**: Implementar **Omnisciencia** = conciencia completa del código a través de **Intuición Artificial** — la capacidad de predecir consecuencias y reconocer patrones sin razonamiento explícito.

---

## 📈 Evolución del Sistema (3 Etapas)

### v0.5 - Box Test: El Mapeo de Cables

**Concepto**: Cada archivo es una caja negra. Al levantarla, ves cables que la conectan con otras cajas.

```
📦 src/api.js
   ├── cable → 📦 src/auth.js
   ├── cable → 📦 src/db.js
   └── cable → 📦 src/utils.js
```

**Qué revela**: 
- Qué archivos se conectan entre sí
- Dónde están los "god-objects" (cajas con 20+ cables)
- Qué archivos son "orphans" (cajas sin cables = código muerto)

**Limitación**: Solo vemos el EXTERIOR de las cajas.

---

### v0.6 - Arquitectura Molecular: Dentro de la Caja

**Concepto**: Dentro de cada caja (archivo) hay átomos (funciones) que se conectan entre sí.

```
📦 src/api.js (Molécula)
   ├── ⚛️ fetchUser() ──→ ⚛️ validateToken()
   ├── ⚛️ validateToken() ──→ ⚛️ checkPermissions()
   └── ⚛️ formatResponse() (standalone)
```

**Qué revela**:
- Qué funciones existen dentro de cada archivo
- Cómo se llaman entre sí (call graph interno)
- Qué funciones son "god-functions" (átomos con muchas conexiones)
- Qué funciones son "dead code" (átomos sin llamadas)

**Principio clave**: **SSOT (Single Source of Truth)**
- La metadata del archivo se DERIVA de sus funciones
- Si cambia una función, se recalcula todo el archivo
- Zero duplicación de datos

---

### v0.7 - Data Flow Fractal: Los Electrones Orbitando

**Concepto**: Dentro de cada átomo (función), los datos fluyen como electrones en órbitas: entran, se transforman, y salen.

```
⚛️ processOrder(order, userId) (Átomo)
   │
   ├── 🔄 ENTRADA: order.items →
   │   ├── 🔄 TRANSFORM: calculateTotal() → total
   │   └── 🔄 TRANSFORM: getUser() → user
   │       └── 🔄 TRANSFORM: user.discount → discount
   │           └── 🔄 TRANSFORM: arithmetic → finalTotal
   │               └── 🔄 SALIDA: saveOrder() + return {...}
```

**Qué revela**:
- **Cómo viaja un dato**: De parámetro → transformación → return/side effect
- **Transformaciones**: Qué operaciones se aplican (validación, cálculo, merge)
- **Cadenas cross-function**: Salida de A → Entrada de B
- **Race conditions**: Dos funciones async escribiendo al mismo recurso
- **Simulación**: "Si modifico X, ¿qué funciones se ven afectadas?"

**Principio clave**: **Fractal A→B→C**
```
Átomo:   Params → Transform → Return
Molécula: Inputs → Chains    → Outputs  
Módulo:  Imports → Internal  → Exports
Sistema: Entry   → Business  → Side Effects
```

---

## 🔬 El Modelo Atómico Completo

### Analogía Física

| Física Real | OmnySys | Qué modela |
|-------------|---------|------------|
| **Universo** | Sistema (Proyecto) | Todo el código |
| **Galaxia** | Módulo (Feature) | Carpeta de funcionalidad |
| **Planeta** | Molécula (Archivo) | Archivo con funciones |
| **Átomo** ⭐ | Función | **Unidad básica de ejecución** |
| **Núcleo** | Lógica interna | El algoritmo de la función |
| **Electrones** | Variables, parámetros | Partículas subatómicas dentro del átomo |
| **Protones** | Statements, líneas | Partículas subatómicas que forman la lógica |
| **Partículas sueltas** | Constantes exportadas | Config/objectExports sin átomo contenedor |
| **Orbitales** | Conexiones | Cómo los datos viajan entre funciones |
| **Enlaces químicos** | Llamadas entre funciones | A llama a B |
| **Campo gravitacional** | Side effects globales | localStorage, eventos, DB |
| **Culturas** | Roles sociales | Aduanero, Leyes, Auditor, Script, Ciudadano |

> **Nota importante**: Las constantes y configuraciones NO son átomos. Son **partículas sueltas** (electrones sin átomo). Los archivos que solo contienen estas partículas se clasifican como "Leyes Físicas" - ver [file-cultures.md](../02-architecture/file-cultures.md).

### Jerarquía de Derivación

```
                    SISTEMA (Universo)
                    ┌─────────────────┐
                    │ Entry Points    │
                    │ Business Flows  │
                    │ Bottlenecks     │
                    └────────┬────────┘
                             │ DERIVA de módulos
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │  MÓDULO     │  │  MÓDULO     │  │  MÓDULO     │
    │ (Galaxia)   │  │ (Galaxia)   │  │ (Galaxia)   │
    │ auth/       │  │ cart/       │  │ payment/    │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                            │ DERIVA de moléculas
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────▼─────┐ ┌────▼────┐ ┌──────▼─────┐
       │ MOLÉCULA   │ │MOLÉCULA │ │ MOLÉCULA   │
       │ (Planeta)  │ │(Planeta)│ │ (Planeta)  │
       │ login.js   │ │cart.js  │ │ checkout.js│
       └──────┬─────┘ └────┬────┘ └──────┬─────┘
              │            │             │
              └────────────┼─────────────┘
                           │ DERIVA de átomos
                 ┌─────────┼─────────┐
                 │         │         │
          ┌──────▼───┐ ┌───▼───┐ ┌───▼────┐
          │  ÁTOMO   │ │ ÁTOMO │ │ ÁTOMO  │
          │ validate │ │fetch  │ │process │
          │Credential│ │User  │ │Order   │
          └──────┬───┘ └───┬───┘ └───┬────┘
                 │         │         │
                 └─────────┼─────────┘
                           │ EXTRAE vía AST
                    ┌──────▼──────┐
                    │  ELECTRONES │
                    │  (Data Flow)│
                    │  • inputs   │
                    │  • transforms│
                    │  • outputs  │
                    └─────────────┘
```

**Regla de oro**: Si cambia un electrón (dato), se recalcula todo hacia arriba hasta el universo.

---

## 🧠 Omnisciencia: Conciencia Completa

### Qué es Omnisciencia

**Omnisciencia** = "Omni" (todo) + "Sciencia" (conocimiento) + "Sys" (sistema)

No es solo "entendimiento de código" — es **conciencia completa** del contexto, dependencias, impacto y flujo de datos.

### El Problema: Tunnel Vision

```
ANTES (Tunnel Vision):
┌─────────────────────────────────────┐
│  User edits: src/auth/login.js       │
│                                      │
│  AI sees:                            │
│  └─ src/auth/login.js                │
│     ├─ imports: api.js               │
│     ├─ exports: login()              │
│     └─ 3 usages                       │
│                                      │
│  PROBLEM:                            │
│  - Misses 15 other files that depend │
│  - Doesn't know about event listeners│
│  - Doesn't know about state changes  │
│  - Might break production silently    │
└─────────────────────────────────────┘
```

### La Solución: Omnisciencia con Intuición Artificial

```
DESPUÉS (Omnisciencia):
┌─────────────────────────────────────┐
│  User edits: src/auth/login.js       │
│                                      │
│  AI sees:                            │
│  ├─ Direct dependencies: 12 files   │
│  ├─ Indirect dependencies: 45 files │
│  ├─ Call graph: 23 call sites       │
│  ├─ Data flow: input → process →     │
│  │   user, admin, logs, DB           │
│  ├─ Event listeners: 8 files listen │
│  ├─ State changes: 5 files affected  │
│  ├─ Risk: CRITICAL - Production API  │
│  └─ Breaking changes: 3 endpoints    │
│                                      │
│  INSTINCTIVE REACTION (<10ms):       │
│  "This pattern caused issues before" │
└─────────────────────────────────────┘
```

---

## 🧠 Intuición Artificial

### Qué es la Intuición Artificial

> "The capacity of an artificial system to function similarly to human consciousness, specifically in the capacity known as intuition — knowledge based on pattern recognition without explicit reasoning." - Wikipedia

### Cómo lo Implementa OmnySys

```
┌─────────────────────────────────────────┐
│  Human Brain Analogy                    │
├─────────────────────────────────────────┤
│                                         │
│  Brain Stem (Instincts)                 │
│  ↓ Layer A: Static extraction           │
│     Fast, automatic, no reasoning       │
│     (AST parsing, metrics calculation)  │
│                                         │
│  Amygdala (Emotions/Patterns)           │
│  ↓ Layer B: Semantic detection          │
│     Pattern recognition, archetypes     │
│     (god-object, event-hub detection)   │
│                                         │
│  Prefrontal Cortex (Reasoning)          │
│  ↓ Layer C: Memory & prediction         │
│     Conscious analysis when needed      │
│     (LLM for complex cases only)        │
│                                         │
└─────────────────────────────────────────┘
```

### Las 3 Tools de Omnisciencia

```
┌─────────────────────────────────────────┐
│  get_call_graph()                       │
│  "¿Quién me llama? ¿A quién llamo?"     │
│  → Call sites, call depth, context       │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  explain_value_flow()                   │
│  "¿Qué entra? ¿Qué sale? ¿Quién lo usa?"│
│  → Data pipeline, consumers, sources     │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  analyze_signature_change()             │
│  "¿Qué rompo si cambio mi firma?"       │
│  → Breaking changes, risk, recommendations│
└─────────────────────────────────────────┘
```

---

## ⚡ Zero LLM: El Determinismo Absoluto

### La Promesa

OmnySys busca **97-99% de cobertura** con **0% de LLM** para la extracción.

| Capa | Técnica | LLM? |
|------|---------|------|
| **Box Test** (v0.5) | AST + grafo de imports | ❌ No |
| **Molecular** (v0.6) | AST + call graph | ❌ No |
| **Data Flow** (v0.7) | AST + visitor pattern | ❌ No |
| **Simulación** (v0.7+) | Graph walking | ❌ No |
| **Arquetipos** | Rule-based detection | ❌ No (confidence ≥ 0.8) |

### Cuándo SÍ Usamos LLM

Solo cuando `confidence < 0.8`:

```javascript
// Caso 1: Evidencia suficiente → BYPASS
if (confidence >= 0.8) {
  return { needsLLM: false };  // Ahorramos 2-3 segundos
}

// Caso 2: Evidencia parcial → LLM con contexto
if (confidence >= 0.5) {
  return { 
    needsLLM: true,
    context: "Ya detecté: hasNetworkCalls, hasEventEmitters. Verificar: ¿coordina múltiples APIs?"
  };
}

// Caso 3: Sin evidencia → Full LLM
return { 
  needsLLM: true,
  context: "Análisis completo necesario"
};
```

**Estimación**: Solo ~2-5% de funciones necesitan LLM.

---

## 🔮 Más Allá del v0.7: Roadmap

El fractal puede seguir profundizando:

### v0.8 - Intra-Atómico: Dentro de la Transformación

**Concepto**: Dentro de cada transformación, ver los **sub-átomos**:

```javascript
// Transformación actual (v0.7)
{
  from: "total",
  to: "finalTotal",
  operation: "arithmetic"
}

// Intra-atómico (v0.8) - MÁS GRANULAR
{
  from: "total",
  to: "finalTotal",
  operation: "arithmetic",
  subOperations: [
    { op: "multiply", operands: ["total", "discount"], result: "savings" },
    { op: "subtract", operands: ["total", "savings"], result: "finalTotal" }
  ],
  precision: "line-by-line"
}
```

**Para qué sirve**: 
- Detectar precision loss en cálculos financieros
- Optimizar transformaciones innecesarias
- Validar invariantes matemáticos

---

### v0.9 - Estado Cuántico: Múltiples Universos

**Concepto**: Simular **todos los paths posibles** (if/else, try/catch):

```javascript
// Simulación multi-universo
function processOrder(order) {
  if (!order.items.length) throw new Error("Empty");  // Universo A
  if (order.total > 10000) applyDiscount();           // Universo B
  return saveOrder(order);                            // Universo C
}

// Posibles universos:
Universe A: order.items=[] → throw → catch → error_response
Universe B: order.total=15000 → applyDiscount → saveOrder → success
Universe C: order.total=5000 → saveOrder → success
```

**Para qué sirve**:
- Generar test cases automáticamente
- Detectar paths no cubiertos por tests
- Análisis de riesgo: "¿Qué pasa si falla X?"

---

### v0.10 - Campo Unificado: Entrelazamiento

**Concepto**: Detectar **entrelazamiento cuántico** entre archivos lejanos:

```javascript
// Archivo A (frontend)
const user = await fetchUser(id);

// Archivo B (backend) 
app.get('/api/user/:id', handler);

// Entrelazamiento detectado:
// frontend.fetchUser() ──entrelazado──→ backend./api/user/:id
// Si cambia el contrato en B, A se rompe (aunque no haya import directo)
```

**Para qué sirve**:
- Detectar breaking changes en APIs
- Mapear dependencias cross-service
- Validar contratos entre frontend y backend

---

## 🎓 Resumen para Humanos

### Si Solo Vas a Recordar 3 Cosas

1. **Cajas con cables** (v0.5): Sabemos qué archivos se conectan
2. **Átomos dentro de cajas** (v0.6): Sabemos qué funciones existen y se llaman
3. **Electrones orbitando** (v0.7): Sabemos cómo fluyen los datos dentro de cada función

### Principios Clave

- **Todo es fractal**: El mismo patrón A→B→C se repite en cada nivel
- **Todo se deriva**: El sistema no duplica datos. Si cambia un electrón, se recalcula todo hacia arriba
- **Zero LLM**: 97% del análisis es determinístico (AST + reglas). Solo el 3% necesita IA
- **Intuición Artificial**: Pattern recognition sin razonamiento explícito

---

## 📚 Documentación Relacionada

### Fundamentos
- [principles.md](./principles.md) - Los 4 Pilares técnicos
- [Arquitectura de 3 Capas](../architecture/ARCHITECTURE_LAYER_A_B.md) - Implementación

### Sistemas Específicos
- [Data Flow Fractal](../architecture/DATA_FLOW.md) - Extracción de flujo de datos
- [Sistema de Arquetipos](../architecture/ARCHETYPE_SYSTEM.md) - Catálogo completo
- [Shadow Registry](../architecture/SHADOW_REGISTRY.md) - Preservación de ADN

### Ideas Futuras
- [Transformation Contracts](../ideas/TRANSFORMATION_CONTRACTS.md)
- [Virtual Flow Simulation](../ideas/VIRTUAL_FLOW_SIMULATION.md)
- [Universal Pattern Engine](../ideas/UNIVERSAL_PATTERN_ENGINE.md)

---

**OmnySys v0.7.1** - Modelando el software como un sistema físico observable.  
**Implementando Intuición Artificial para ingeniería de software.**
