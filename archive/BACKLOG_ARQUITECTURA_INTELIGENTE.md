# 🎯 BACKLOG PRIORITARIO: Arquitectura Inteligente

## EPIC: MCP con Conciencia Arquitectónica

### **Problema Detectado**
El sistema actual detecta **síntomas** (archivos >400 líneas) pero no sugiere **soluciones arquitectónicas** (carpetas, módulos, helpers existentes).

---

## 📌 TAREAS PRIORITARIAS

### **1. Architectural Pattern Detection** (ALTA)

**Qué falta:**
- Detectar cuando un archivo es parte de un **patrón arquitectónico** (policy, service, helper, repository)
- Sugerir **estructura de carpetas** basada en el patrón detectado
- Ejemplo:
  ```javascript
  // En lugar de:
  { type: "split_file", suggestion: "Dividir en 3 módulos" }
  
  // Debería decir:
  {
    type: "architectural_recommendation",
    pattern: "policy_module",
    suggestion: {
      structure: {
        "duplicate-signal-policy/": {
          "index.js": "Coordinator (exports only)",
          "constants/": "Low-signal patterns",
          "detectors/": "is* functions by subsystem",
          "utils/": "Normalization helpers"
        }
      }
    }
  }
  ```

**Archivos a modificar:**
- `src/shared/compiler/suggest-refactoring.js` - Agregar detección de patrones
- `src/shared/compiler/architectural-recommendations.js` - Nuevo módulo
- `src/layer-c-memory/mcp/tools/suggest-architecture.js` - Extender para sugerir carpetas

**Criterio de aceptación:**
- [ ] Detecta archivos policy/service/helper por fingerprint + arquetipo
- [ ] Sugiere estructura de carpetas coherente con el proyecto
- [ ] Detecta helpers existentes donde se podría reutilizar

---

### **2. Helper Reuse Detection** (ALTA)

**Qué falta:**
- Cuando detecta duplicado, buscar **helpers existentes** en `/utils/`, `/shared/`, etc.
- Sugerir **reutilizar** en lugar de crear nuevo
- Ejemplo:
  ```javascript
  // En lugar de:
  { type: "conceptual_duplicate", files: ["a.js", "b.js"] }
  
  // Debería decir:
  {
    type: "conceptual_duplicate",
    suggestion: {
      action: "reuse_existing_helper",
      existingHelper: "src/shared/compiler/normalize-utils.js::normalizeInputs",
      reason: "Similar functionality already exists in shared utils"
    }
  }
  ```

**Archivos a modificar:**
- `src/core/file-watcher/guards/duplicate-conceptual-core.js`
- `src/shared/compiler/duplicate-remediation.js`

---

### **3. Directory Structure Analysis** (MEDIA)

**Qué falta:**
- Analizar **estructura de directorios** del proyecto
- Detectar **convenciones** (ej: todo lo que es helper va en `/utils/`)
- Validar que **nuevos archivos** sigan la convención

**Implementación:**
```javascript
// src/shared/compiler/directory-conventions.js
export function detectDirectoryConventions(projectPath) {
  // Analiza estructura y detecta:
  // - Dónde van los helpers (/utils/, /shared/, /helpers/)
  // - Dónde van los policies (/compiler/, /guards/)
  // - Dónde van los services (/services/, /core/)
  return {
    helperPatterns: ['/utils/', '/shared/', '/helpers/'],
    policyPatterns: ['/compiler/', '/guards/', '/policies/'],
    servicePatterns: ['/services/', '/core/', '/domain/']
  };
}
```

---

### **4. Architectural Debt Score** (MEDIA)

**Qué falta:**
- Score de deuda **arquitectónica** (no solo de código)
- Detectar cuando la **organización física** no coincide con la lógica
- Ejemplo:
  ```javascript
  {
    architecturalDebt: {
      score: 65, // 0-100 (100 = mucha deuda)
      issues: [
        {
          type: "god_object_in_wrong_place",
          file: "src/shared/compiler/duplicate-signal-policy.js",
          shouldbe: "src/shared/compiler/duplicate-signal-policy/"
        },
        {
          type: "helper_not_reused",
          file: "src/core/file-watcher/guards/x.js",
          existingHelper: "src/shared/compiler/normalize-utils.js"
        }
      ]
    }
  }
  ```

---

## 🚀 ROADMAP

### **Sprint 1 (YA - Estamos acá):**
- [ ] Dividir `duplicate-signal-policy.js` en estructura de carpetas
- [ ] Crear `architectural-recommendations.js` con detección de patrones
- [ ] Agregar sugerencias de carpetas en `suggest_refactoring`

### **Sprint 2:**
- [ ] Helper Reuse Detection en duplicate guards
- [ ] Directory Structure Analysis
- [ ] Integrar con MCP `suggest_architecture`

### **Sprint 3:**
- [ ] Architectural Debt Score
- [ ] Validación de convenciones en FileWatcher
- [ ] Dashboard de deuda arquitectónica

---

### **5. MCP validate_imports con DB OmnySys** (ALTA)

**Problema detectado:**
El MCP `validate_imports` usa análisis estático del filesystem, no la DB de OmnySys.
Los `export * from` son difíciles de resolver estáticamente.

**Síntoma:**
```javascript
// detectors.js importa desde ./constants/index.js
import { LOW_SIGNAL_* } from './constants/index.js';

// validate_imports reporta:
{
  "brokenImports": [
    {
      "source": "./constants/index.js",
      "reason": "missing_named_export",
      "missingExport": "LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX"
    }
  ]
}
```

**Causa:**
- `validate_imports` lee el filesystem directamente
- No usa la DB de OmnySys que YA TIENE los átomos indexados
- Los `export * from` requieren resolución transitiva

**Solución:**
```javascript
// En validate_imports.js:
// En lugar de:
const exports = parseFileExports(filePath); // filesystem

// Usar:
const exports = repo.query({ filePath }); // DB OmnySys
```

**Archivos a modificar:**
- `src/layer-c-memory/mcp/tools/validate-imports/filesystem-validation.js`
- `src/layer-c-memory/mcp/tools/validate-imports/source-analysis.js`

**Criterio de aceptación:**
- [ ] validate_imports usa DB OmnySys en lugar de filesystem
- [ ] Resuelve `export * from` correctamente
- [ ] No reporta falsos positivos en imports

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Antes | Después (Target) |
|---------|-------|------------------|
| Archivos >400 LOC | 5 | 0 |
| Duplicados que sugieren reuse | 0% | 80% |
| Sugerencias con carpetas | 0% | 100% |
| Architectural Debt Score | N/A | <30 |

---

## 🔗 DEPENDENCIAS

- **Depende de:** 
  - `suggest_refactoring` (ya existe)
  - `aggregate_metrics` (ya existe)
  - DNA extractor (ya existe)
  
- **Impacta a:**
  - `suggest_architecture` (MCP tool)
  - FileWatcher guards
  - Technical Debt Report

---

**Fecha de creación:** 2026-03-14
**Prioridad:** ALTA
**Estado:** BACKLOG
