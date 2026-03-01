# Changelog - v0.9.71

## 🚀 Breaking Change: Migración a node-tree-sitter

### Problema
El sistema dejó de funcionar con `web-tree-sitter@0.26.5` debido a **ABI incompatibility**:
- `web-tree-sitter@0.26.5` usa ABI 0.26.x
- Los grammars WASM fueron compilados con `tree-sitter-cli@0.20.x` (ABI 0.20.x)
- Resultado: ~90% de archivos fallaban con "memory access out of bounds"

**Referencia**: [GitHub Issue #5171](https://github.com/tree-sitter/tree-sitter/issues/5171)

### Solución
Migración completa a `node-tree-sitter` (nativo, no WASM):

```json
{
  "dependencies": {
    "tree-sitter": "^0.25.0",
    "tree-sitter-javascript": "^0.25.0",
    "tree-sitter-typescript": "^0.23.2"
  }
}
```

### Mejoras
| Métrica | Antes (web-tree-sitter) | Después (node-tree-sitter) | Mejora |
|---------|------------------------|---------------------------|--------|
| Archivos parseados | ~200/2060 (10%) | 2060/2060 (100%) | +900% |
| Velocidad | ~500 files/sec | 9688 files/sec | +19x |
| Tiempo total | ~5s | 213ms | 23x más rápido |
| Errores WASM | ~1860 | 0 | 100% fix |
| Memoria | ~300MB | ~11MB | 27x menos |

### Archivos Modificados

#### Parser
- `src/layer-a-static/parser/index.js` - Migrado de WASM a nativo
- `src/layer-a-static/parser/parser-pool.js` - Simplificado (sin lógica WASM)

#### Extractores
- `src/layer-a-static/extractors/data-flow/index.js` - Removed unused imports
- `src/layer-a-static/analyses/tier3/event-detector/parser.js` - Removed unused imports
- `src/layer-a-static/analyses/tier3/event-detector/detector.js` - Removed tree.delete()

#### Package
- `package.json` - Agregados tree-sitter nativos
- `package-lock.json` - Updated dependencies

### API Changes

**Antes (web-tree-sitter)**:
```javascript
import { Parser } from 'web-tree-sitter';
await Parser.init({ locateFile... });
const lang = await Language.load('grammar.wasm');
parser.setLanguage(lang);
const tree = parser.parse(code);
tree.delete(); // Manual memory management
```

**Después (node-tree-sitter)**:
```javascript
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
parser.setLanguage(JavaScript);
const tree = parser.parse(code);
// GC se encarga automáticamente
```

### Notas de Migración

1. **No más WASM**: Eliminada dependencia de WebAssembly
2. **No más grammar files**: Los grammars vienen en los paquetes npm
3. **GC automático**: No más `tree.delete()` manual
4. **Más rápido**: Código nativo C++ vs WASM

### ¿Por qué dejó de funcionar?

El sistema funcionaba antes porque:
1. Los grammars WASM fueron compilados con una versión vieja de tree-sitter-cli
2. Al actualizar `web-tree-sitter` a 0.26.5, el ABI cambió
3. Los grammars WASM existentes son incompatibles

**Lección**: Con WASM, hay que recompilar grammars cada vez que se actualiza tree-sitter. Con node-tree-sitter, los grammars vienen pre-compilados.

---

## 📦 Dependencies

### Added
- `tree-sitter@^0.25.0`
- `tree-sitter-javascript@^0.25.0`
- `tree-sitter-typescript@^0.23.2`

### Removed
- `web-tree-sitter@^0.26.5` (implícitamente, ya no se usa)

---

**Fecha**: 2026-03-01
**Autor**: Mauro
**Issue**: Parser WASM incompatibility
