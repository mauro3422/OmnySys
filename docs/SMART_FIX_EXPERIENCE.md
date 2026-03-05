# Smart Fix Experience

## El Problema Anterior (Frustrante)

```
Usuario: Arregla este archivo
AI: Intenta atomic_edit...
Sistema: ❌ "oldString not found"
Usuario: 🤷‍♂️ ¿Y ahora qué?
AI: Deja que lea el archivo primero...
Usuario: Espera... lee... compara... intenta de nuevo...
Sistema: ❌ "Todavía no matchea"
Usuario: 😤
```

---

## La Nueva Experiencia (Fluida)

### Paso 1: Análisis

```javascript
// Usuario pide analizar
mcp_omnysystem_smart_fix({
    filePath: "src/utils/helpers.js",
    mode: "analyze"
})
```

**Respuesta:**
```json
{
    "success": true,
    "status": "issues-detected",
    "issues": [
        {
            "type": "broken-import",
            "line": 3,
            "severity": "high",
            "message": "Import not found: './constants'"
        },
        {
            "type": "unused-import",
            "line": 5,
            "severity": "low",
            "message": "Import 'lodash' is never used"
        }
    ],
    "fixesAvailable": 2,
    "recommendation": "Run with mode: 'preview' to see proposed fixes"
}
```

### Paso 2: Vista Previa

```javascript
mcp_omnysystem_smart_fix({
    filePath: "src/utils/helpers.js",
    mode: "preview"
})
```

**Respuesta:**
```json
{
    "success": true,
    "status": "preview-ready",
    "fixes": [
        {
            "id": "fix-0",
            "type": "fix-import",
            "confidence": "high",
            "description": "Fix import path: ./constants → ../constants",
            "location": { "line": 3, "file": "src/utils/helpers.js" },
            "original": "import { CONFIG } from './constants';",
            "proposed": "import { CONFIG } from '../constants';",
            "canAutoApply": true
        },
        {
            "id": "fix-1",
            "type": "remove-import",
            "confidence": "high",
            "description": "Remove unused import 'lodash'",
            "original": "import _ from 'lodash';",
            "proposed": "",
            "canAutoApply": true
        }
    ],
    "summary": {
        "total": 2,
        "autoApplicable": 2
    },
    "nextSteps": {
        "applySafe": "Run with mode: 'apply' to apply 2 safe fixes",
        "applySpecific": "Use fixId parameter to apply a specific fix"
    }
}
```

### Paso 3: Aplicar Automáticamente

```javascript
mcp_omnysystem_smart_fix({
    filePath: "src/utils/helpers.js",
    mode: "apply"
})
```

**Respuesta:**
```json
{
    "success": true,
    "status": "applied",
    "applied": 2,
    "failed": 0,
    "message": "Applied 2 safe fixes. 0 fixes require manual review.",
    "details": [
        { "fixId": "fix-0", "type": "fix-import", "success": true },
        { "fixId": "fix-1", "type": "remove-import", "success": true }
    ]
}
```

✅ **Listo!** Sin fricción, sin errores, sin intentos múltiples.

---

## Caso de Uso: Atomic Edit con Sugerencias

### Antes (Frustrante)

```javascript
// AI intenta editar
mcp_omnysystem_atomic_edit({
    filePath: "src/app.js",
    oldString: "async init() { console.log('start'); }",
    newString: "async init() { console.log('starting...'); }"
})
```

**Respuesta:**
```json
{
    "error": "TRANSACTION_ROLLED_BACK",
    "message": "Validation failed: oldString not found: async init() { console.log('sta..."
}
```

**AI:** 🤷‍♂️ No sé qué hacer... déjame leer el archivo...

---

### Después (Inteligente)

```javascript
// AI intenta editar
mcp_omnysystem_atomic_edit({
    filePath: "src/app.js",
    oldString: "async init() { console.log('start'); }",
    newString: "async init() { console.log('starting...'); }"
})
```

**Respuesta:**
```json
{
    "error": "MUTATION_FAILED",
    "message": "oldString not found",
    "help": {
        "whatYouProvided": "async init() { console.log('start'); }",
        "suggestions": [
            {
                "type": "WHITESPACE_MISMATCH",
                "confidence": "high",
                "line": 15,
                "suggestedString": "  async init() { console.log('start'); }",
                "reason": "Same content but different indentation (2 spaces)"
            },
            {
                "type": "PARTIAL_MATCH",
                "confidence": "medium",
                "line": 15,
                "suggestedString": "  async init() { console.log('start');",
                "reason": "Content starts similarly but differs later (missing closing brace?)"
            }
        ],
        "filePreview": "14: class App {\n15:   async init() { console.log('start'); }\n16:     this.setup();\n...",
        "recommendation": "Use the suggested string with correct indentation"
    }
}
```

**AI:** Ah! El problema es el whitespace. Veo que en la línea 15 tiene 2 espacios de indentación. 

**AI reintenta automáticamente con el fix:**

```javascript
mcp_omnysystem_atomic_edit({
    filePath: "src/app.js",
    oldString: "  async init() { console.log('start'); }",  // Con indentación correcta
    newString: "  async init() { console.log('starting...'); }"
})
```

**Respuesta:**
```json
{
    "success": true,
    "impact": {
        "level": "low",
        "affectedFiles": 0
    },
    "message": "Atomic edit successful"
}
```

✅ **Éxito al primer intento!**

---

## Integración con File Watcher

Cuando el File Watcher detecta un cambio, ahora puede:

1. **Detectar el problema** automáticamente
2. **Generar fixes** en tiempo real
3. **Notificar** al usuario con opciones aplicables

```javascript
// File Watcher detecta cambio
FileWatcher.on('file:modified', async ({ filePath, analysis }) => {
    // Ejecutar Smart Fix Guard
    const result = await runSmartFixGuard(projectPath, filePath, this, {
        generateFixes: true,
        autoApply: false  // Solo detectar, no aplicar automáticamente
    });
    
    if (result.fixes.length > 0) {
        // Emitir evento para que el IDE/AI lo sepa
        this.emit('smart-fix:available', {
            filePath,
            fixes: result.fixes,
            message: `${result.fixes.length} auto-fixes available for ${filePath}`
        });
    }
});
```

**En el IDE:**

```
🔧 Smart Fix Available: src/utils/helpers.js
   └─ Fix import path: ./constants → ../constants (high confidence)
   └─ Remove unused import 'lodash' (high confidence)
   
   [Apply Safe Fixes] [Preview Changes] [Ignore]
```

---

## Flujo Completo: AI + Smart Fix

```
Usuario: "Arregla los imports en src/app.js"
    ↓
AI: mcp_omnysystem_smart_fix({ filePath: "src/app.js", mode: "analyze" })
    ↓
Sistema: "Encontré 3 issues: 2 imports rotos, 1 no usado"
    ↓
AI: mcp_omnysystem_smart_fix({ filePath: "src/app.js", mode: "preview" })
    ↓
Sistema: "Aquí están los fixes propuestos: [...]"
    ↓
AI: "Encontré estos problemas. ¿Querés que aplique los fixes seguros?"
    ↓
Usuario: "Sí, aplicá los seguros"
    ↓
AI: mcp_omnysystem_smart_fix({ filePath: "src/app.js", mode: "apply" })
    ↓
Sistema: "✅ Apliqué 2 fixes. 1 requiere revisión manual."
    ↓
AI: "Listo! Arreglé 2 imports. Queda 1 que necesita tu revisión porque..."
```

---

## Beneficios

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Errores** | Genéricos, sin contexto | Específicos, con sugerencias |
| **Debugging** | Manual, trial-and-error | Guiado, con soluciones |
| **Tiempo** | Múltiples intentos | Un intento con smart-fix |
| **UX** | Frustrante | Fluida, asistida |
| **Confianza** | Baja (puede fallar) | Alta (sabe cómo arreglar) |

---

## Implementación

### Nuevos Componentes

1. **`smart-fix-guard.js`** - Guardia para File Watcher
2. **`smart-fix/index.js`** - Tool MCP para acceso directo
3. **Mejoras a `modify-operation.js`** - Sugerencias en atomic_edit

### Integración

- File Watcher → Smart Fix Guard → Notificaciones
- Atomic Edit/Write → Smart Suggestions → Auto-fix
- MCP Tool → Análisis + Aplicación

---

## Conclusión

El sistema ahora no solo **detecta** problemas, sino que:
1. **Entiende** la causa raíz
2. **Sugiere** soluciones específicas
3. **Permite** aplicarlas fácilmente
4. **Aprende** de patrones comunes

Esto transforma la experiencia de "depuración frustrante" a "corrección asistida fluida".
