# Arquitectura Molecular: OmnySys v0.6.0

**Fecha**: 2026-02-08  
**Versión**: v0.6.0  
**Estado**: ✅ **IMPLEMENTADO Y ESTABLE**  
**Guía**: Este documento describe la arquitectura molecular implementada. Para usar el sistema, ver `ARCHITECTURE.md`.

---

## 📋 Resumen Ejecutivo

Este documento captura la evolución arquitectónica de OmnySys hacia un modelo **molecular** donde las funciones (átomos) son la unidad primaria de análisis y los archivos (moléculas) son composiciones derivadas de sus átomos.

**Principio Fundamental**: *"Los archivos no tienen metadata propia, se COMPONEN de la metadata de sus funciones"*

---

## 🎯 Problema Original

### La Dilema: ¿Archivo o Función como Unidad Atómica?

**Opción 1 - Archivo-only (sistema actual)**
- ✅ Simple, rápido, escala bien
- ❌ Pierde granularidad (¿qué función específica rompe?)

**Opción 2 - Función-full LLM**
- ✅ Máxima precisión
- ❌ Explosión de datos: 100 archivos × 5 funciones = 500 entidades
- ❌ Complejidad del grafo enorme
- ❌ Overhead de LLM imposible

**Solución - Enfoque Híbrido Molecular**
- ✅ Precisión de función cuando se necesita
- ✅ Escala como archivo (mismo costo proporcional)
- ✅ Zero duplicación de datos/lógica
- ✅ Mismo principio: metadata estática + detectores + LLM selectivo

---

## 🏗️ Arquitectura Molecular

### Conceptos Clave

| Concepto | Definición | Analogía |
|----------|------------|----------|
| **Átomo** | Función individual | Un átomo químico |
| **Molécula** | Archivo (composición de átomos) | Una molécula (H₂O = 2H + 1O) |
| **Derivación** | Metadata de molécula calculada desde átomos | Propiedades emergentes |

### Estructura de Datos (SSOT)

```javascript
// Estructura molecular - Single Source of Truth
{
  // ═══════════════════════════════════════════════════
  // NIVEL ATÓMICO (SSOT - Donde vive la verdad)
  // ═══════════════════════════════════════════════════
  "atoms": {
    "src/api.js::fetchUser": {
      "id": "src/api.js::fetchUser",
      "type": "atom",
      "parentMolecule": "src/api.js",
      
      // SSOT: Metadata atómica (solo existe aquí)
      "line": 15,
      "complexity": 35,
      "isExported": true,
      "hasNetworkCalls": true,
      "hasErrorHandling": false,
      "calls": ["validateToken"],
      "calledBy": ["UserCard.jsx::loadUser", "ProfilePage.jsx::init"],
      
      // Archetype atómico (detectado estáticamente)
      "archetype": {
        "type": "fragile-gateway",
        "severity": 8,
        "confidence": 1.0
      }
    },
    
    "src/api.js::internalHelper": {
      "id": "src/api.js::internalHelper",
      "type": "atom",
      "parentMolecule": "src/api.js",
      
      "line": 45,
      "complexity": 8,
      "isExported": false,
      "hasNetworkCalls": false,
      "calledBy": ["src/api.js::fetchUser"],
      
      "archetype": {
        "type": "private-utility",
        "severity": 2,
        "confidence": 1.0
      }
    }
  },
  
  // ═══════════════════════════════════════════════════
  // NIVEL MOLECULAR (Derivado de átomos)
  // ═══════════════════════════════════════════════════
  "molecules": {
    "src/api.js": {
      "id": "src/api.js",
      "type": "molecule",
      
      // Solo referencias a átomos
      "atoms": [
        "src/api.js::fetchUser",
        "src/api.js::internalHelper"
      ],
      
      // Metadata DERIVADA (computed, no almacenada duplicada)
      // Se calcula en tiempo de consulta desde los átomos
      "derived": {
        "archetype": "network-hub",           // ← Inferido de átomos
        "totalComplexity": 43,                 // ← Sumado de átomos
        "exportCount": 1,                      // ← Contado de átomos exportados
        "hasNetworkCalls": true,               // ← OR de átomos
        "riskScore": 8.0                       // ← MAX de átomos
      }
    }
  }
}
```

### Reglas de Derivación

```javascript
// src/shared/derivation-engine.js
// Ningún dato se duplica, todo se deriva de átomos

export const DerivationRules = {
  // Regla 1: Archetype molecular se infiere de átomos
  moleculeArchetype: (atoms) => {
    const atomArchetypes = atoms.map(a => a.archetype?.type);
    
    if (atomArchetypes.includes('fragile-gateway') && 
        atoms.filter(a => a.hasNetworkCalls).length >= 2) {
      return { type: 'network-hub', severity: 8 };
    }
    if (atoms.every(a => !a.isExported)) {
      return { type: 'internal-module', severity: 3 };
    }
    // ... más reglas
  },
  
  // Regla 2: Complejidad molecular = suma de átomos
  moleculeComplexity: (atoms) => {
    return atoms.reduce((sum, atom) => sum + (atom.complexity || 0), 0);
  },
  
  // Regla 3: Riesgo molecular = máximo riesgo atómico
  moleculeRisk: (atoms) => {
    return Math.max(...atoms.map(a => a.archetype?.severity || 0));
  },
  
  // Regla 4: Exports molecular = átomos exportados
  moleculeExports: (atoms) => {
    return atoms.filter(a => a.isExported).map(a => a.name);
  },
  
  // Regla 5: Network calls = OR de átomos
  moleculeHasNetworkCalls: (atoms) => {
    return atoms.some(a => a.hasNetworkCalls);
  }
};
```

---

## 🔍 Detectores de Patrones (Reutilizables)

### Principio: Una Lógica, Dos Niveles

```javascript
// src/shared/detectors/pattern-detectors.js
// Detectores que funcionan para átomos Y moléculas

export const PatternDetectors = {
  // Detector genérico de complejidad
  complexity: (entity) => {
    if (entity.type === 'atom') {
      // Es función: cyclomatic complexity del AST
      return calculateCyclomatic(entity.ast);
    } else {
      // Es archivo: derivado de átomos
      return entity.atoms.reduce((sum, atom) => sum + atom.complexity, 0);
    }
  },
  
  // Detector genérico de network calls
  networkUsage: (entity) => {
    if (entity.type === 'atom') {
      // Es función: buscar fetch/axios en su AST
      return detectNetworkInFunction(entity.ast);
    } else {
      // Es archivo: OR lógico de átomos
      return entity.atoms.some(atom => atom.hasNetworkCalls);
    }
  },
  
  // Detector genérico de dead code
  deadCode: (entity, context) => {
    if (entity.type === 'atom') {
      // Función no exportada y no llamada → dead
      return !entity.isExported && entity.calledBy.length === 0;
    } else {
      // Archivo: ningún átomo exportado es usado externamente
      const exportedAtoms = entity.atoms.filter(a => a.isExported);
      return exportedAtoms.every(atom => 
        atom.calledBy.every(caller => caller.startsWith(entity.id))
      );
    }
  },
  
  // Detector de god-entity (mismo algoritmo, diferente threshold)
  godEntity: (entity) => {
    const threshold = entity.type === 'atom' ? 50 : 500;
    const connections = entity.type === 'atom' 
      ? entity.calledBy.length + entity.calls.length
      : entity.atoms.reduce((sum, a) => sum + a.calledBy.length, 0);
      
    return connections > threshold || entity.complexity > (threshold / 2);
  }
};
```

### Detectores Específicos de Función (100% Estáticos)

```javascript
// Detectores de arquetipos a nivel función (sin LLM)

function detectFunctionArchetype(func) {
  // 1. God Function
  if (func.complexity > 20 && func.lines > 100) {
    return {
      type: 'god-function',
      severity: 9,
      confidence: 1.0,
      reason: `${func.lines} líneas, complejidad ${func.complexity}`
    };
  }
  
  // 2. Dead Function
  if (!func.isExported && func.callers.length === 0) {
    return {
      type: 'dead-function',
      severity: 5,
      confidence: 1.0,
      reason: 'No exportada y nadie la llama'
    };
  }
  
  // 3. IO-Heavy sin manejo de errores
  if (func.externalCalls.includes('fetch') && !func.hasErrorHandling) {
    return {
      type: 'fragile-network',
      severity: 8,
      confidence: 1.0,
      reason: 'Hace fetch sin try/catch'
    };
  }
  
  // 4. Hot Path
  if (func.callers.length > 20 && func.isExported) {
    return {
      type: 'hot-path',
      severity: 6,
      confidence: 1.0,
      reason: `Llamada desde ${func.callers.length} lugares`
    };
  }
  
  // 5. Recursive
  if (func.calls.includes(func.name)) {
    return {
      type: 'recursive',
      severity: 4,
      confidence: 1.0
    };
  }
  
  return { type: 'standard', severity: 1, confidence: 1.0 };
}
```

### ¿Cuándo usar LLM a Nivel Función?

```javascript
// Solo cuando los detectores estáticos NO pueden determinar

function needsLLMForFunction(func, fileContext) {
  return (
    // Caso 1: Semántica de negocio compleja
    (func.archetype?.type === 'recursive' && func.complexity > 50) ||
    
    // Caso 2: Side effects no obvios
    (func.hasNetworkCalls && func.hasSideEffects === 'unknown') ||
    
    // Caso 3: Coupling semántico (misma lógica, diferente código)
    (fileContext.archetype === 'potential-duplicate-code') ||
    
    // Caso 4: Seguridad crítica
    (func.handlesAuthentication === true && func.complexity > 30) ||
    
    // Caso 5: Low confidence en detector estático
    (func.archetype?.confidence < 0.8)
  );
}

// Estimación: Solo ~2-5% de funciones necesitarían LLM
```

---

## 🔄 Pipeline de Extracción

### Flujo Único: Extraer Átomos → Componer Moléculas

```javascript
// src/layer-a-static/pipeline/molecular-extractor.js

export async function extractMolecularStructure(filePath, code, ast) {
  // PASO 1: Extraer átomos (funciones) - SSOT
  const atoms = [];
  
  traverse(ast, {
    FunctionDeclaration(nodePath) {
      const atom = extractAtom(nodePath, filePath, code);
      atoms.push(atom);
    },
    ArrowFunctionExpression(nodePath) {
      if (isTopLevel(nodePath)) {
        const atom = extractAtom(nodePath, filePath, code);
        atoms.push(atom);
      }
    },
    // MethodDefinition para clases
    MethodDefinition(nodePath) {
      const atom = extractAtom(nodePath, filePath, code, { 
        isMethod: true,
        parentClass: getParentClass(nodePath)
      });
      atoms.push(atom);
    }
  });
  
  // PASO 2: Crear molécula como COMPOSICIÓN de átomos
  const molecule = {
    id: filePath,
    type: 'molecule',
    atoms: atoms.map(a => a.id),
    // NO metadata duplicada aquí - todo se deriva
  };
  
  // PASO 3: Calcular relaciones entre átomos (call graph interno)
  const atomIndex = new Map(atoms.map(a => [a.name, a]));
  
  for (const atom of atoms) {
    atom.calls = atom.rawCalls.map(call => {
      const targetAtom = atomIndex.get(call.name);
      if (targetAtom) {
        // Llamada interna
        targetAtom.calledBy.push(atom.id);
        return { type: 'internal', target: targetAtom.id };
      } else {
        // Llamada externa
        return { type: 'external', name: call.name };
      }
    });
  }
  
  return { molecule, atoms };
}

// Extracción de un átomo individual
function extractAtom(nodePath, filePath, code, options = {}) {
  const node = nodePath.node;
  const name = extractFunctionName(node, options);
  
  return {
    id: `${filePath}::${name}`,
    type: 'atom',
    parentMolecule: filePath,
    name,
    
    // Metadata espacial
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    lines: (node.loc?.end.line || 0) - (node.loc?.start.line || 0),
    
    // Firma
    params: node.params.map(p => p.name || extractParamName(p)),
    isAsync: node.async || false,
    isExported: isExportedFunction(nodePath) || options.isMethod || false,
    isMethod: options.isMethod || false,
    parentClass: options.parentClass || null,
    
    // Complejidad
    complexity: calculateCyclomatic(nodePath),
    
    // Side effects (detectado estáticamente)
    hasNetworkCalls: detectNetworkCalls(nodePath),
    hasDomManipulation: detectDomCalls(nodePath),
    hasStorageAccess: detectStorageCalls(nodePath),
    hasErrorHandling: detectTryCatch(nodePath),
    hasLogging: detectConsoleCalls(nodePath),
    
    // Calls (por resolver)
    rawCalls: extractRawCalls(nodePath),
    calls: [],        // Se resuelve después
    calledBy: [],     // Se resuelve después
    
    // Contenido para LLM si es necesario
    snippet: extractSnippet(code, node.loc)
  };
}
```

---

## 🚀 Roadmap de Implementación

### Fase 1: Estructura Atómica (1-2 días)
- [ ] Modificar `system-map.json` schema para soportar `atoms[]`
- [ ] Crear `derivation-engine.js` con reglas básicas
- [ ] Crear `molecular-extractor.js` (pipeline unificado)
- [ ] Migrar `call-graph.js` existente a extraer átomos
- [ ] Tests: Verificar que extracción de átomos funcione

### Fase 2: Detectores Compuestos (2-3 días)
- [ ] Refactorizar detectores existentes para aceptar `entity` (atom|molecule)
- [ ] Implementar `detectFunctionArchetype()` con reglas estáticas
- [ ] Implementar reglas de derivación para moléculas
- [ ] Tests: Verificar que derivación sea correcta y consistente
- [ ] Benchmark: Medir overhead de extracción atómica

### Fase 3: Integración Orchestrator (2-3 días)
- [ ] Cambiar invalidación de cache: por función (átomo), no por archivo
- [ ] Implementar priorización: funciones críticas primero
- [ ] Modificar `AnalysisQueue` para soportar jobs atómicos
- [ ] LLM selectivo: solo átomos que `needsLLMForFunction()`
- [ ] Tests: Verificar race conditions en invalidación parcial

### Fase 4: Tools Mejoradas (1-2 días)
- [ ] Extender `get_impact_map` para mostrar impacto a nivel función
- [ ] Mejorar `get_call_graph` (ya funciona naturalmente con grafo de átomos)
- [ ] Nuevo: `get_function_details(atomId)` para consulta específica
- [ ] Nuevo: `get_molecule_summary(filePath)` para vista de archivo
- [ ] Tests: Verificar precisión de impacto atómico

### Fase 5: Migración y Backward Compatibility (1-2 días)
- [ ] Mantener API actual (no breaking changes)
- [ ] Agregar flag `atomic: true` para nuevas funcionalidades
- [ ] Documentar cambios en API
- [ ] Migration guide para datos existentes

---

## 📊 Comparación: Antes vs Después

### Escenario: Proyecto con 100 archivos, 500 funciones

| Aspecto | Antes (File-only) | Después (Molecular) |
|---------|-------------------|---------------------|
| **Entidades analizadas** | 100 archivos | 500 átomos + 100 moléculas |
| **LLM Calls** | ~10 (10% archivos) | ~25 (5% átomos) |
| **Storage** | ~10MB | ~15MB (índices + atoms) |
| **Precisión** | "Archivo A afecta a B" | "Función A.f afecta a B.g" |
| **Cache Invalidation** | Todo el archivo | Solo función modificada |
| **Tiempo de extracción** | ~50ms por archivo | ~70ms por archivo (+40%) |

**Ganancias**:
- 5x más precisión en análisis
- Invalidación granular (solo función modificada)
- Reutilización de lógica (detectores compuestos)
- Extensible a otros niveles (clases, módulos)

---

## ⚠️ Problemáticas Identificadas y Soluciones

### 1. Funciones Anónimas

**Problema**:
```javascript
const handler = () => { ... };  // ¿Atom?
array.map(x => x * 2);          // ¿Atom?
```

**Solución**:
- ✅ Funciones con binding (const/let/var) → Son átomos
- ✅ Métodos de clase → Son átomos
- ❌ Callbacks inline → NO son átomos (metadata de función padre)
- ❌ IIFEs → NO son átomos (ejecutan inmediatamente)

```javascript
// Heurística
function shouldBeAtom(nodePath) {
  // 1. Tiene nombre explícito
  if (node.id?.name) return true;
  
  // 2. Asignada a variable
  if (isVariableDeclaration(nodePath.parent)) return true;
  
  // 3. Método de clase
  if (nodePath.parent?.type === 'ClassBody') return true;
  
  // 4. Exportada directamente
  if (isExported(nodePath)) return true;
  
  return false;
}
```

### 2. Clases

**Problema**: ¿Una clase es un átomo o una molécula?

**Solución**: Clase = "Molécula compuesta"

```javascript
// Clase como molécula con átomos (métodos)
{
  "molecules": {
    "src/services/UserService.js": {
      "type": "molecule",
      "moleculeType": "class",
      "atoms": [
        "src/services/UserService.js::constructor",
        "src/services/UserService.js::fetchUser",
        "src/services/UserService.js::updateProfile"
      ]
    }
  },
  "atoms": {
    "src/services/UserService.js::fetchUser": {
      "type": "atom",
      "atomType": "method",
      "parentClass": "UserService",
      "parentMolecule": "src/services/UserService.js"
    }
  }
}
```

### 3. Dynamic Imports/Exports

**Problema**:
```javascript
export { getFeature as default } from './features';
```

**Solución**: Átomos virtuales

```javascript
// Re-export crea átomo virtual que apunta al real
{
  "atoms": {
    "src/index.js::getFeature": {
      "type": "atom",
      "atomType": "virtual-export",
      "targetAtom": "src/features.js::getFeature",
      "alias": "default"
    }
  }
}
```

### 4. Duplicación de Lógica

**Problema**: ¿Detectores de archivo repiten lógica de detectores de función?

**Solución**: Detectores genéricos con thresholds configurables

```javascript
export const PatternDetectors = {
  godEntity: (entity, options = {}) => {
    const threshold = options.threshold || 
      (entity.type === 'atom' ? 50 : 500);
    
    const connections = entity.type === 'atom'
      ? (entity.calledBy?.length || 0) + (entity.calls?.length || 0)
      : entity.atoms?.reduce((sum, a) => 
          sum + (a.calledBy?.length || 0), 0);
    
    return connections > threshold;
  }
};

// Uso
PatternDetectors.godEntity(func, { threshold: 50 });     // Para función
PatternDetectors.godEntity(file, { threshold: 500 });    // Para archivo
```

### 5. Performance de Derivación

**Problema**: Calcular derivaciones en cada consulta es lento

**Solución**: Cache de derivaciones

```javascript
class DerivationCache {
  constructor() {
    this.cache = new Map();
    this.dependencyGraph = new Map(); // atom -> derived fields
  }
  
  derive(molecule, ruleName) {
    const cacheKey = `${molecule.id}::${ruleName}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = DerivationRules[ruleName](molecule.atoms);
    this.cache.set(cacheKey, result);
    
    // Registrar dependencias para invalidación
    for (const atom of molecule.atoms) {
      if (!this.dependencyGraph.has(atom.id)) {
        this.dependencyGraph.set(atom.id, new Set());
      }
      this.dependencyGraph.get(atom.id).add(cacheKey);
    }
    
    return result;
  }
  
  invalidate(atomId) {
    // Invalidar todas las derivaciones que dependen de este átomo
    const affected = this.dependencyGraph.get(atomId) || new Set();
    for (const cacheKey of affected) {
      this.cache.delete(cacheKey);
    }
  }
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Impacto Preciso

```javascript
// Usuario: "¿Qué pasa si modifico fetchUser?"

get_impact_map("src/api.js", { function: "fetchUser" });

// Respuesta:
{
  target: {
    molecule: "src/api.js",
    atom: "fetchUser",
    archetype: "fragile-gateway",
    severity: 8,
    metadata: {
      complexity: 35,
      hasErrorHandling: false,
      callers: 12
    }
  },
  
  // Impacto molecular (archivos)
  molecularImpact: ["UserCard.jsx", "ProfilePage.jsx"],
  
  // Impacto atómico preciso
  atomicImpact: [
    { 
      molecule: "UserCard.jsx", 
      atom: "loadUser", 
      relationship: "calls",
      line: 42
    },
    { 
      molecule: "ProfilePage.jsx", 
      atom: "init", 
      relationship: "calls",
      line: 15
    }
  ],
  
  // Riesgo derivado de metadata atómica
  riskLevel: "high",
  reason: "fetchUser es llamada por 12 funciones, no tiene error handling"
}
```

### Ejemplo 2: Dead Code Detection

```javascript
// Detector encuentra función muerta

get_risk_assessment({ includeDeadCode: true });

// Respuesta:
{
  deadAtoms: [
    {
      id: "src/utils/helpers.js::oldFormatDate",
      type: "dead-function",
      confidence: 1.0,
      reason: "No exportada, 0 callers",
      suggestion: "Eliminar función no usada"
    }
  ],
  deadMolecules: [
    {
      id: "src/legacy/api-v1.js",
      type: "dead-module",
      confidence: 0.95,
      reason: "Ninguna función exportada es usada externamente"
    }
  ]
}
```

### Ejemplo 3: Refactor Assistant

```javascript
// Usuario quiere renombrar función

analyze_signature_change("src/api.js", "fetchUser", {
  newName: "getUserById"
});

// Respuesta:
{
  changes: [
    {
      type: "rename",
      target: "src/api.js::fetchUser",
      newName: "getUserById",
      confidence: 1.0
    },
    {
      type: "update-calls",
      targets: [
        { file: "UserCard.jsx", line: 42, col: 15 },
        { file: "ProfilePage.jsx", line: 15, col: 8 }
      ],
      count: 12
    }
  ],
  estimatedImpact: "12 call sites in 5 files"
}
```

---

## 🎓 Principios de Diseño

### 1. Single Source of Truth (SSOT)
- La metadata existe UNA sola vez: en el átomo
- Las moléculas son índices, no duplican datos

### 2. Derivación Pura
- Toda metadata de molécula se calcula desde átomos
- No hay "hardcoding" de metadata molecular

### 3. Composición sobre Herencia
- Molécula = Composición de átomos
- Clase = Composición de métodos (átomos)

### 4. Lazy Evaluation
- Las derivaciones se calculan bajo demanda
- Cache para evitar recomputación

### 5. Uniformidad
- Mismo detector funciona para átomo o molécula
- Mismo principio híbrido en ambos niveles

---

## 📚 Referencias

- `docs/ARCHITECTURE.md` - Arquitectura base de OmnySys
- `docs/FUTURE_IDEAS.md` - Ideas futuras incluyendo Semantic Pattern Engine
- `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` - Arquetipos existentes
- `src/layer-a-static/extractors/metadata/call-graph.js` - Extracción actual de funciones

---

## ✅ Checklist de Implementación

### Pre-implementación
- [ ] Revisar este plan con el equipo (si aplica)
- [ ] Definir threshold exactos para detectores
- [ ] Preparar suite de tests sintéticos
- [ ] Backup de datos existentes

### Durante implementación
- [ ] Commits atómicos por fase
- [ ] Tests pasando en cada fase
- [ ] Benchmarks de performance
- [ ] Documentación de cambios

### Post-implementación
- [ ] Testing en proyecto real
- [ ] Validación de precisión de análisis
- [ ] Medición de overhead de performance
- [ ] Actualización de documentación

---

**Nota**: Este plan representa la evolución natural de OmnySys hacia un análisis más granular sin sacrificar la eficiencia del enfoque híbrido que ya funciona.

**Autor**: Claude + Mauro (discusión 2026-02-08)  
**Próximo paso**: Fase 1 - Estructura Atómica
