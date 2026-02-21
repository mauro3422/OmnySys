# OmnySystem - Reglas para Claude (OpenCode)

## Sistema: OmnySys MCP

Este proyecto usa un sistema MCP (Model Context Protocol) personalizado con 30 herramientas de análisis de código. **DEBES usar estas herramientas antes de cualquier edición**.

---

## REGLA DE ORO: Validar ANTES de Editar

**NUNCA edites un archivo sin validar primero.**

### Checklist Obligatorio (en orden):

1. **Impact Analysis** - ¿Qué se rompe si edito esto?
   ```
   get_impact_map({ filePath: "ruta/al/archivo.js" })
   ```

2. **Import Validation** - ¿Los imports existen?
   ```
   validate_imports({ 
     filePath: "ruta/al/archivo.js",
     checkFileExistence: true 
   })
   ```

3. **Deuda Técnica** - ¿El archivo es un god-object?
   ```
   detect_patterns({ 
     patternType: "architectural-debt",
     limit: 5 
   })
   ```

---

## Cuándo Usar Cada Herramienta

### 🔍 Antes de Crear/Editar Archivos

| Situación | Herramienta | Parámetros |
|-----------|-------------|------------|
| Nuevo archivo con imports | `validate_imports` | `checkFileExistence: true` |
| Editar archivo existente | `get_impact_map` + `validate_imports` | ambos |
| Refactorizar función | `analyze_change` | `symbolName`, `filePath` |
| Cambiar signature | `analyze_signature_change` | `newSignature` |

### 🔎 Investigación y Análisis

| Necesitas... | Usa... | Ejemplo |
|-------------|--------|---------|
| Entender una función | `get_function_details` | `functionName: "detectAtomArchetype"` |
| Ver quién llama a qué | `get_call_graph` | `symbolName: "main"` |
| Flujo de datos | `explain_value_flow` | `symbolName`, `filePath` |
| Impacto de variable | `trace_variable_impact` | `variableName: "config"` |
| Encontrar duplicados | `detect_patterns` | `patternType: "duplicates"` |
| Ver deuda técnica | `detect_patterns` | `patternType: "architectural-debt"` |

### 🏗️ Arquitectura y Estructura

| Necesitas... | Usa... | Ejemplo |
|-------------|--------|---------|
| Overview de módulo | `get_module_overview` | `modulePath: "src/core"` |
| Health del sistema | `get_health_metrics` | `includeDetails: true` |
| Race conditions | `detect_race_conditions` | `minSeverity: "high"` |
| Async analysis | `get_async_analysis` | `riskLevel: "high"` |

### 🔧 Búsqueda y Validación

| Necesitas... | Usa... | Ejemplo |
|-------------|--------|---------|
| Buscar archivos | `search_files` | `pattern: "**/*.test.js"` |
| Verificar símbolo | `find_symbol_instances` | `symbolName: "validate"` |
| Schema de datos | `get_atom_schema` | `atomType: "function"` |

---

## Flujos de Trabajo Comunes

### 1. Refactorizar un Archivo Grande

```javascript
// Paso 1: Verificar deuda
const debt = await detect_patterns({ 
  patternType: "architectural-debt" 
});

// Paso 2: Analizar estructura
const molecule = await get_molecule_summary({ 
  filePath: "src/large-file.js" 
});

// Paso 3: Ver impacto
const impact = await get_impact_map({ 
  filePath: "src/large-file.js" 
});

// Paso 4: Dividir en módulos
// ... editar con atomic_edit ...
```

### 2. Agregar Nueva Funcionalidad

```javascript
// Paso 1: Buscar dónde va
const files = await search_files({ 
  pattern: "**/*feature*.js" 
});

// Paso 2: Validar imports
const validation = await validate_imports({ 
  filePath: "nuevo-archivo.js",
  checkFileExistence: true 
});

// Paso 3: Ver impacto
const impact = await get_impact_map({ 
  filePath: "nuevo-archivo.js" 
});

// Paso 4: Crear archivo
await atomic_write({ 
  filePath: "nuevo-archivo.js",
  content: "..."
});
```

### 3. Arreglar un Bug

```javascript
// Paso 1: Encontrar función
const instances = await find_symbol_instances({ 
  symbolName: "buggyFunction" 
});

// Paso 2: Analizar función
const details = await get_function_details({ 
  functionName: "buggyFunction",
  filePath: "src/buggy.js"
});

// Paso 3: Ver quién la usa
const callers = await get_call_graph({ 
  symbolName: "buggyFunction",
  filePath: "src/buggy.js"
});

// Paso 4: Arreglar
await atomic_edit({ 
  filePath: "src/buggy.js",
  oldString: "...",
  newString: "..."
});
```

---

## Anti-Patrones (NO HACER)

❌ **NUNCA**:
- Asumir que un import existe sin validar
- Editar archivos >250 líneas sin detectar deuda técnica
- Cambiar signatures sin `analyze_signature_change`
- Refactorizar sin `get_impact_map`
- Crear archivos sin validar imports primero

✅ **SIEMPRE**:
- Validar imports antes de guardar
- Verificar impacto antes de editar
- Usar `limit` en consultas grandes
- Paginar resultados cuando sea necesario

---

## Errores Comunes y Soluciones

### "Module not found"
**Causa**: Import que no existe
**Solución**: Usar `validate_imports` con `checkFileExistence: true`

### "Breaking changes detected"
**Causa**: Cambio de signature afecta callers
**Solución**: Usar `analyze_signature_change` antes de editar

### "File too complex"
**Causa**: Archivo >250 líneas o complexity >30
**Solución**: Usar `detect_patterns({ patternType: "architectural-debt" })`

---

## Métricas del Sistema

- **Total Tools**: 30
- **Health Score Target**: >95/100
- **Max Lines per File**: 250
- **Max Complexity**: 15
- **Test Coverage Target**: >80%

---

## Comandos Útiles

```bash
# Ver estado del servidor MCP
get_server_status()

# Reiniciar servidor (si hay problemas)
restart_server({ clearCache: true })

# Ver schema de datos
get_atom_schema({ atomType: "function" })
```

---

## Notas

- Este archivo es leído por OpenCode en cada sesión
- Las herramientas MCP están disponibles automáticamente
- Usar `limit` y `offset` para paginar resultados grandes
- El sistema está en constante evolución - verificar documentación
