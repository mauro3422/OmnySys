# Sistema de Arquetipos - Catálogo y Extensión

**Versión**: v0.9.61  
**Estado**: ✅ **100% Estático, 0% LLM** - Confidence-Based Bypass  
**Implementa**: [Pilar 1 - Box Test](../01-core/principles.md)  
**Última actualización**: 2026-02-25

---

## ¿Qué son los Arquetipos?

Los arquetipos clasifican archivos y funciones según sus **patrones de conexión**: cómo una entidad se conecta con otras.

> **IMPORTANTE (v0.9.61)**: Todos los arquetipos se detectan de forma **100% ESTÁTICA** (AST + regex + álgebra de grafos). **CERO uso de LLM**.

---

## Parte 1: Catálogo de Arquetipos

### The Box Test (Pilar 1)

Antes de que un arquetipo sea válido, debe pasar este test:

> **"Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no vería?"**

| Arquetipo | Pasa Box Test? | Qué cables revela | Detección |
|-----------|---------------|-------------------|-----------|
| `god-function` | ✅ | Función con 20+ llamadas. Alto blast radius | Estático (complejidad > 20) |
| `fragile-network` | ✅ | Llamadas de red sin error handling | Estático (hasNetworkCalls + !hasErrorHandling) |
| `hot-path` | ✅ | Función exportada con 5+ callers | Estático (isExported + calledBy.length > 5) |
| `dead-function` | ✅ | Función sin callers | Estático (!isExported + calledBy.length === 0) |
| `utility` | ✅ | Función pura sin side effects | Estático (!hasSideEffects + complexity < 5) |
| `factory` | ✅ | Función que crea objetos | Estático (name.startsWith('create') || name.startsWith('build')) |
| `validator` | ✅ | Función que valida datos | Estático (name.startsWith('validate') || name.startsWith('check')) |
| `transformer` | ✅ | Función que transforma datos | Estático (dataFlow.operationSequence.includes('transform')) |
| `persister` | ✅ | Función que persiste datos | Estático (dataFlow.operationSequence.includes('persist')) |
| `handler` | ✅ | Maneja eventos/callbacks | Estático (name.startsWith('handle') || name.startsWith('on')) |
| `initializer` | ✅ | Inicializa estado/config | Estático (name.startsWith('init') || name.startsWith('setup')) |
| `orchestrator` | ✅ | Coordina múltiples funciones | Estático (calls.length > 10 + complexity > 10) |

**Anti-ejemplos** (NO son arquetipos):
- "usa CSS-in-JS" ❌ (estilo, no conexión)
- "tiene TypeScript" ❌ (lenguaje, no conexión)
- "tiene errores" ❌ (calidad, no conexión)

---

## Parte 2: Detección 100% Estática (v0.9.61)

### Reglas de Detección

```javascript
// src/layer-a-static/pipeline/phases/atom-extraction/metadata/archetype-rules.js

const ATOM_ARCHETYPES = {
  'hot-path': {
    detector: (atom) => atom.isExported && atom.calledBy?.length > 5,
    severity: 7
  },
  'utility': {
    detector: (atom) => !atom.hasSideEffects && atom.complexity < 5,
    severity: 2
  },
  'god-function': {
    detector: (atom) => atom.complexity > 20 || atom.linesOfCode > 100,
    severity: 9
  },
  'dead-function': {
    detector: (atom) => !atom.isExported && atom.calledBy?.length === 0,
    severity: 5
  },
  'fragile-network': {
    detector: (atom) => atom.hasNetworkCalls && !atom.hasErrorHandling,
    severity: 8
  },
  'factory': {
    detector: (atom) => atom.name.startsWith('create') || atom.name.startsWith('build'),
    severity: 4
  },
  'validator': {
    detector: (atom) => atom.name.startsWith('validate') || atom.name.startsWith('check'),
    severity: 6
  },
  'transformer': {
    detector: (atom) => atom.dataFlow?.operationSequence?.includes('transform'),
    severity: 5
  },
  'persister': {
    detector: (atom) => atom.dataFlow?.operationSequence?.includes('persist'),
    severity: 6
  }
};
```

**NOTA**: Todas las reglas son **100% estáticas**. No hay LLM.

---

## Parte 3: Confidence-Based Bypass (Histórico)

### Estado Actual (v0.9.61)

**LLM está DEPRECATED**. El confidence-based bypass ya no se usa porque:

1. ✅ Las reglas estáticas son suficientes
2. ✅ 100% determinístico
3. ✅ Más rápido (0 tokens, 0 costo)
4. ✅ Más preciso (sin ambigüedad)

### Tabla Histórica (Solo Referencia)

| Arquetipo | Antes (LLM) | Ahora (v0.9.61) |
|-----------|-------------|-----------------|
| `god-function` | Confidence-based | ✅ Estático (complejidad > 20) |
| `dynamic-importer` | Siempre LLM | ✅ Estático (import() detection) |
| `event-hub` | Confidence-based | ✅ Estático (emit/on cross-ref) |
| `global-state` | Confidence-based | ✅ Estático (window.* cross-ref) |
| `state-manager` | Confidence-based | ✅ Estático (localStorage cross-ref) |
| `orphan-module` | Confidence-based | ✅ Estático (calledBy.length === 0) |
| `singleton` | Confidence-based | ✅ Estático (pattern detection) |

---

## Parte 4: Métricas Reales (v0.9.61)

### Distribución de Arquetipos

```
┌─────────────────────────────────────────────────────────────┐
│  Arquetipos Detectados — v0.9.61                           │
├─────────────────────────────────────────────────────────────┤
│  utility:        4,500 (33.4%)                             │
│  standard:       3,200 (23.7%)                             │
│  private-utility: 2,100 (15.6%)                            │
│  transformer:    1,200 (8.9%)                              │
│  persister:      800 (5.9%)                                │
│  validator:      600 (4.5%)                                │
│  factory:        400 (3.0%)                                │
│  handler:        300 (2.2%)                                │
│  god-function:   193 (1.4%)                                │
│  dead-function:  42 (0.3%)                                 │
│  hot-path:       150 (1.1%)                                │
│  fragile-network: 65 (0.5%)                                │
└─────────────────────────────────────────────────────────────┘
```

### Evolución

| Versión | Arquetipos | LLM Usage | Método |
|---------|------------|-----------|--------|
| v0.5.0 | 11 | 30% | Híbrido |
| v0.6.0 | 15 | 10% | Mayoría estático |
| v0.9.0 | 18 | 5% | Casi todo estático |
| v0.9.61 | 18 | **0%** | **100% estático** ✅ |

---

## Parte 5: Extensión (Agregar Nuevos Arquetipos)

### Guía Paso a Paso

**1. Definir el arquetipo**:

```javascript
const NEW_ARCHETYPE = {
  name: 'my-archetype',
  detector: (atom) => {
    // Tu lógica de detección aquí
    return atom.someCondition && atom.anotherCondition;
  },
  severity: 5  // 1-10
};
```

**2. Aplicar Box Test**:

> "¿Este arquetipo revela CONEXIONES invisibles?"

- ✅ SÍ → Continuar
- ❌ NO → Rechazar (no es arquetipo, es solo metadata)

**3. Agregar al registry**:

```javascript
// src/layer-a-static/pipeline/phases/atom-extraction/metadata/archetype-rules.js
export const ATOM_ARCHETYPES = {
  // ... arquetipos existentes
  'my-archetype': NEW_ARCHETYPE
};
```

**4. Documentar**:

- Agregar a esta documentación
- Especificar qué conexiones revela
- Proveer ejemplos de código

---

## Parte 6: Uso en MCP Tools

### `detect_patterns`

```bash
curl -X POST http://localhost:9999/tools/detect_patterns \
  -H "Content-Type: application/json" \
  -d '{"patternType": "god-functions"}'
```

**Retorna**:
```json
{
  "godFunctions": {
    "count": 193,
    "top5": [
      {
        "name": "deduceAtomPurpose",
        "file": "scripts/enrich-atom-purpose.js",
        "complexity": 37,
        "linesOfCode": 73
      }
    ]
  }
}
```

### `get_function_details`

```bash
curl -X POST http://localhost:9999/tools/get_function_details \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/utils.js", "functionName": "processOrder"}'
```

**Retorna**:
```json
{
  "atom": {
    "archetype": {
      "type": "persister",
      "severity": 6,
      "confidence": 1.0
    }
  }
}
```

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ **100% Estático, 0% LLM**  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
