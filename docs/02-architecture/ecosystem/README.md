# Ecosistema OmnySys - Todo se Alimenta de Todo

**Versión**: v0.7.1  
**Visión**: OmnySys no es un pipeline (A→B→C), es un **ecosistema de datos** donde cada sistema se alimenta de los demás.

> *"No hay ruido, solo datos esperando ser conectados"*

---

## 🎯 Concepto Central

### Mentalidad Pipeline (incorrecta)
```
Extracción → Validación → Almacenamiento → Uso
     A    →     B      →       C        →  D
```

### Mentalidad Ecosistema (correcta)
```
                    ┌─────────────────┐
                    │   Shadow Registry│
                    │   (Memoria)      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Data Flow    │◄─►│   Archetype   │◄─►│   Performance │
│  Analyzer     │   │   Detector    │   │   Impact      │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Clan Registry │
                    │  (Patrones)    │
                    └───────────────┘
```

**Cada sistema consume datos de TODOS los demás.**

---

## 📚 Documentos en esta Sección

| Documento | Descripción | Leer primero |
|-----------|-------------|--------------|
| [architecture.md](./architecture.md) | **Arquitectura del ecosistema**, matriz de alimentación | ✅ Sí |
| [value-flow.md](./value-flow.md) | **Flujo de valor**, insights emergentes, presentación | Después |

---

## 🧠 Conceptos en 30 Segundos

### Red de Valor

El valor de un dato está en **quién lo consume**, no en quién lo genera.

```
Data Flow (A) ──┐
                ├──► Insight: "Esta función tiene riesgo" (D)
Type Contracts (B) ──┘
                     │
                     ▼
              Archetype: "API Boundary" (E)
                     │
                     ▼
              Warning: "Cambios rompen contrato" (F)
```

**El valor está en F, pero viene de A+B.**

### Ciclos de Alimentación

Ningún dato es ruido. Todo es input para algo:

| "Ruido" | En realidad es... | Usado por... |
|---------|-------------------|--------------|
| `complexity: 12` | Input para criticality | Archetype + Performance |
| `operationSequence` | ADN comportamental | Clan Registry + Predicción |
| `nestedLoops: 2` | Indicador de performance | Impact analysis |
| `generation: 3` | Historia evolutiva | Shadow Registry + Warnings |

---

## 📊 Matriz de Alimentación

| Sistema | Consume de | Produce para |
|---------|-----------|--------------|
| **DNA Extractor** | Data Flow, Semantic | Shadow Registry, Clan Registry |
| **Shadow Registry** | DNA, Metadata | Archetype Detector, Context Queries |
| **Archetype Detector** | Metrics, Connections, Ancestry | Performance, Warnings, LLM Bypass |
| **Performance Impact** | Archetype, Metrics, Complexity | Warnings, Critical Path Detection |
| **Type Contracts** | JSDoc, Code, Data Flow | Error Flow, Connection Validation |
| **Error Flow** | Type Contracts, Calls | Unhandled Error Detection, Risk Score |
| **Temporal** | Lifecycle, Async | Race Detection, Init Order |
| **Clan Registry** | DNA, Operation Sequence | Pattern Prediction, Recommendations |

---

## 🔄 Ejemplo de Flujo de Valor

```javascript
// GENERADO: Data Flow Extractor
atom.operationSequence = ['receive', 'read', 'transform', 'persist'];
// Solo: secuencia de strings

// CONECTADO: Clan Registry
clan = findClanBySequence(atom.operationSequence);
// → Clan "read-transform-persist"

// NUEVO VALOR: Clan Registry
clan.historicalPatterns = {
  evolution: "67% agregaron validación en gen 2",
  commonMistakes: ["Olvidar error handling en 'read'"],
  avgComplexityGrowth: 1.4
};

// PROPAGADO: Context Query
warning = {
  type: 'clan-pattern',
  message: "Funciones del clan 'read-transform-persist' suelen:",
  predictions: [
    "1. Agregar validación (67% probabilidad)",
    "2. Crecer en complejidad (avg +40%)"
  ],
  recommendation: "Considera agregar validación temprano"
};

// VALOR FINAL: Warning útil para el desarrollador
// VIENE DE: Operation sequence (que parecía ruido)
```

---

## 🔗 Relación con Otros Sistemas

```
01-core/principles.md (4 Pilares)
    ↓
02-architecture/
    ├── data-flow/concepts.md (genera datos)
    ├── archetypes/system.md (detecta patrones)
    ├── shadow-registry/ (memoria histórica)
    └── ecosystem/ (este directorio - conecta todo)
        ↓
03-orchestrator/ (usa insights para decisiones)
```

---

**Siguiente paso**: Lee [architecture.md](./architecture.md) para la arquitectura técnica del ecosistema.
