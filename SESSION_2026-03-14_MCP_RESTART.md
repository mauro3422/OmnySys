# Sesión de Trabajo - v0.9.125 & v0.9.126

**Fecha:** 2026-03-14
**Estado:** MCP caído (BRIDGE_FORWARD_FAILED)
**Último commit:** 9134fe8 (v0.9.126)

---

## 📋 TRABAJO COMPLETADO

### **v0.9.125: Architectural Intelligence & Modular Policy Structure**

#### **Fingerprinting Semántico Mejorado**
- **Archivo:** `src/layer-a-static/extractors/metadata/dna-extractor/semantic-analyzer.js`
- **Cambios:**
  - `deriveEntity(atom, verb)` ahora usa contexto de clase
  - `extractClassNameFromAtomId(atomId)` extrae nombre desde ID del átomo
  - `camelToUnderscore(str)` y `removeClassSuffixes(className)` helpers
- **Resultado:** 46% menos fingerprints `:unknown` (173 → 93 para `build:logic:core:*`)

#### **Detección de Helpers Utilitarios**
- **Archivos:** `src/shared/compiler/duplicate-signal-policy.js`, `src/core/file-watcher/guards/duplicate-conceptual-core.js`
- **Funciones:**
  - `classifyUtilityHelperDuplicate(filePath, atomName, semanticFingerprint)`
  - `isCompatibilityWrapper(filePath, atomName, semanticFingerprint)`
- **Propósito:** Detectar helpers duplicados y sugerir consolidación

#### **Modularización de duplicate-signal-policy**
```
src/shared/compiler/duplicate-signal-policy/
├── index.js                 (22 líneas) - Coordinator
├── transformers.js          (70 líneas) - Normalización utilities
├── constants.js             (re-exporta)
├── constants/               (8 módulos <100 líneas c/u)
│   ├── index.js
│   ├── low-signal-patterns.js
│   ├── repository-surface.js
│   ├── compiler-conformance.js
│   ├── storage-system.js
│   ├── layer-a-watcher.js
│   ├── duplicate-core.js
│   ├── integrity-guidance.js
│   └── runtime-legacy.js
└── detectors/               (3 módulos)
    ├── index.js
    ├── core-policy.js       (140 líneas) - 7 funciones core
    └── subsystems.js        (448 líneas) - 21 funciones por subsistema
```

#### **Backlog Creado**
- **Archivo:** `BACKLOG_ARQUITECTURA_INTELIGENTE.md`
- **5 tareas prioritarias:**
  1. Architectural Pattern Detection
  2. Helper Reuse Detection
  3. **MCP validate_imports con DB OmnySys** ← COMPLETADO
  4. Directory Structure Analysis
  5. Architectural Debt Score

#### **Documentación**
- **Archivo:** `AGENTS.md` actualizado (sin deprecated)

---

### **v0.9.126: MCP validate_imports con DB OmnySys**

#### **Cambios Principales**
- **Archivos:** 
  - `src/layer-c-memory/mcp/tools/validate-imports/filesystem-validation.js`
  - `src/layer-c-memory/mcp/tools/validate-imports.js`

#### **Filosofía**
- **DB ONLY** - Sin filesystem fallback
- **Única fuente de verdad:** OmnySys DB (SQLite)
- **Motivo:** Evitar desincronización entre DB y filesystem

#### **Funciones Clave**
```javascript
// Carga exports desde DB
async function loadExportsFromDb(repo, filePath) {
    // Query: SELECT name, exports_json FROM atoms WHERE file_path = ?
    // Retorna: Set<string> con nombres de exports
}

// Colecta exports (solo DB)
async function collectAllExports(repo, projectPath, filePath, exportsByModule) {
    // Usa loadExportsFromDb()
    // Cache: exportsByModule Map
}

// Valida imports
export async function collectFilesystemImportState(repo, projectPath, filePath) {
    // Lee source para extraer contratos de import
    // Valida CADA import contra DB
    // Retorna: { broken: [...], specifierCount: N }
}
```

#### **Validation Modes**
- **Antes:** `validationMode: 'filesystem_fallback'` → `hybrid_db_filesystem`
- **Ahora:** `validationMode: 'db_only'`

#### **Errores**
- `db_missing`: Archivo no está en DB
- `db_unavailable`: DB no disponible
- `missing_named_export`: Export no existe en DB

#### **Resultado**
- ✅ `export * from` se resuelve correctamente
- ✅ Sin falsos positivos
- ✅ Única fuente de verdad: DB

---

## 🐛 **BUG DETECTADO: MCP BRIDGE_FORWARD_FAILED**

### **Síntoma**
```
MCP error -32098: BRIDGE_FORWARD_FAILED: fetch failed
```

### **Posibles Causas**
1. **Bridge HTTP caído** - `mcp-http-server.js` no está corriendo
2. **Daemon MCP no inicializado** - `omnysysd` no arrancó
3. **Puerto ocupado** - Puerto 9998/9999 en uso
4. **Configuración MCP rota** - `.mcp.json` o `mcp-servers.json` incorrecto

### **Diagnóstico**
```bash
# Verificar si el daemon está corriendo
tasklist | findstr node

# Verificar puertos
netstat -ano | findstr 9998
netstat -ano | findstr 9999

# Verificar logs
Get-Content .omnysysdata/logs/*.log -Tail 50

# Reiniciar daemon manualmente
omny down
omny up
```

### **Solución Temporal**
```bash
# Reinicio completo
omny down
Start-Sleep -Seconds 2
omny up

# O directamente con Node
node mcp-http-server.js
```

---

## 📊 **MÉTRICAS DE CAMBIOS**

### **v0.9.125**
- **Archivos:** 25 modificados/creados
- **Líneas:** +1851, -895
- **Hash:** d3fd9ff

### **v0.9.126**
- **Archivos:** 2 modificados
- **Líneas:** +156, -99
- **Hash:** 9134fe8

---

## 🎯 **PRÓXIMOS PASOS**

### **1. Arreglar MCP (URGENTE)**
```bash
# Diagnóstico
tasklist | findstr node
netstat -ano | findstr 9998

# Reinicio
omny down && omny up

# Verificación
omny status
```

### **2. Continuar con Backlog**
**Orden recomendado:**

#### **A. Helper Reuse Detection** (ALTA)
- **Por qué:** Ya tenemos `classifyUtilityHelperDuplicate()`
- **Qué falta:** Integrar con FileWatcher para sugerir reuse en tiempo real
- **Archivos:** `src/core/file-watcher/guards/duplicate-conceptual-core.js`

#### **B. Directory Structure Analysis** (MEDIA)
- **Por qué:** Necesario para Architectural Pattern Detection
- **Qué hace:** Analiza estructura de directorios y detecta convenciones
- **Archivos nuevos:** `src/shared/compiler/directory-structure-analyzer.js`

#### **C. Architectural Pattern Detection** (ALTA)
- **Por qué:** El sistema ya detecta patrones, falta sugerir arquitectura
- **Qué hace:** Sugiere estructura de carpetas basada en arquetipos
- **Archivos:** `src/shared/compiler/architectural-pattern-detector.js`

#### **D. Architectural Debt Score** (MEDIA)
- **Por qué:** Complementa Technical Debt Report
- **Qué hace:** Score de deuda arquitectónica (0-100)
- **Archivos:** `src/shared/compiler/architectural-debt-score.js`

---

## 🔧 **ARCHIVOS CLAVE PARA CONTINUAR**

### **Backlog**
- `BACKLOG_ARQUITECTURA_INTELIGENTE.md` - 5 tareas detalladas

### **Código Base**
- `src/shared/compiler/duplicate-signal-policy/` - Estructura modular
- `src/layer-c-memory/mcp/tools/validate-imports/` - DB-only validation
- `src/layer-a-static/extractors/metadata/dna-extractor/semantic-analyzer.js` - Fingerprinting mejorado

### **Herramientas Existentes**
- `classifyUtilityHelperDuplicate()` - Detecta helpers duplicados
- `isCompatibilityWrapper()` - Detecta wrappers de compatibilidad
- `deriveEntity(atom, verb)` - Extrae entidad con contexto de clase

---

## 📝 **NOTAS IMPORTANTES**

### **Lecciones Aprendidas**
1. **No usar filesystem fallback** - Causa desincronización
2. **DB como única fuente de verdad** - Más consistente
3. **Modularizar antes de crecer** - 956 líneas → 13 módulos <150 líneas
4. **Documentar deprecated** - AGENTS.md limpio

### **Patrones de Diseño**
1. **DB-first, filesystem-never** - validate_imports
2. **Coordinator delgado** - index.js solo re-exporta
3. **Módulos por responsabilidad** - constants/, detectors/
4. **Cache con Map** - exportsByModule, resolutions

### **Deuda Técnica Pendiente**
- `subsystems.js`: 448 líneas (si crece >500, dividir)
- `filesystem-validation.js`: 280 líneas (umbral 300)
- `validate-imports.js`: computeCircularDependencies CC=15

---

## 🚀 **COMANDOS ÚTILES PARA CONTINUAR**

```bash
# Verificar estado del MCP
omny status

# Reiniciar MCP
omny down && omny up

# Ver logs en tiempo real
Get-Content .omnysysdata/logs/*.log -Tail 50 -Wait

# Verificar imports rotos
npx omny validate-imports src/layer-c-memory/mcp/tools/validate-imports.js

# Verificar fingerprints
node -e "const {computeSemanticFingerprint} = require('./src/layer-a-static/extractors/metadata/dna-extractor/semantic-analyzer.js'); console.log(computeSemanticFingerprint({name: 'build', id: 'path::GraphBuilder.build'}))"
```

---

**Última actualización:** 2026-03-14 02:38 UTC
**Estado:** MCP caído, requiere reinicio manual
**Próxima acción:** Reiniciar MCP y continuar con Helper Reuse Detection
