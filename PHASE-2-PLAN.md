# PHASE 2: Function-Level Tracking

## 📋 Objetivo
Mejorar la granularidad del análisis de `Layer A` pasando de **archivo-level** a **función-level**.

Esto permite:
- ✅ Saber exactamente QUÉ función depende de CUÁL otra
- ✅ Identificar funciones críticas (más usadas)
- ✅ Detectar impacto preciso de cambios
- ✅ Base para AI Editor (Phase 2.5)

---

## 🛠️ Cambios Necesarios

### 1. **parser.js** - Extraer funciones con detalle

**Nuevo output por archivo:**
```javascript
{
  imports: [...],          // Sin cambios
  exports: [...],          // Sin cambios
  definitions: [...],      // Sin cambios
  calls: [...],            // Sin cambios

  // NUEVO: Array de funciones
  functions: [
    {
      id: "FA:processOrder",        // ID único: archivo:nombre
      name: "processOrder",
      line: 5,
      endLine: 12,
      params: ["order"],            // Parámetros
      isExported: true,
      calls: [
        {
          name: "calculateTotal",
          type: "direct_call",
          line: 7
        },
        {
          name: "calculateTax",
          type: "direct_call",
          line: 8
        }
      ]
    },
    {
      id: "FA:helpers",
      name: "helpers",
      line: 14,
      endLine: 18,
      params: [],
      isExported: false,
      calls: []
    }
  ]
}
```

**Pseudocódigo a implementar:**
```javascript
function parseFile(filePath, code) {
  const ast = parse(code)
  const functions = []

  traverse(ast, {
    FunctionDeclaration(path) {
      const functionObj = {
        id: `${fileId}:${node.id.name}`,
        name: node.id.name,
        line: node.loc.start.line,
        endLine: node.loc.end.line,
        params: extractParams(node),
        isExported: isExportedFunction(node),
        calls: findCallsInFunction(path)  // ← Nueva lógica
      }
      functions.push(functionObj)
    },
    ArrowFunctionExpression(path) {
      // También detectar funciones flecha exportadas
    }
  })

  return { imports, exports, definitions, calls, functions }
}

function findCallsInFunction(functionPath) {
  const calls = []
  functionPath.traverse({
    CallExpression(innerPath) {
      if (innerPath.node.callee.type === 'Identifier') {
        calls.push({
          name: innerPath.node.callee.name,
          type: 'direct_call',
          line: innerPath.node.loc.start.line
        })
      }
    }
  })
  return calls
}
```

---

### 2. **graph-builder.js** - Crear grafo de funciones

**Nuevo output en system-map.json v2:**
```json
{
  "files": { ... },           // ← Mantener (rápido)

  "functions": {              // ← NUEVO
    "src/fileA.js": [
      {
        "id": "FA:processOrder",
        "name": "processOrder",
        "line": 5,
        "endLine": 12,
        "isExported": true,
        "calls": [
          { "name": "calculateTotal", "line": 7 },
          { "name": "calculateTax", "line": 8 }
        ]
      },
      ...
    ],
    "src/fileB.js": [...]
  },

  "function_links": [         // ← NUEVO: conexiones entre funciones
    {
      "from": "FA:processOrder",
      "to": "FB:calculateTotal",
      "type": "call",
      "line": 7,
      "file_from": "src/fileA.js",
      "file_to": "src/fileB.js"
    },
    {
      "from": "FA:processOrder",
      "to": "FC:calculateTax",
      "type": "call",
      "line": 8,
      "file_from": "src/fileA.js",
      "file_to": "src/fileC.js"
    }
  ],

  "metadata": {
    "totalFiles": 3,
    "totalDependencies": 2,
    "totalFunctions": 5,                // ← NUEVO
    "totalFunctionLinks": 3,             // ← NUEVO
    "cyclesDetected": []
  }
}
```

**Cambios en graph-builder.js:**
```javascript
export function buildGraph(parsedFiles, resolvedImports, projectRoot) {
  const systemMap = {
    files: {},
    functions: {},         // ← NUEVO
    function_links: [],    // ← NUEVO
    dependencies: [],
    metadata: { ... }
  }

  // 1. Procesar archivos (sin cambios)
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    // ... código existente ...
  }

  // 2. NUEVO: Procesar funciones
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    if (!fileInfo.functions) continue

    systemMap.functions[filePath] = fileInfo.functions

    // 3. NUEVO: Crear links entre funciones
    for (const func of fileInfo.functions) {
      for (const call of func.calls) {
        // Resolver qué archivo contiene la función llamada
        const targetFunction = findFunctionInImports(call.name, fileInfo, resolvedImports)

        if (targetFunction) {
          systemMap.function_links.push({
            from: func.id,
            to: targetFunction.id,
            type: 'call',
            line: call.line,
            file_from: filePath,
            file_to: targetFunction.file
          })
        }
      }
    }
  }

  return systemMap
}
```

---

### 3. **indexer.js** - Integrar nueva lógica

Sin grandes cambios:
- ✅ Parser ya retorna `functions`
- ✅ graph-builder.js procesa todo
- ✅ JSON output automáticamente incluye `functions` y `function_links`

---

## 🧪 Test Case

**Validar con scenario-1-simple-import:**

Expected output:
```json
{
  "functions": {
    "src/fileA.js": [
      {
        "id": "FA:functionA",
        "name": "functionA",
        "calls": [
          { "name": "functionB" }
        ]
      }
    ],
    "src/fileB.js": [
      {
        "id": "FB:functionB",
        "name": "functionB",
        "calls": [
          { "name": "functionC" }
        ]
      }
    ],
    "src/fileC.js": [
      {
        "id": "FC:functionC",
        "name": "functionC",
        "calls": []
      }
    ]
  },
  "function_links": [
    { "from": "FA:functionA", "to": "FB:functionB" },
    { "from": "FB:functionB", "to": "FC:functionC" }
  ]
}
```

---

## 📊 Queries Que Habilitaremos Después

Con function-level tracking, Phase 2.5 (AI Editor) podrá hacer:

```javascript
// Query 1: ¿Qué funciones dependen de X?
getAffectedFunctions("FB:calculateTotal")
→ ["FA:processOrder", "GA:generateInvoice", "HA:auditReport"]

// Query 2: ¿Cuál es el impacto de editar X?
getImpactMap("FB:calculateTotal")
→ {
     directUsers: 3,
     indirectUsers: 7,
     totalLines: 150,
     riskLevel: "high"
   }

// Query 3: ¿Qué funciones NO tienen dependientes?
getOrphanFunctions()
→ ["FA:unusedHelper", "GB:deadCode"]

// Query 4: ¿Dónde se llama esta función?
findCallSites("FB:calculateTotal")
→ [
     { function: "FA:processOrder", line: 7, file: "src/fileA.js" },
     { function: "GA:generateInvoice", line: 42, file: "src/graphql/api.js" }
   ]
```

---

## 🚀 Checklist de Implementación

- [ ] Modificar `parser.js` para extraer funciones
- [ ] Añadir `findCallsInFunction()` helper
- [ ] Modificar `graph-builder.js` para procesar funciones
- [ ] Implementar `function_links` en buildGraph()
- [ ] Actualizar metadata con conteos
- [ ] Probar con scenario-1-simple-import
- [ ] Validar que archivo-level sigue funcionando
- [ ] Crear test para function-level accuracy
- [ ] Documentar cambios en ARCHITECTURE.md

---

## ⏭️ Phase 2.5: AI Editor Integration

Una vez completado Phase 2, implementaremos:

```javascript
// Archivo: src/ai-editor/editor.js

async function proposeChange(changeDescription) {
  // 1. Analizar descripción del cambio
  const affectedFunctions = analyzeChange(changeDescription)

  // 2. Cargar grafo
  const graph = loadSystemMap()

  // 3. Calcular impacto
  const impact = graph.function_links
    .filter(link => affectedFunctions.includes(link.from))
    .map(link => link.to)

  // 4. Proponer cambios
  const plan = {
    description: changeDescription,
    affectedFunctions: affectedFunctions,
    mightBreak: impact,
    requiresReview: impact.length > 5,
    filestoRead: [...],
    estimatedRisk: 'medium'
  }

  return plan
}

async function editFile(filePath, functionName, newCode) {
  // 1. Validar que cambio es seguro
  const impact = getImpactMap(functionName)
  if (impact.riskLevel === 'high' && !confirmed) {
    throw new Error(`High risk: affects ${impact.allAffected.length} functions`)
  }

  // 2. Editar archivo
  const oldCode = readFile(filePath)
  const newCode = replaceFunction(oldCode, functionName, newCode)
  writeFile(filePath, newCode)

  // 3. Re-indexar
  await reindexFile(filePath)

  // 4. Reportar cambios
  return {
    success: true,
    filesChanged: [filePath],
    functionsAffected: impact.allAffected,
    requiresManualReview: impact.riskLevel !== 'low'
  }
}
```

---

## 📚 Referencias

- [Babel Traverse Docs](https://babeljs.io/docs/babel-traverse)
- [AST Explorer](https://astexplorer.net/) - Visualizar AST
- Current: `/src/layer-a-static/parser.js`

---

## ⏸️ PAUSA AQUÍ

**Próxima sesión:**
1. Implementar parser.js v2
2. Validar con test case
3. Actualizar graph-builder.js
4. Push a GitHub

**Status:** Listo para implementación ✅
