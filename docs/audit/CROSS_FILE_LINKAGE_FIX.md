# 🔧 Cross-File Linkage Fix - Análisis y Solución

## 📊 Problema Identificado

**Síntoma:** Solo 22.7% de atoms tienen `calledBy` poblado (1241 de 5457)

### Causas Raíz Identificadas:

#### 1. **Lookup por nombre simple vs nombre calificado**

El cross-file linkage busca:
```javascript
const targetAtom = atomByName.get(call.name);  // busca "info"
```

Pero los métodos de clase se guardan con nombre calificado:
```json
{
  "name": "info",
  "className": "Logger",
  "id": "src/utils/logger.js::Logger.info"
}
```

**Resultado:** Cuando alguien llama `logger.info()`, el call name es `"info"` pero el atom está registrado como `"Logger.info"`.

#### 2. **Solo considera `call.type === 'external'`**

El código actual:
```javascript
for (const call of (callerAtom.calls || [])) {
  if (call.type === 'external') {  // ← PROBLEMA
    const targetAtom = atomByName.get(call.name);
```

Pero muchos calls son:
- `type: 'internal'` - llamadas dentro del mismo archivo
- `type: undefined` - llamadas sin clasificar

#### 3. **No considera `internalCalls` y `externalCalls`**

Los atoms tienen:
- `calls[]` - lista de todas las llamadas
- `internalCalls[]` - llamadas a funciones del mismo archivo
- `externalCalls[]` - llamadas a funciones de otros archivos

El código solo usa `calls`, ignorando las listas específicas.

---

## 🎯 Solución Robusta

### Fase 1: Índice Multi-Nivel

```javascript
// Build multi-level lookup
const atomBySimpleName = new Map();      // "info" → [atom1, atom2, ...]
const atomByQualifiedName = new Map();   // "Logger.info" → atom
const atomByFilePath = new Map();        // "src/utils/logger.js::createLogger" → atom

for (const atom of allAtoms) {
  // Por nombre simple (puede haber múltiples)
  if (!atomBySimpleName.has(atom.name)) {
    atomBySimpleName.set(atom.name, []);
  }
  atomBySimpleName.get(atom.name).push(atom);
  
  // Por nombre calificado (único)
  if (atom.className) {
    const qualifiedName = `${atom.className}.${atom.name}`;
    atomByQualifiedName.set(qualifiedName, atom);
  }
  
  // Por ID completo (único)
  atomByFilePath.set(atom.id, atom);
}
```

### Fase 2: Lookup Inteligente

```javascript
function findTargetAtom(call, callerAtom, atomBySimpleName, atomByQualifiedName) {
  // 1. Buscar por nombre calificado primero (más preciso)
  if (call.name.includes('.')) {
    return atomByQualifiedName.get(call.name);
  }
  
  // 2. Buscar por nombre simple
  const candidates = atomBySimpleName.get(call.name) || [];
  
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  
  // 3. Si hay múltiples candidatos, preferir:
  //    - Exportado sobre no exportado
  //    - Archivo diferente al caller
  const exported = candidates.find(a => a.isExported);
  if (exported) return exported;
  
  const differentFile = candidates.find(a => a.filePath !== callerAtom.filePath);
  if (differentFile) return differentFile;
  
  return candidates[0];
}
```

### Fase 3: Considerar Todas las Llamadas

```javascript
// Para cada atom, considerar TODAS sus llamadas
for (const callerAtom of allAtoms) {
  const allCalls = [
    ...(callerAtom.calls || []),
    ...(callerAtom.internalCalls || []),
    ...(callerAtom.externalCalls || [])
  ];
  
  for (const call of allCalls) {
    const targetAtom = findTargetAtom(call, callerAtom, ...);
    // ...
  }
}
```

---

## 📈 Impacto Esperado

| Métrica | Actual | Esperado |
|---------|--------|----------|
| calledBy poblado | 22.7% | **60-80%** |
| Cross-file links | 1241 | **3500-4500** |

---

## 🚀 Implementación

La solución requiere modificar `src/layer-a-static/indexer.js` en el "PASO 3.6: Cross-file calledBy linkage".

### Prioridad: ALTA

Este fix mejorará:
1. **Precisión del Inference Engine** - más datos para deducir
2. **Reducción de llamadas LLM** - más conexiones estáticas
3. **Calidad del call graph** - mejor análisis de impacto

---

## 🔮 Futuro: Linkage por Imports

Una mejora adicional es usar la información de imports:

```javascript
// Si archivo A importa { foo } from './b.js'
// Y b.js tiene atom "foo"
// Entonces crear link: A::callerAtom → b.js::foo atom
```

Esto requiere acceso a `resolvedImports` durante el linkage, que ya está disponible en el pipeline.