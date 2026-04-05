# Issues y Mejoras - OmnySys MCP

**VersiÃ³n**: v0.9.61  
**Ãšltima auditorÃ­a**: 2026-02-25  
**Estado**: âœ… **100% EstÃ¡tico, 0% LLM** - Dead Code Detection 85% preciso

---

## âœ… Issues Resueltos (v0.9.61)

### 1. Dead Code Detection - 85% Mejora

| Campo | Valor |
|-------|-------|
| **Severidad** | Alta |
| **Archivo** | `src/layer-c-memory/mcp/tools/patterns/dead-code.js` |
| **Causa** | Falsos positivos en constructores, mÃ©todos de clase, callbacks |
| **Estado** | âœ… RESUELTO |

**Fix aplicado**: Agregados 12 patrones de exclusiÃ³n en `shouldSkipAtom()`:

```javascript
// 1. Tests y scripts de anÃ¡lisis
if (isTestCallback(atom)) return true;
if (isAnalysisScript(atom)) return true;

// 2. Purpose explÃ­cito
if (atom.purpose?.isDeadCode === false) return true;
if (['API_EXPORT', 'TEST_HELPER'].includes(atom.purpose)) return true;

// 3. Exportados o llamados
if (atom.isExported === true) return true;
if (atom.calledBy?.length > 0) return true;

// 4. DinÃ¡micamente usados
if (isDynamicallyUsed(atom)) return true;

// 5. Event handlers
if (atom.name?.startsWith('on') || atom.name?.startsWith('handle')) return true;

// 6. Constantes y variables
if (atomType === 'variable' || atomType === 'constant') return true;

// 7. Constructores y mÃ©todos de clase
if (atom.name === 'constructor' || atom.archetype?.type === 'class-method') return true;

// 8. Funciones muy cortas
if ((atom.linesOfCode || 0) <= 5) return true;

// 9. Detectores/estrategias (se pasan como callbacks)
if (['detector', 'strategy', 'validator'].includes(atom.archetype?.type)) return true;

// 10. Builder pattern
if (atom.name?.startsWith('with') && atom.className) return true;

// 11. Archivos que no existen
if (atom.filePath && !fileExists(atom.filePath)) return true;
```

**Resultado**: 273 â†’ 42 casos (85% menos falsos positivos)

---

### 2. LLM Deprecated - 100% EstÃ¡tico

| Campo | Valor |
|-------|-------|
| **Severidad** | Alta |
| **Cambio** | EliminaciÃ³n completa de LLM |
| **Estado** | âœ… RESUELTO |

**Cambios aplicados**:
- Eliminadas todas las referencias a LLM en documentaciÃ³n
- AnÃ¡lisis 100% estÃ¡tico (AST + regex + Ã¡lgebra de grafos)
- Determinismo absoluto: misma entrada â†’ misma salida

**Resultado**: 0% LLM, 100% determinÃ­stico

---

### 3. SQLite + Bulk Operations

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Archivo** | `src/layer-c-memory/storage/repository/` |
| **Estado** | âœ… RESUELTO |

**Mejoras aplicadas**:
- MigraciÃ³n completa a SQLite (de JSON)
- Bulk insert de 13,000 Ã¡tomos en ~3 segundos (vs 30 segundos)
- WAL mode para mejor performance
- 64MB cache, 4KB pages

**Resultado**: 10x mÃ¡s rÃ¡pido, integridad referencial garantizada

---

### 4. CalledBy Linkage - 44.7% â†’ 100% de lo posible

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja |
| **MÃ©trica** | 44.7% coverage |
| **Estado** | âœ… MEJORADO (era 41.5%) |

**6 sub-pasos de linkage implementados**:

1. âœ… Function calledBy (`linkFunctionCalledBy`)
2. âœ… Variable reference calledBy (`linkVariableCalledBy`)
3. âœ… Mixin/namespace imports (`linkMixinNamespaceCalledBy`)
4. âœ… Class instantiation (`resolveClassInstantiationCalledBy`)
5. âœ… Export object references (`linkExportObjectReferences`)
6. âœ… Caller Pattern Detection (`enrichWithCallerPattern`)

**ExplicaciÃ³n**: El 44.7% es el mÃ¡ximo posible porque:
- Entry points (main, handlers) no tienen callers por diseÃ±o
- Dead code no tiene callers intencionales
- Algunos mÃ©todos se llaman dinÃ¡micamente

---

## ðŸ”´ Issues Conocidos (v0.9.61)

### 1. God Functions - 193 funciones

| Campo | Valor |
|-------|-------|
| **Severidad** | Alta |
| **Cantidad** | 193 funciones con complejidad > 15 |
| **Top 5** | deduceAtomPurpose (37), extractJSON (34), enhanceSystemMap (34) |
| **Estado** | ðŸ”´ EN PROGRESO |

**PrÃ³ximas acciones**:
- Refactorizar top 5 god functions
- Extraer funciones helper
- Reducir complejidad a < 15

---

### 2. Duplicados - 118 exactos

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Cantidad** | 118 duplicados exactos, 694 contextuales |
| **LÃ­neas eliminables** | 124,102 LOC |
| **Estado** | ðŸ”´ PENDIENTE |

**PrÃ³ximas acciones**:
- Consolidar funciones duplicadas en scripts/utils
- Extraer utilidades compartidas
- Eliminar cÃ³digo duplicado en test-cases

---

### 3. Test Coverage - 79%

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja |
| **Coverage** | 79% (target: 80%) |
| **Funciones sin tests** | 508 |
| **Estado** | ðŸŸ¡ CASI |

**PrÃ³ximas acciones**:
- Generar tests para 508 funciones sin coverage
- Usar `generate_batch_tests` para automatizar
- Alcanzar 80% coverage

---

### 4. Async Waterfalls

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Funciones crÃ­ticas** | atomic_edit (13 awaits), restart_server (14 awaits) |
| **Estado** | ðŸ”´ PENDIENTE |

**PrÃ³ximas acciones**:
- Paralelizar awaits independientes con `Promise.all()`
- Reducir awaits secuenciales en 90%
- Mejorar performance de funciones async

---

### 5. Race Conditions - 3 detectadas

| ID | Tipo | Severidad | Recurso | Estado |
|----|------|-----------|---------|--------|
| RACE-002 | RW | CRÃTICO | call:save | ðŸ”´ PENDIENTE |
| RACE-001 | WW | HIGH | call:save | ðŸ”´ PENDIENTE |
| RACE-003 | WW | HIGH | call:createTestSuiteWithPreset | ðŸ”´ PENDIENTE |

**PrÃ³ximas acciones**:
- Agregar locks para escritura concurrente
- Usar transacciones SQLite
- Implementar retry logic

---

## ðŸš§ MejÃ­as en Progreso

### 1. Tree-sitter Migration (Q2 2026)

**Objetivo**: Reemplazar Babel con Tree-sitter

**Beneficios**:
- Mejor detecciÃ³n de `isExported` para arrow functions
- AnÃ¡lisis de tipos TypeScript mÃ¡s preciso
- Performance mejorado en proyectos grandes
- Soporte para mÃ¡s lenguajes (Rust, Go, Python)

**Estado**: ðŸš§ PLANIFICADO

---

### 2. Intra-AtÃ³mico (Q3 2026)

**Objetivo**: Dentro de cada transformaciÃ³n, ver los **sub-Ã¡tomos**:

```javascript
// TransformaciÃ³n actual (v0.9.61)
{
  from: "total",
  to: "finalTotal",
  operation: "arithmetic"
}

// Intra-atÃ³mico (Q3 2026) - MÃS GRANULAR
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

**Estado**: ðŸš§ PLANIFICADO

---

### 3. Estado CuÃ¡ntico (Q4 2026)

**Objetivo**: Simular **todos los paths posibles** (if/else, try/catch):

```javascript
// SimulaciÃ³n multi-universo
function processOrder(order) {
  if (!order.items.length) throw new Error("Empty");  // Universo A
  if (order.total > 10000) applyDiscount();           // Universo B
  return saveOrder(order);                            // Universo C
}

// Posibles universos:
Universe A: order.items=[] â†’ throw â†’ catch â†’ error_response
Universe B: order.total=15000 â†’ applyDiscount â†’ saveOrder â†’ success
Universe C: order.total=5000 â†’ saveOrder â†’ success
```

**Estado**: ðŸš§ PLANIFICADO

---

## ðŸ“Š MÃ©tricas de Calidad (v0.9.61)

| MÃ©trica | Antes | Ahora | Mejora |
|---------|-------|-------|--------|
| **Dead Code** | 273 | 42 | â¬‡ï¸ 85% |
| **God Functions** | 202 | 193 | â¬‡ï¸ 9 |
| **LLM Usage** | 5-10% | 0% | âœ… 100% |
| **CalledBy Coverage** | 41.5% | 44.7% | â¬†ï¸ 3.2% |
| **Health Score** | 98/100 | 99/100 | â¬†ï¸ 1% |
| **Test Coverage** | 78% | 79% | â¬†ï¸ 1% |

---

## ðŸŽ¯ Objetivos Q2 2026

- [ ] Migrar a Tree-sitter
- [ ] Eliminar 50% de god functions (193 â†’ ~100)
- [ ] Consolidar 50% de duplicados (118 â†’ ~60)
- [ ] Alcanzar 80% test coverage
- [ ] Eliminar 3 race conditions
- [ ] Reducir async waterfalls en 90%

---

**Ãšltima actualizaciÃ³n**: 2026-02-25 (v0.9.61)  
**Estado**: âœ… **100% EstÃ¡tico, 0% LLM**  
**PrÃ³ximo**: ðŸš§ MigraciÃ³n a Tree-sitter (Q2 2026)

---

## Maintenance Note - 2026-03-30

### Reconnecting bug in Codex VS Code connector

Observed behavior:

- the daemon can boot healthy and keep MCP sessions alive
- the chat surface can still fall into `Reconnecting...`
- the issue becomes more visible after hot-reload, reindex, or runtime refresh

Server-side hardening applied:

- shared resumable HTTP event store
- stricter session deduplication and fresh-session replay
- JSON `POST` responses for MCP HTTP transports
- `Accept` header normalization before dispatch to the SDK transport

Interpretation:

- this bug is no longer treated as only a session-manager issue
- it is a combined reconnect problem across session recovery and client HTTP
  handshake compatibility
- maintenance work in `docs/04-maintenance` should keep both dimensions in
  scope

## Maintenance Note - 2026-04-04

### Transport provenance drift around MCP access

Current observation:

- the daemon is healthy
- schema, tool inventory, and pipeline integrity are healthy
- the remaining confusion is not "daemon down"
- the remaining confusion is whether the client is using the native MCP path
  or falling back to shell-driven HTTP access

What this looks like in practice:

- a shell command can successfully talk to the MCP HTTP daemon
- that proves reachability, but not native bridge health
- the UI can therefore look like it is using MCP normally when it is actually
  using a fallback transport path

What we still need to capture better:

- `native_mcp`
- `stdio_bridge`
- `http_direct`
- `shell_http_fallback`

Why this matters:

- the reconnect bug is not just "session lost"
- it also includes transport provenance drift
- if we cannot tell which path was used, we cannot quickly diagnose whether the
  bridge, the session cache, or the shell fallback is the true problem

Current conclusion:

- the bug persists
- the daemon is not the part failing
- the remaining work is to make provenance explicit in telemetry and notes so
  future debugging can separate "daemon healthy" from "bridge healthy" from
  "fallback HTTP over shell"

---

### 1.1. MCP Session Bootstrap Provenance

| Campo | Valor |
|-------|-------|
| **Severidad** | Alta |
| **Archivo** | `src/layer-c-memory/mcp-http-session-routing.js` |
| **Causa** | El bootstrap de `POST /mcp` no distinguía bien entre una sesión stale, un initialize frío y una recuperación persistida |
| **Estado** | ? RESUELTO |

**Fix aplicado**:
- `POST /mcp` ahora siempre parsea el body, incluso si existe un `mcp-session-id` viejo.
- Se agregó metadata de handshake para distinguir `http-initialize`, `http-reinitialize` y `http-recovered`.
- La telemetría de sesión y tool runs ahora guarda `transport_origin`.

**Resultado**:
- El daemon puede estar sano y aun así la sesión fallar si el contrato de init es ciego.
- Ahora el contrato de bootstrap queda trazado y recuperable.

---

### 1.2. Policy Coverage Customs Gate Is Not a Runtime Health Check

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Área** | `policyCoverage` / `propagationExpansion` |
| **Lectura correcta** | El daemon puede estar sano mientras la aduana siga en `stale` |
| **Estado** | ? DOCUMENTADO |

**Aprendizaje**:
- `policyCoverage` mide conformidad de contrato entre inventory, status, metrics y explainability.
- `propagationExpansion` avisa cuando una surface no está surfacing el contrato canónico.
- Un `healthScore` alto no contradice un `policyCoverage` en `stale`.

**Implicación práctica**:
- No tratar `stale` como caída del runtime.
- Tratarlo como drift de gobernanza y surface propagation.

**Extensión aprendida**:
- propagationExpansion ahora también explicita si la metadata extractada o la paridad de superficie están débiles.
- Si el inventory o la metadata todavía están incompletos, el motivo del drift lo menciona para no culpar solo a las tools.
- El gate sigue midiendo el contrato de propagación; solo gana contexto para que la lectura sea más operativa.

**Extensión aprendida**:
- policyCoverage también absorbe señales de metadataCoveragePct e integrationCoveragePct cuando están presentes.
- Un inventory con cobertura parcial de metadata o integración no debería leerse como resh solo porque el daemon esté sano.
- El customs gate puede estar watching aunque el runtime siga en A+.


### 6. Atom Evolution History

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Estado** | ✅ RESUELTO |

**Fix aplicado**:
- `atom_versions` sigue siendo la tabla operativa viva.
- Cada version update now archives into `.omnysysdata/atom-history.db`.
- `get_atom_history` can blend git history with persisted atom evolution history.
- `mcp_omnysystem_get_atom_evolution_report` compone details + DNA + data flow + impact + history + schema context in one canonical MCP surface.
- `reanalyze` cleanup preserves `atom-history.db` so long-term atom evolution survives wipes.

**Impacto**:
- The project can now keep long-lived atom evolution history separate from the operational SQLite DB.
- This reduces the risk of losing meaningful historical signal during destructive reindex flows.
