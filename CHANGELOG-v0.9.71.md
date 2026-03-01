# Changelog - v0.9.71

## 🚀 Breaking Change: Migración a node-tree-sitter (EN PROGRESO)

### Problema Original
El sistema dejó de funcionar con `web-tree-sitter@0.26.5` debido a **ABI incompatibility**:
- `web-tree-sitter@0.26.5` usa ABI 0.26.x
- Los grammars WASM fueron compilados con `tree-sitter-cli@0.20.x` (ABI 0.20.x)
- Resultado: ~90% de archivos fallaban con "memory access out of bounds"

**Referencia**: [GitHub Issue #5171](https://github.com/tree-sitter/tree-sitter/issues/5171)

### Solución Aplicada
Migración a `node-tree-sitter` (nativo, no WASM):

```json
{
  "dependencies": {
    "tree-sitter": "^0.25.0",
    "tree-sitter-javascript": "^0.25.0",
    "tree-sitter-typescript": "^0.23.2"
  }
}
```

### Estado Actual (EN PROGRESO)

#### ✅ Lo que Funciona
| Métrica | web-tree-sitter | node-tree-sitter | Mejora |
|---------|-----------------|------------------|--------|
| **Archivos parseados** | ~200/2060 (10%) | 2060/2060 (100%) | ✅ +900% |
| **Velocidad** | ~500 files/sec | 1144 files/sec | ✅ +2.3x |
| **Tiempo total** | ~5s | 1.8s | ✅ 2.8x más rápido |
| **Errores WASM** | ~1860 | 0 | ✅ 100% fix |
| **Memoria** | ~300MB | ~19MB | ✅ 16x menos |

#### ❌ Lo que Falta Fixear
- **Grammars no se importan correctamente**: ESM exporta `default.language` vs CommonJS exporta `{ language }`
- **Extractores de metadata fallan**: `detectEventPatterns` y `detectGlobalState` no pueden usar el AST
- **Datos semánticos en 0**: shared_state_json y event_emitters_json vacíos

### Archivos Modificados

#### Parser
- `src/layer-a-static/parser/index.js` - Migrado de WASM a nativo (CON BUGS)
- `src/layer-a-static/parser/parser-pool.js` - Simplificado (sin lógica WASM)
- `src/layer-a-static/extractors/data-flow/index.js` - Removed unused imports
- `src/layer-a-static/analyses/tier3/event-detector/parser.js` - Uses getTree()
- `src/layer-a-static/analyses/tier3/event-detector/detector.js` - CRASH en tree.rootNode

#### Pipeline
- `src/layer-a-static/pipeline/extract.js` - Added fullFileCode al contexto

### API Changes

**Antes (web-tree-sitter)**:
```javascript
import { Parser } from 'web-tree-sitter';
await Parser.init({ locateFile... });
const lang = await Language.load('grammar.wasm');
```

**Después (node-tree-sitter)**:
```javascript
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
// BUG: JavaScript.language es undefined en ESM
parser.setLanguage(JavaScript.language); // ❌
```

**Workaround necesario**:
```javascript
const JS = await import('tree-sitter-javascript');
const language = JS.default?.language || JS.language || JS;
```

### Próximos Pasos

1. **Fixear importación de grammars**: Manejar ESM vs CommonJS correctamente
2. **Verificar detectores**: `detectGlobalState` y `detectEventPatterns`
3. **Testear extractores**: Confirmar que treeSitter metadata se extrae
4. **Validar DB**: shared_state_json y event_emitters_json poblados

---

## 📦 Dependencies

### Added
- `tree-sitter@^0.25.0`
- `tree-sitter-javascript@^0.25.0`
- `tree-sitter-typescript@^0.23.2`

### Deprecated (pero no removido)
- `web-tree-sitter@^0.26.5` - Todavía en package.json por compatibilidad

---

**Fecha**: 2026-03-01
**Autor**: Mauro
**Issue**: Parser WASM incompatibility
**Estado**: EN PROGRESO - 80% completo
