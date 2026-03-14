# Arquitectura de Herramientas de Análisis - Integración

## Capas de Análisis Arquitectónico

### Nivel 1: Análisis Básico (architecture-utils.js)
**Ubicación:** `src/shared/architecture-utils.js`
**Propósito:** Detectar patrones arquitectónicos básicos

```javascript
export {
  detectGodObject,           // Detecta archivos con alto acoplamiento
  detectOrphanModule,        // Detecta módulos sin dependientes
  detectArchitecturalPatterns, // Patrones combinados
  getPatternDescriptions     // Descripciones de patrones
}
```

**Usa:** Metadata de archivos (exportCount, dependentCount)

---

### Nivel 2: Recomendaciones (architectural-recommendations.js)
**Ubicación:** `src/shared/compiler/architectural-recommendations.js`
**Propósito:** Traducir síntomas en recomendaciones arquitectónicas

```javascript
export {
  resolveArchitecturalRecommendation  // Sugiere acción basada en issue
}
```

**Estrategias:**
- `thin_coordinator` - Mantener coordinador delgado
- `reexport_instead_of_wrapper` - Re-exportar en lugar de wrapper
- `canonical_surface_reuse` - Usar API canónica existente

**Usa:** `classifyFileOperationalRole()`, `buildCanonicalReuseGuidance()`

---

### Nivel 3: Reutilización de Helpers (helper-reuse-detector.js)
**Ubicación:** `src/shared/compiler/helper-reuse-detector.js`
**Propósito:** Detectar helpers duplicados y sugerir reutilización

```javascript
export {
  findExistingHelpers,              // Busca helpers similares en DB
  buildReuseSuggestion,             // Genera sugerencia con import
  detectHelperReuseOpportunities    // Detecta oportunidades en archivo
}
```

**Busca en:** `/utils/`, `/shared/`, `/helpers/`, `/common/`, `/lib/`

**Usa:** DB del OmnySys (atoms table con fingerprints semánticos)

---

### Nivel 4: Estructura de Directorios (directory-structure-analyzer.js) ⭐ NUEVO
**Ubicación:** `src/shared/compiler/directory-structure-analyzer.js`
**Propósito:** Analizar organización física de archivos

```javascript
export {
  analyzeDirectoryStructure,           // Detecta convenciones desde DB
  suggestDirectoryForFile,             // Sugiere dónde poner archivo
  validateFileLocation,                // Valida ubicación correcta
  detectArchitecturalDrift,            // Detecta archivos mal ubicados
  calculateArchitectureOrganizationScore // Score 0-100
}
```

**Patrones detectados:**
- Helpers: `/utils/`, `/helpers/`, `/common/`, `/lib/`
- Policies: `/compiler/`, `/guards/`, `/policies/`
- Services: `/services/`, `/core/`, `/domain/`
- Controllers: `/controllers/`, `/handlers/`, `/routes/`
- Models: `/models/`, `/entities/`, `/schemas/`
- Tests: `/tests/`, `/__tests__/`, `/specs/`

**Usa:** DB del OmnySys (file_path de atoms)

---

## Flujo de Integración

```
┌─────────────────────────────────────────────────────────────┐
│  FileWatcher / MCP Tools / Guards                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  compiler/index.js (Barrel Export - SSOT)                  │
│  - Exporta todas las funciones de análisis                 │
│  - Único punto de importación para el resto del sistema    │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌───────────────────┐               ┌───────────────────┐
│ architecture-    │               │ compiler/         │
│ utils.js          │               │ *.js             │
│ (shared/)         │               │ (shared/compiler/)│
│                   │               │                   │
│ - God Object      │               │ - Recommendations │
│ - Orphan Module   │               │ - Helper Reuse    │
│ - Patterns        │               │ - Directory Struct│
└───────────────────┘               └───────────────────┘
                                            ↓
                              ┌─────────────────────────┐
                              │  OmnySys DB             │
                              │  - atoms                │
                              │  - files                │
                              │  - atom_relations       │
                              └─────────────────────────┘
```

---

## Puntos de Integración Clave

### 1. `compiler/index.js` - SSOT (Single Source of Truth)
**Todas** las funciones de análisis se exportan desde acá:

```javascript
// Arquitectura básica
export { detectGodObject, detectOrphanModule } from '../architecture-utils.js';

// Recomendaciones
export { resolveArchitecturalRecommendation } from './architectural-recommendations.js';

// Helper Reuse (Tarea 2)
export { findExistingHelpers, buildReuseSuggestion } from './helper-reuse-detector.js';

// Directory Structure (Tarea 3)
export { analyzeDirectoryStructure, suggestDirectoryForFile } from './directory-structure-analyzer.js';
```

### 2. Guards del FileWatcher
Usan las funciones desde `compiler/index.js`:

```javascript
// duplicate-conceptual-core.js
import { detectHelperReuseOpportunities } from '../../../shared/compiler/index.js';

// conceptual-duplicate-risk.js
import { detectConceptualFindings } from './duplicate-conceptual-core.js';
```

### 3. MCP Tools
Pueden usar las mismas funciones:

```javascript
// suggest-canonical-api.js
import { getRepository } from '#layer-c/storage/repository/index.js';
// Usa DB directamente para detectar SQL
```

---

## Dependencias entre Módulos

```
architecture-utils.js
  ↓ (independiente, usa metadata)
  
architectural-recommendations.js
  ↓ (usa atom-role-classification.js, canonical-reuse-guidance.js)
  
helper-reuse-detector.js
  ↓ (usa DB, fingerprint semántico)
  
directory-structure-analyzer.js
  ↓ (usa DB, file_path de atoms)
```

**No hay dependencias circulares** - cada módulo es independiente.

---

## Próximas Integraciones (Tareas 4 y 5)

### Tarea 4: Architectural Pattern Detection
**Usará:**
- `detectArchitecturalPatterns()` de architecture-utils.js
- `analyzeDirectoryStructure()` de directory-structure-analyzer.js
- `resolveArchitecturalRecommendation()` de architectural-recommendations.js

**Archivo nuevo:** `src/shared/compiler/architectural-pattern-detector.js`

### Tarea 5: Architectural Debt Score
**Usará:**
- `detectArchitecturalDrift()` de directory-structure-analyzer.js
- `calculateArchitectureOrganizationScore()` de directory-structure-analyzer.js
- `detectGodObject()`, `detectOrphanModule()` de architecture-utils.js

**Archivo nuevo:** `src/shared/compiler/architectural-debt-score.js`

---

## Verificación de Integración

### ✅ Correctamente Integrado:
- [x] `helper-reuse-detector.js` → Exportado desde `compiler/index.js`
- [x] `directory-structure-analyzer.js` → Exportado desde `compiler/index.js`
- [x] `architectural-recommendations.js` → Exportado desde `compiler/index.js`
- [x] Guards actualizados para usar funciones asíncronas

### ⚠️ Por Verificar:
- [ ] `architecture-utils.js` → ¿Debería exportarse desde `compiler/index.js`?
- [ ] Tests de integración con FileWatcher
- [ ] Tests de integración con MCP Tools

---

## Conclusión

La arquitectura está **correctamente integrada**:
1. **SSOT:** `compiler/index.js` es el único punto de exportación
2. **Sin dependencias circulares:** Cada módulo es independiente
3. **Usa DB eficientemente:** No escanea filesystem
4. **Escalable:** Fácil agregar nuevas herramientas (Tareas 4 y 5)

**Próximo paso:** Integrar `architecture-utils.js` en `compiler/index.js` para tener TODO en un solo lugar.
