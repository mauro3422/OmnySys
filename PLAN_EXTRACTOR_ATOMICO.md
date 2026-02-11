# PLAN DE IMPLEMENTACIÓN: Extractor Atómico Completo

## 📋 Resumen del Problema

El sistema actual NO extrae correctamente:
- ❌ Métodos de clases ES6
- ❌ Funciones privadas/métodos estáticos
- ❌ Getters/Setters
- ❌ Arrow functions en objetos
- ❌ Funciones anónimas asignadas a variables

## 🎯 Objetivo

Crear un **extractor atómico universal** que detecte CUALQUIER unidad de comportamiento:
- Funciones declaradas
- Funciones expresadas (const x = function(){})
- Arrow functions
- Métodos de clase
- Métodos estáticos
- Getters/Setters
- Funciones privadas (#method)

## 🧬 Estructura del Átomo (Según Física del Software)

```javascript
{
  // Identidad
  id: "src/file.js::ClassName.methodName",
  name: "methodName",
  type: "method", // function | method | static | getter | setter | arrow
  
  // Localización
  file: "src/file.js",
  line: 42,
  column: 4,
  
  // Firma
  signature: {
    params: [
      { name: "param1", type: "string", optional: false }
    ],
    returnType: "Promise<Object>",
    async: true,
    generator: false
  },
  
  // ADN - Data Flow
  dataFlow: {
    inputs: [...],
    transformations: [...],
    outputs: [...],
    sideEffects: [...]
  },
  
  // Relaciones
  calls: ["otherFunction", "Class.otherMethod"],
  calledBy: ["parentFunction"],
  
  // Arquetipo
  archetype: "god-function", // | orphan | pure | impure | etc
  
  // Estado
  visibility: "public", // | private | protected
  exported: true,
  
  // Métricas
  complexity: 8,
  lines: 23,
  dependencies: 5
}
```

## 📝 Implementación Paso a Paso

### Paso 1: Parser Universal (1-2 horas)

Crear `src/layer-a-static/extractors/atomic/universal-parser.js`:

```javascript
/**
 * Parser universal de átomos
 * Usa AST de Babel para extraer TODO tipo de función
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export function extractAtoms(code, filePath) {
  const atoms = [];
  
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'classProperties', 'privateMethods']
  });
  
  traverse(ast, {
    // Funciones declaradas: function name() {}
    FunctionDeclaration(path) {
      atoms.push(extractFunctionAtom(path, filePath, 'function'));
    },
    
    // Arrow functions: const x = () => {}
    ArrowFunctionExpression(path) {
      if (path.parent.type === 'VariableDeclarator') {
        atoms.push(extractArrowAtom(path, filePath));
      }
    },
    
    // Funciones expresadas: const x = function() {}
    FunctionExpression(path) {
      if (path.parent.type === 'VariableDeclarator') {
        atoms.push(extractFunctionAtom(path, filePath, 'function-expression'));
      }
    },
    
    // Métodos de clase: class X { method() {} }
    ClassMethod(path) {
      const className = path.parent.parent.id?.name || 'Anonymous';
      atoms.push(extractMethodAtom(path, filePath, className));
    },
    
    // Métodos privados: class X { #method() {} }
    ClassPrivateMethod(path) {
      const className = path.parent.parent.id?.name || 'Anonymous';
      atoms.push(extractMethodAtom(path, filePath, className, true));
    },
    
    // Getters/Setters
    ClassAccessor(path) {
      const className = path.parent.parent.id?.name || 'Anonymous';
      atoms.push(extractAccessorAtom(path, filePath, className));
    },
    
    // Métodos estáticos
    ClassMethod(path) {
      if (path.node.static) {
        const className = path.parent.parent.id?.name || 'Anonymous';
        atoms.push(extractStaticMethodAtom(path, filePath, className));
      }
    },
    
    // Métodos de objeto: { method() {} }
    ObjectMethod(path) {
      atoms.push(extractObjectMethodAtom(path, filePath));
    }
  });
  
  return atoms;
}
```

### Paso 2: Extractores Específicos (2-3 horas)

Crear funciones para cada tipo:

```javascript
function extractFunctionAtom(path, filePath, type) {
  return {
    id: `${filePath}::${path.node.id?.name || 'anonymous'}`,
    name: path.node.id?.name || 'anonymous',
    type: type,
    file: filePath,
    line: path.node.loc?.start?.line,
    column: path.node.loc?.start?.column,
    signature: extractSignature(path.node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: calculateComplexity(path),
    exported: isExported(path),
    visibility: 'public'
  };
}

function extractMethodAtom(path, filePath, className, isPrivate = false) {
  const methodName = isPrivate 
    ? `#${path.node.key.id?.name}` 
    : path.node.key.name;
    
  return {
    id: `${filePath}::${className}.${methodName}`,
    name: methodName,
    type: path.node.static ? 'static' : 'method',
    className: className,
    file: filePath,
    line: path.node.loc?.start?.line,
    column: path.node.loc?.start?.column,
    signature: extractSignature(path.node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: calculateComplexity(path),
    visibility: isPrivate ? 'private' : 'public',
    exported: false // Los métodos se exportan via clase
  };
}
```

### Paso 3: Data Flow Extractor (2-3 horas)

```javascript
function extractDataFlow(path) {
  const inputs = [];
  const transformations = [];
  const outputs = [];
  const sideEffects = [];
  
  path.traverse({
    // Inputs: parámetros usados
    Identifier(innerPath) {
      if (isParameter(innerPath.node.name, path)) {
        inputs.push({
          name: innerPath.node.name,
          line: innerPath.node.loc?.start?.line,
          type: inferType(innerPath)
        });
      }
    },
    
    // Transformations: asignaciones y operaciones
    AssignmentExpression(innerPath) {
      transformations.push({
        type: 'assignment',
        target: extractTarget(innerPath.node.left),
        source: extractSource(innerPath.node.right),
        line: innerPath.node.loc?.start?.line
      });
    },
    
    // Outputs: returns
    ReturnStatement(innerPath) {
      outputs.push({
        type: 'return',
        value: extractValue(innerPath.node.argument),
        line: innerPath.node.loc?.start?.line
      });
    },
    
    // Side Effects: llamadas externas
    CallExpression(innerPath) {
      if (isSideEffect(innerPath)) {
        sideEffects.push({
          type: 'side-effect',
          callee: extractCallee(innerPath.node.callee),
          line: innerPath.node.loc?.start?.line
        });
      }
    }
  });
  
  return { inputs, transformations, outputs, sideEffects };
}
```

### Paso 4: Integración con Sistema Existente (1-2 horas)

Modificar `src/layer-a-static/indexer.js`:

```javascript
// En indexProject, agregar:
import { extractAtoms } from './extractors/atomic/universal-parser.js';

async function analyzeFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Análisis existente (imports, exports)
  const existingAnalysis = await analyzeFileOld(filePath);
  
  // NUEVO: Extracción atómica completa
  const atoms = extractAtoms(content, filePath);
  
  return {
    ...existingAnalysis,
    atoms: atoms,
    totalAtoms: atoms.length,
    atomsByType: groupByType(atoms),
    godFunctions: atoms.filter(a => a.complexity > 10),
    orphanFunctions: atoms.filter(a => a.calls.length === 0 && !a.exported)
  };
}
```

### Paso 5: Actualizar Herramientas MCP (1 hora)

Modificar `get_atomic_functions` y `get_function_details`:

```javascript
// En get_atomic_functions.js
export async function get_atomic_functions(args, context) {
  const { filePath } = args;
  const { projectPath } = context;
  
  const analysis = await getFileAnalysis(projectPath, filePath);
  
  if (!analysis.atoms || analysis.atoms.length === 0) {
    return {
      filePath,
      functions: [],
      message: "No atomic analysis available. File may not have been re-analyzed with new extractor.",
      suggestion: "Run analysis first or check if file contains functions/classes"
    };
  }
  
  // Agrupar por tipo
  const byType = {
    functions: analysis.atoms.filter(a => a.type === 'function'),
    methods: analysis.atoms.filter(a => a.type === 'method'),
    static: analysis.atoms.filter(a => a.type === 'static'),
    getters: analysis.atoms.filter(a => a.type === 'getter'),
    setters: analysis.atoms.filter(a => a.type === 'setter'),
    arrows: analysis.atoms.filter(a => a.type === 'arrow')
  };
  
  return {
    filePath,
    totalFunctions: analysis.atoms.length,
    byType,
    allFunctions: analysis.atoms.map(a => ({
      name: a.name,
      type: a.type,
      line: a.line,
      complexity: a.complexity,
      visibility: a.visibility
    }))
  };
}
```

## 📊 Testing Plan

### Test 1: Clase con múltiples métodos
```javascript
class Orchestrator {
  async atomicEdit() {}      // Debe detectar
  _setupAtomicEditor() {}    // Debe detectar (privado)
  static create() {}         // Debe detectar (estático)
  get status() {}            // Debe detectar (getter)
}
```

### Test 2: Funciones variadas
```javascript
function declared() {}           // Debe detectar
const expressed = function() {}; // Debe detectar
const arrow = () => {};          // Debe detectar
const obj = {                    // Debe detectar
  method() {}
};
```

### Test 3: Data Flow completo
```javascript
function processOrder(order, userId) {
  const total = calculateTotal(order.items);  // Input → Transform
  const user = await getUser(userId);         // Input → Async Transform
  return { total, user };                     // Output
}
```

## ⏱️ Timeline Total

- **Paso 1**: 1-2 horas
- **Paso 2**: 2-3 horas  
- **Paso 3**: 2-3 horas
- **Paso 4**: 1-2 horas
- **Paso 5**: 1 hora
- **Testing**: 1-2 horas

**Total: 8-13 horas**

## 🎯 Resultado Esperado

Después de implementar:
- ✅ `get_atomic_functions` detecta TODOS los métodos de clases
- ✅ `get_function_details` encuentra cualquier símbolo
- ✅ El sistema tiene análisis atómico completo (603 archivos)
- ✅ Data flow funciona para cualquier tipo de función
- ✅ Arquetipos detectados correctamente

¿Procedemos con la implementación?
