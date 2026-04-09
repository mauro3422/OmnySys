# Consolidation API Contract

## Arquitectura Detect → Plan → Execute → Validate

Todos los tools de modificación de código en OmnySys siguen este patrón:

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   DETECT    │───▶│    PLAN      │───▶│   EXECUTE    │───▶│   VALIDATE   │
│  (Read-only)│    │ (Dry-run)    │    │ (Mutate)     │    │ (Verify)     │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## Tools de Detección (Phase 1)

| Tool | Output | Uso |
|---|---|---|
| `aggregate_metrics(conceptual_duplicates)` | Lista de grupos duplicados con fingerprint | Obtener los 50 grupos más grandes |
| `detect_folderization_opportunities` | Alertas con severity + suggested action | Monolitos, duplicación, naming debt |
| `suggest_canonical_api` | APIs canónicas que reemplazan acceso directo a DB | Detectar `repo.db.prepare()` |

## Tools de Planificación (Phase 2)

Todos los action tools soportan `execute: false` (default):

| Tool | Plan Shape | Decision Gate |
|---|---|---|
| `consolidate_conceptual_cluster` | `{actions[], ssot, fingerprint}` | `error` = bloquea auto |
| `folderize_family` | `{moveTargetCount, impactedFiles[], decision}` | `decision: reject` = bloquea |
| `split_large_file` | `{filePlan[], barrelContent}` | Review required |

### Estrategias de Consolidación

| Estrategia | Cuándo Aplica | Automatizable? |
|---|---|---|
| **re-export** | Barrel file (≤5 líneas, solo exports), mismo nombre | ✅ 100% |
| **wrapper-delegation** | Función inline, misma firma | ⚠️ Requiere AST-level edit |
| **method-wrapper** | Método de clase, nombre distinto | ⚠️ Requiere refactor de clase |
| **BLOCKED** | Método con mismo nombre del SSOT | ❌ Manual - extraer coordinator |

## Tools de Ejecución (Phase 3)

### AtomicEditor - Motor de Edición

```
AtomicEditor.edit(filePath, oldString?, newString, options)
  ├── SyntaxValidator   ← Valida como archivo JS completo (limitación actual)
  ├── SafetyValidator   ← Verifica semántica
  └── FileLockManager   ← Previene writes concurrentes
```

**Limitación conocida:** El `AtomicEditor` valida el `newString` como archivo JS standalone, no como fragmento. Esto impide reemplazar solo el cuerpo de una función.

### safe_edit - Alternativa Context-Aware

```
safe_edit(filePath, newContent, { lineNumber | pattern })
  ├── Obtiene contexto exacto (líneas before/after)
  ├── Usa atomic_edit internamente
  └── Crea backup automático
```

## Tools de Validación (Phase 4)

| Tool | Qué Verifica |
|---|---|
| `validate_imports` | Imports rotos tras la edición |
| `get_server_status` | Health post-mutacion |
| File watcher (auto) | Detecta nuevos duplicados, complexity issues |

## Heurística de Falsos Positivos

Los siguientes patrones se filtran automáticamente como `expected_repeat`:

```js
// conceptual-noise-policy.js
const genericCallbackPatterns = [
  /_callback$/,                    // any_callback
  /filter.*callback/i,             // filter_callback
  /map.*callback/i,                // map_callback
  /some.*callback/i,               // some_callback
  /every.*callback/i,              // every_callback
  /reduce.*callback/i,             // reduce_callback
  /find.*callback/i,               // find_callback
  /after_each_callback/,           // after_each_callback
  /^each_/,                        // Vitest .each()
  /^_arg\d+$/,                     // Test arg placeholders
];
```

## Batch Consolidation API (Propuesta)

```js
// consolidate-batch.js
export async function consolidate_batch(clusters, options = {
  dryRun: true,
  maxConcurrent: 3,
  skipStrategies: ['method-wrapper'],
  requireSameSignature: true
}) {
  // Para cada cluster:
  // 1. Validar que SSOT existe
  // 2. Verificar misma firma (param count, types)
  // 3. Aplicar estrategia según tipo de archivo
  // 4. Reportar: {consolidated, failed, skipped}
}
```

### Reglas de Seguridad para Batch

1. **Same-signature check**: Solo consolidar si los parámetros coinciden
2. **Barrel-first**: Priorizar archivos que solo contienen la función
3. **Skip methods**: Ignorar métodos de clase automáticamente
4. **Max impact**: No más de 5 archivos por batch
5. **Rollback on failure**: Si uno falla, revertir todos

## Flujo Recomendado para Humanos

```
1. aggregate_metrics(conceptual_duplicates) → ver 50 grupos
2. consolidate_conceptual_cluster(fp, ssot, execute:false) → ver plan
3. Si todas las actions son re-export → execute:true
4. Si hay wrapper-delegation → revisar manualmente con atomic_edit
5. Si hay method BLOCKED → extraer coordinator manualmente
```
