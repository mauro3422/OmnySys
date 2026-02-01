# Capa A: Rastreador Estático

## Responsabilidad

Analizar código mediante parseo de AST (Abstract Syntax Tree) para extraer dependencias técnicas explícitas.

Esta es la capa más rápida y determinista de CogniSystem.

---

## Componentes a Implementar

### 1. `scanner.js`
**Propósito**: Escanear el filesystem para encontrar archivos a analizar

**Funcionalidad**:
- Recorrer directorios recursivamente
- Filtrar archivos por extensión (.js, .ts, .jsx, .tsx)
- Ignorar carpetas: node_modules, dist, build, .git
- Detectar tipo de proyecto (package.json)

**API**:
```javascript
async function scanProject(rootPath, options) {
  // Returns: string[] - lista de rutas de archivos
}
```

---

### 2. `parser.js`
**Propósito**: Parsear archivos individuales y extraer información

**Funcionalidad**:
- Usar @babel/parser para generar AST
- Extraer imports (qué importa y de dónde)
- Extraer exports (qué exporta)
- Extraer llamadas a funciones
- Extraer definiciones de clases/funciones

**API**:
```javascript
function parseFile(filePath, code) {
  // Returns: FileInfo
  // {
  //   imports: ImportStatement[],
  //   exports: ExportStatement[],
  //   calls: FunctionCall[],
  //   definitions: Definition[]
  // }
}
```

**Stack Técnico**:
- `@babel/parser` - Parser de JS/TS
- `@babel/traverse` - Navegación del AST
- Soporte para: ES6 modules, CommonJS, JSX, TypeScript

---

### 3. `graph-builder.js`
**Propósito**: Construir el grafo de dependencias a partir de archivos parseados

**Funcionalidad**:
- Resolver rutas relativas (./utils → src/utils.js)
- Construir mapa bidireccional: A importa B ⟷ B es usado por A
- Detectar dependencias transitivas (A → B → C)
- Detectar ciclos (opcional: advertir)

**API**:
```javascript
function buildGraph(parsedFiles) {
  // Returns: SystemMap
  // {
  //   files: { [path]: FileNode },
  //   dependencies: Dependency[]
  // }
}
```

**Estructura de Datos**:
```typescript
interface SystemMap {
  files: { [path: string]: FileNode };
  dependencies: Dependency[];
}

interface FileNode {
  path: string;
  exports: string[];
  imports: ImportStatement[];
  usedBy: string[];
  calls: string[];
}

interface Dependency {
  from: string;
  to: string;
  type: 'import' | 'require' | 'dynamic';
  symbols: string[];
}
```

---

### 4. `indexer.js`
**Propósito**: Orquestador principal - combina scanner, parser y graph-builder

**Funcionalidad**:
- Ejecutar escaneo completo del proyecto
- Parsear cada archivo encontrado
- Construir grafo
- Guardar resultado en JSON

**CLI**:
```bash
node src/layer-a-static/indexer.js /path/to/project
# Output: system-map.json
```

**API**:
```javascript
async function indexProject(rootPath, outputPath) {
  const files = await scanProject(rootPath);
  const parsed = await Promise.all(files.map(parseFile));
  const graph = buildGraph(parsed);
  await fs.writeFile(outputPath, JSON.stringify(graph, null, 2));
  return graph;
}
```

---

### 5. `resolver.js`
**Propósito**: Resolver rutas de imports a paths absolutos

**Funcionalidad**:
- Resolver `./utils` → `src/utils.js` (relativo)
- Resolver `components/Button` → `src/components/Button.jsx` (alias)
- Detectar imports de node_modules (marcar como externos)
- Leer alias de tsconfig.json / jsconfig.json

**Casos Edge**:
```javascript
import X from './utils';        // ¿utils.js o utils/index.js?
import Y from 'components/Foo'; // Alias definido en config
import Z from 'lodash';         // node_modules (externo)
```

---

## Limitaciones Conocidas

**Lo que la Capa A NO puede hacer**:

1. **Imports dinámicos**: `require(dynamicPath)` - no se puede resolver estáticamente
2. **Estado compartido**: Dos archivos que modifican el mismo objeto global sin imports directos
3. **Eventos**: EventEmitter, custom events - no hay conexión explícita en imports
4. **Side effects**: localStorage, DOM manipulation - no visible en AST
5. **Archivos no-JS**: .glsl shaders, .css - no son parseables con babel

**Solución**: Estos casos los maneja la Capa B (Semántica)

---

## Casos de Prueba

**Validar con**:
- `test-cases/scenario-1-simple-import/` - Imports básicos
- `test-cases/scenario-6-god-object/` - Múltiples dependientes

**Criterio de éxito**:
- Detecta todas las dependencias directas (imports)
- No reporta falsos positivos
- Resolución correcta de rutas

---

## Performance

**Objetivo**: Indexar 100 archivos en < 5 segundos

**Optimizaciones**:
- Parseo en paralelo (Promise.all)
- Caché de AST para archivos sin cambios
- Skipear archivos muy grandes (> 10k líneas) con advertencia

---

## Siguientes Pasos

1. Implementar `scanner.js` (más simple)
2. Implementar `parser.js` (core)
3. Implementar `resolver.js` (tricky)
4. Implementar `graph-builder.js` (conecta todo)
5. Implementar `indexer.js` (CLI)
6. Validar con test-cases

**Estado actual**: Por implementar (estructura creada)
