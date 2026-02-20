# Issues y Mejoras - OmnySys MCP

**Versión**: v0.9.18
**Última auditoría**: 2026-02-20

---

## Issues Detectados

### 1. `search_files` - Error `map is not a function`

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Archivo** | `src/layer-c-memory/mcp/tools/search.js:32` |
| **Causa** | Asume que `exports` siempre es array |
| **Estado** | FIXEADO |

**Fix aplicado**:
```javascript
// Antes
const exports = fileInfo.exports?.map(e => e.name || e).join(' ') || '';

// Después
const exports = Array.isArray(fileInfo.exports) 
  ? fileInfo.exports.map(e => e.name || e).join(' ') 
  : '';
```

---

### 2. `get_call_graph` - No detecta referencias a variables

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Archivo** | `src/layer-c-memory/mcp/tools/lib/analysis/call-graph-analyzer.js:119` |
| **Causa** | Solo detecta llamadas `name()`, no referencias `name` |
| **Estado** | FIXEADO |

**Fix aplicado**: Agregado patrón 1b para referencias a variables:
```javascript
// Nuevo patrón
else if (new RegExp(`\\b${localName}\\b`).test(line) && 
         !line.includes(`${localName}(`) && 
         !line.includes(`${localName}.`) &&
         !new RegExp(`(function|const|let|var|import|export)\\s+${localName}`).test(line)) {
  match = { type: 'reference', name: localName };
  callType = 'variable_reference';
}
```

**Resultado**: `toolDefinitions` ahora muestra 53 call sites (antes 0).

---

### 3. Dependencias inconsistentes (usedBy ↔ dependsOn)

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Cantidad** | 59 inconsistencies |
| **Causa** | Archivos renombrados/eliminados sin actualizar caché |
| **Estado** | PENDIENTE |

**Acción sugerida**:
```bash
# Limpiar caché y re-analizar
rm -rf .omnysysdata
npm run analyze
```

---

### 4. calledBy linkage solo 44.7%

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja |
| **Métrica** | 2,654 / 5,938 átomos con calledBy |
| **Causa** | Por diseño - entry points, dead code, class methods dinámicos |
| **Estado** | MEJORADO (era 41.5%, ahora 44.7%) |

**Explicación**: 
- Funciones: Se linkean via `calls` → `calledBy`
- Variables/Constants: **FIXEADO** - Ahora se detectan referencias via imports
- Class methods: Requieren `class-instantiation-tracker.js`
- Entry points (main, handlers): No tienen callers por diseño
- Dead code: No tienen callers intencionales

---

## Mejoras Propuestas

### 1. Nueva herramienta: `get_atom_society`

**Objetivo**: Detectar cadenas, clusters y hubs de átomos conectados.

**Datos disponibles**:
- `calledBy` - Quién llama a este átomo
- `calls` - A quién llama este átomo
- `purpose` - API_EXPORT, INTERNAL_HELPER, DEAD_CODE, etc.
- `archetype` - hot-path, god-function, fragile-network, etc.
- `dna.structuralHash` - Hash único para detectar código similar

**Algoritmo**:
```javascript
function detectSociety(atoms) {
  // 1. Cadenas: A → B → C → D
  const chains = findSequentialChains(atoms);
  
  // 2. Clusters: Funciones que se llaman mutuamente
  const clusters = findMutuallyConnected(atoms);
  
  // 3. Hubs: Funciones conectadas a muchas
  const hubs = atoms.filter(a => a.calledBy?.length > 10);
  
  return { chains, clusters, hubs };
}
```

---

### 2. Mejorar `get_function_details` - Agregar metadata no usada

| Campo | Disponible | Usado | Propuesta |
|-------|------------|-------|-----------|
| `dna` | 99.7% | No | Agregar `structuralHash` |
| `performance` | 99.7% | No | Agregar `bigO`, `nestedLoops` |
| `errorFlow` | ~100% | No | Agregar `catches`, `throws` |
| `temporal` | ~100% | No | Agregar `asyncPatterns`, `timers` |
| `typeContracts` | 99.7% | No | Agregar `signature`, `confidence` |

---

### 3. Mejorar `get_molecule_summary` - Métricas de sociedad

**Agregar**:
- `cohesionScore`: Qué tan conectados están los átomos
- `stabilityScore`: Basado en cambios recientes
- `entropyScore`: Desorden del código
- `societyMembers`: Átomos en la misma "sociedad"

---

### 4. Nueva herramienta: `detect_patterns`

**Usar `dna.structuralHash`** para:
- Encontrar código duplicado
- Detectar funciones similares
- Sugerir refactorings

---

### 5. Nueva herramienta: `get_health_metrics`

**Calcular**:
- Entropía por archivo
- Salud del átomo (violación de límites)
- Score de cohesión
- Predicción de cambios

---

## Métricas del Sistema

| Métrica | Valor |
|---------|-------|
| Archivos analizados | 1,747 |
| Átomos extraídos | 5,984 |
| Cobertura calledBy | 41.5% |
| Culture coverage | 99.5% |
| Health Score | 76.6/100 |

### Coverage de metadata por átomo

| Campo | Coverage |
|-------|----------|
| complexity | 100% |
| dataFlow | 100% |
| dna | 99.7% |
| archetype | 99.7% |
| typeContracts | 99.7% |
| performance | 99.7% |
| temporal | ~100% |
| errorFlow | ~100% |

---

## Scripts de Auditoría Disponibles

| Script | Propósito |
|--------|-----------|
| `audit-atoms-correct.js` | Verifica atoms y calledBy |
| `audit-data-integrity.js` | Integridad de datos extraídos |
| `audit-relationships.js` | Consistencia de relaciones |
| `audit-full-scan.js` | Scan completo del sistema |
| `validate-graph-system.js` | Validación del grafo |

---

## Fixes Aplicados en v0.9.18

| Fix | Archivo | Resultado |
|-----|---------|-----------|
| Validación Array.isArray() | `search.js:32` | Elimina error `map is not a function` |
| Patrón variable_reference | `call-graph-analyzer.js:119` | Detecta referencias a variables (53 → toolDefinitions) |
| Variable reference linkage | `indexer.js:234` | Agrega 384 calledBy links para variables exportadas |

---

## Próximos Pasos

1. [ ] Implementar `get_atom_society`
2. [ ] Mejorar `get_function_details` con metadata no usada
3. [ ] Mejorar `get_molecule_summary` con métricas de sociedad
4. [x] ~~Limpiar caché para resolver dependencias inconsistentes~~ (hecho - limpiar con `rm -rf .omnysysdata`)
5. [x] ~~Documentar "Sociedad de Átomos" con ejemplos reales~~ (ver DATA_FLOW.md)
