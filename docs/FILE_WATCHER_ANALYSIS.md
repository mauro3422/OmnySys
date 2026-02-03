# File Watcher - Análisis y Estrategia de Implementación

## 🎯 Resumen Ejecutivo

El File Watcher es un componente **CRÍTICO** que puede romper todo el sistema si no se implementa correctamente. Este documento explica el análisis del sistema actual y la estrategia de implementación segura.

---

## 📊 Análisis del Sistema Actual

### 1. Estructura de Datos Actual

```
.OmnySystemData/
├── index.json                 # Metadata + fileIndex
├── files/                     # Análisis por archivo
│   └── src/
│       └── api.js.json       # Análisis individual
├── connections/               # Conexiones semánticas
│   ├── shared-state.json
│   └── event-listeners.json
└── risks/
    └── assessment.json        # Risk scores
```

### 2. Relaciones Entre Archivos

El grafo tiene **relaciones bidireccionales** que deben mantenerse consistentes:

```javascript
// Archivo A importa Archivo B
// Archivo B tiene a Archivo A en usedBy

// FileA.js
import { foo } from './FileB';  // dependsOn: ['FileB']

// FileB.js
export const foo = 1;           // usedBy: ['FileA']
```

### 3. Propiedades Derivadas

Varios campos son **calculados** a partir de otras relaciones:

| Campo | Cómo se calcula |
|-------|-----------------|
| `usedBy` | Inversa de `dependsOn` de otros archivos |
| `transitiveDepends` | Recursión sobre `dependsOn` |
| `transitiveDependents` | Recursión sobre `usedBy` |
| `riskScore` | Basado en conectividad + side effects |

---

## 🚨 Problemas Potenciales

### Problema 1: Relaciones Desactualizadas

**Escenario:**
1. `FileA` importa `FileB`
2. Se elimina el import de `FileA`
3. `FileB.usedBy` todavía contiene `FileA` ❌

**Impacto:** El grafo muestra dependencias fantasmas.

### Problema 2: Propiedades Derivadas Incorrectas

**Escenario:**
1. `FileA` → `FileB` → `FileC` (cadena de dependencias)
2. `FileA` agrega import a `FileD`
3. `transitiveDepends` de `FileA` no se actualiza ❌

**Impacto:** El impact analysis da resultados incorrectos.

### Problema 3: Análisis Concurrente

**Escenario:**
1. Usuario guarda `FileA`
2. File Watcher empieza análisis
3. Usuario guarda `FileA` otra vez
4. Dos análisis del mismo archivo corriendo ❌

**Impacto:** Race conditions, datos corruptos.

### Problema 4: Cambios en Exports

**Escenario:**
1. `FileB` exporta `foo`
2. `FileA` importa `foo` de `FileB`
3. `FileB` elimina `foo`
4. `FileA` ahora tiene import roto ❌

**Impacto:** No detectamos código roto en tiempo real.

---

## ✅ Estrategia de Solución

### Arquitectura del File Watcher

```
┌─────────────────────────────────────────────────────────────────┐
│                      FILE WATCHER v1.0                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Watcher    │  │   Queue      │  │  Processor   │          │
│  │   (FS)       │→ │   (Debounce) │→ │  (Analysis)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                                   │                   │
│         │                                   ↓                   │
│         │                          ┌─────────────────┐          │
│         │                          │  Update Engine  │          │
│         │                          │  - Relaciones   │          │
│         │                          │  - Derivados    │          │
│         │                          │  - Indices      │          │
│         │                          └────────┬────────┘          │
│         │                                   │                   │
│         └───────────────────────────────────┤                   │
│                                             ↓                   │
│                                   ┌──────────────────┐          │
│                                   │  Unified Server  │          │
│                                   │  - Invalidate    │          │
│                                   │  - Notify        │          │
│                                   └──────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fases del Procesamiento

#### Fase 1: Detección (Watcher)
- Usa `fs.watch` o `chokidar` para monitorear cambios
- Filtra archivos irrelevantes (node_modules, .git)
- Calcula hash del contenido para detectar cambios reales

#### Fase 2: Cola (Queue)
- **De-duplicación:** Si el mismo archivo cambia 3 veces en 500ms, solo procesamos el último
- **Priorización:** Cambios en archivos de alto riesgo van primero
- **Batching:** Agrupar cambios para procesamiento eficiente

#### Fase 3: Análisis (Processor)
- Parsear archivo modificado
- Resolver imports
- Detectar conexiones semánticas
- Comparar con análisis anterior

#### Fase 4: Actualización (Update Engine)
- Actualizar análisis del archivo
- **Recalcular relaciones:**
  - Si cambiaron imports → actualizar `dependsOn` y `usedBy` del otro lado
  - Si cambiaron exports → notificar archivos que dependen de este
- **Recalcular derivados:**
  - `transitiveDepends` y `transitiveDependents`
  - `riskScore`
- Actualizar índices globales

#### Fase 5: Notificación
- Invalidar cachés en MCP Server
- Notificar a VS Code vía WebSocket/HTTP
- Emitir eventos para otros consumidores

---

## 🔧 Implementación Detallada

### Estrategia de Actualización de Relaciones

```javascript
// Cuando FileA cambia sus imports:
async function updateRelationships(fileA, oldImports, newImports) {
  const added = newImports.filter(i => !oldImports.includes(i));
  const removed = oldImports.filter(i => !newImports.includes(i));

  // Para cada import agregado:
  for (const dep of added) {
    // Agregar FileA a usedBy de la dependencia
    await addToUsedBy(dep, fileA);
  }

  // Para cada import removido:
  for (const dep of removed) {
    // Remover FileA de usedBy de la dependencia
    await removeFromUsedBy(dep, fileA);
  }
}
```

### Estrategia de Derivados

**Opción A: Recalcular todo (Seguro, lento)**
```javascript
// Recalcular transitiveDepends para TODOS los archivos
// Costo: O(n²) donde n = archivos
// Uso: Proyectos pequeños (< 100 archivos)
```

**Opción B: Recalcular afectados (Balanceado)**
```javascript
// Solo recalcular para archivos en la cadena de dependencia
// Costo: O(k) donde k = archivos afectados
// Uso: Proyectos medianos (100-1000 archivos)
```

**Opción C: Lazy recalculation (Rápido, complejo)**
```javascript
// Marcar como "stale" y recalcular bajo demanda
// Costo: O(1) para actualizar, O(chain) para query
// Uso: Proyectos grandes (> 1000 archivos)
```

**Decisión:** Implementar Opción B (Recalcular afectados)

### Manejo de Exports Eliminados

```javascript
// Detectar exports removidos y quién los usaba
async function handleRemovedExports(file, removedExports) {
  const brokenImports = [];

  for (const exp of removedExports) {
    // Buscar archivos que importaban este export
    const importers = await findImportersOfExport(file, exp);
    brokenImports.push(...importers);
  }

  if (brokenImports.length > 0) {
    // Notificar: estos archivos ahora tienen imports rotos
    emit('broken:imports', { file, brokenImports });
  }
}
```

---

## 🛡️ Mecanismos de Seguridad

### 1. Locking por Archivo

```javascript
const processingFiles = new Set();

async function processFile(filePath) {
  if (processingFiles.has(filePath)) {
    return; // Ya está procesándose
  }

  processingFiles.add(filePath);
  try {
    await analyzeAndUpdate(filePath);
  } finally {
    processingFiles.delete(filePath);
  }
}
```

### 2. Validación de Parseo

```javascript
async function safeAnalyze(filePath) {
  try {
    const parsed = await parseFileFromDisk(filePath);
    if (!parsed) {
      throw new Error('Parse returned null');
    }
    return parsed;
  } catch (error) {
    // No actualizar el índice si el parseo falló
    // El archivo podría tener syntax errors temporales
    emit('parse:error', { filePath, error });
    return null;
  }
}
```

### 3. Backup Automático

```javascript
async function updateWithBackup(filePath, newAnalysis) {
  const backupPath = `${filePath}.backup`;

  try {
    // Guardar backup
    await fs.copyFile(filePath, backupPath);

    // Aplicar actualización
    await saveFileAnalysis(filePath, newAnalysis);

    // Si todo OK, eliminar backup
    await fs.unlink(backupPath);
  } catch (error) {
    // Restaurar backup si algo falló
    if (await fileExists(backupPath)) {
      await fs.copyFile(backupPath, filePath);
    }
    throw error;
  }
}
```

---

## 📈 Performance Consideraciones

### Optimizaciones Implementadas

| Optimización | Beneficio |
|--------------|-----------|
| Hash de contenido | Evita re-analizar si el archivo no cambió realmente |
| Debounce (500ms) | Agrupa cambios rápidos, reduce I/O |
| Batch processing | Procesa múltiples archivos en paralelo |
| Selective recalculation | Solo recalcula derivados afectados |
| Incremental updates | No reconstruye todo el grafo |

### Métricas Esperadas

| Escenario | Tiempo | Memoria |
|-----------|--------|---------|
| Cambio en 1 archivo | < 500ms | +5MB |
| Cambio en 10 archivos | < 2s | +20MB |
| Cambio en 100 archivos | < 10s | +100MB |
| Full re-index | ~60s (depende del proyecto) | Baseline |

---

## 🔌 Integración con Unified Server

### Eventos Emitidos

```javascript
// File Watcher → Unified Server
fileWatcher.on('file:created', ({ filePath, analysis }) => {
  // Invalidar caché de MCP
  unifiedServer.invalidateCache(filePath);

  // Notificar a VS Code
  unifiedServer.broadcastToVSCode({
    type: 'file:analyzed',
    file: filePath,
    status: 'created'
  });
});

fileWatcher.on('file:modified', ({ filePath, changes }) => {
  // Si cambiaron exports, notificar posibles breaks
  if (changes.some(c => c.type === 'EXPORT_CHANGED')) {
    unifiedServer.broadcastToVSCode({
      type: 'warning',
      message: 'Exports changed - check dependent files',
      file: filePath
    });
  }
});
```

---

## ✅ Checklist de Implementación

- [x] Análisis del sistema actual
- [x] Diseño de estrategia
- [x] Implementación de File Watcher base
- [ ] Integración con Unified Server
- [ ] WebSocket para notificaciones en tiempo real
- [ ] Tests de integración
- [ ] Benchmarks de performance

---

## 🎯 Conclusión

El File Watcher es complejo pero **manejable** si seguimos estas reglas:

1. **Nunca** modificar archivos directamente sin backup
2. **Siempre** mantener relaciones bidireccionales consistentes
3. **Recalcular** derivados solo para archivos afectados
4. **Proteger** contra análisis concurrente del mismo archivo
5. **Notificar** a todos los consumidores de cambios

Con esta implementación, el sistema puede manejar cambios en tiempo real sin romper la consistencia del grafo.
