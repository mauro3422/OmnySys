# Storage Layer - Partitioned Architecture

## 📋 Overview

Este módulo implementa un sistema de almacenamiento **particionado** para los datos de análisis, reemplazando el enfoque monolítico anterior (un JSON gigante) con una arquitectura escalable que permite consultas eficientes.

## 🎯 Problema que resuelve

### Antes (Monolítico):
```
system-map-enhanced.json (50KB para 6 archivos)
- 1000 archivos = ~8.3MB
- Cargar TODO el archivo para consultar UN solo dato
- Regenerar TODO cuando cambia un archivo
- No escalable para proyectos grandes
```

### Ahora (Particionado):
```
.aver/
├── index.json (metadata ligera: 2KB)
├── files/ (análisis por archivo: 4-8KB cada uno)
├── connections/ (conexiones globales: 8KB total)
└── risks/ (risk assessment: 6KB)

- Cargar solo 2-8KB por consulta
- Actualizar solo archivos modificados
- Escalable a 1000+ archivos
```

## 📂 Estructura de datos

```
.aver/
├── index.json              # Metadata global + índice de archivos
├── files/
│   └── {mirror-structure}/ # Espejo de la estructura del proyecto
│       └── file.js.json    # Análisis completo del archivo
├── connections/
│   ├── shared-state.json   # Todas las conexiones de estado compartido
│   └── event-listeners.json # Todas las conexiones de eventos
└── risks/
    └── assessment.json     # Risk assessment completo
```

### Ejemplo: index.json
```json
{
  "metadata": {
    "totalFiles": 6,
    "totalDependencies": 12,
    "analysisVersion": "3.5.0",
    "analyzedAt": "2026-02-02T...",
    "storageVersion": "1.0.0",
    "storageFormat": "partitioned"
  },
  "fileIndex": {
    "src/UI.js": {
      "hash": "abc123",
      "exports": 4,
      "imports": 2,
      "semanticConnections": 2,
      "riskLevel": "medium",
      "lastAnalyzed": "2026-02-02T..."
    }
  }
}
```

### Ejemplo: files/src/UI.js.json
```json
{
  "path": "src/UI.js",
  "exports": [...],
  "imports": [...],
  "dependsOn": [...],
  "usedBy": [...],
  "semanticConnections": [...],
  "riskScore": {...},
  "sideEffects": {...}
}
```

## 🔧 API: Storage Manager

### Guardar datos particionados

```javascript
import { savePartitionedSystemMap } from './storage-manager.js';

// Guarda todo el enhanced system map en formato particionado
const paths = await savePartitionedSystemMap(projectPath, enhancedSystemMap);
// Retorna: { metadata, files: [], connections, risks }
```

### Funciones individuales

```javascript
import {
  createAverDirectory,
  saveMetadata,
  saveFileAnalysis,
  saveConnections,
  saveRiskAssessment
} from './storage-manager.js';

// Crear directorio .aver/
await createAverDirectory(projectPath);

// Guardar metadata + índice
await saveMetadata(projectPath, metadata, fileIndex);

// Guardar análisis de un archivo
await saveFileAnalysis(projectPath, 'src/UI.js', fileData);

// Guardar conexiones
await saveConnections(projectPath, sharedState, eventListeners);

// Guardar risk assessment
await saveRiskAssessment(projectPath, assessment);
```

## 🔍 API: Query Service

### Consultas básicas

```javascript
import {
  getProjectMetadata,
  getFileAnalysis,
  getFileDependencies,
  getSemanticConnections
} from './query-service.js';

// 1. Metadata del proyecto (solo 2KB)
const metadata = await getProjectMetadata(projectPath);
console.log(`Total files: ${metadata.metadata.totalFiles}`);

// 2. Análisis de un archivo (solo 4-8KB)
const fileData = await getFileAnalysis(projectPath, 'src/UI.js');
console.log(`Exports: ${fileData.exports.length}`);
console.log(`Risk: ${fileData.riskScore.total}`);

// 3. Dependencias de un archivo
const deps = await getFileDependencies(projectPath, 'src/UI.js');
console.log(`Used by: ${deps.usedBy.join(', ')}`);

// 4. Conexiones semánticas de un archivo
const connections = await getSemanticConnections(projectPath, 'src/UI.js');
connections.forEach(conn => {
  console.log(`${conn.sourceFile} → ${conn.targetFile}`);
});
```

### Consultas avanzadas

```javascript
import {
  getAllConnections,
  getHighRiskFiles,
  findFiles,
  getProjectStats
} from './query-service.js';

// 1. Todas las conexiones globales
const allConns = await getAllConnections(projectPath);
console.log(`Total: ${allConns.total}`);

// 2. Archivos de alto riesgo
const highRisk = await getHighRiskFiles(projectPath, 'medium');
highRisk.forEach(file => {
  console.log(`${file.file}: ${file.total} (${file.severity})`);
});

// 3. Buscar archivos por patrón
const uiFiles = await findFiles(projectPath, /UI/);
console.log(uiFiles); // ['src/UI.js', 'components/UIButton.js']

// 4. Estadísticas del proyecto
const stats = await getProjectStats(projectPath);
console.log(`Semantic connections: ${stats.totalSemanticConnections}`);
console.log(`Average risk: ${stats.averageRiskScore}`);
```

### Múltiples archivos

```javascript
import { getMultipleFiles } from './query-service.js';

// Cargar varios archivos de forma eficiente
const files = await getMultipleFiles(projectPath, [
  'src/UI.js',
  'src/Player.js',
  'src/GameStore.js'
]);

console.log(files['src/UI.js'].exports);
```

## 📊 Comparación de Performance

| Operación | Monolítico | Particionado | Mejora |
|-----------|-----------|--------------|--------|
| Analizar 1 archivo | 50KB | 6.5KB | **7.7x** |
| Metadata del proyecto | 50KB | 1.8KB | **27.8x** |
| Todas las conexiones | 50KB | 8.8KB | **5.7x** |
| Archivos de riesgo | 50KB | 5.9KB | **8.5x** |
| **Promedio** | **50KB** | **5.75KB** | **8.7x** |

### Escalabilidad

```
Proyecto de 1000 archivos:
- Monolítico: 8.3MB por cada consulta ❌
- Particionado: 2-10KB por consulta ✅

Mejora: ~1000x menos datos cargados
```

## 🚀 Uso en el MCP Server

El MCP Server usará el Query Service para responder a consultas:

```javascript
// MCP Tool: "analyze-file"
{
  name: "analyze-file",
  async handler({ filePath }) {
    // Solo carga ~6KB (no 8.3MB)
    const analysis = await getFileAnalysis(projectPath, filePath);
    return {
      exports: analysis.exports,
      imports: analysis.imports,
      semanticConnections: analysis.semanticConnections,
      riskScore: analysis.riskScore
    };
  }
}

// MCP Tool: "get-high-risk-files"
{
  name: "get-high-risk-files",
  async handler({ minSeverity = 'high' }) {
    // Solo carga ~6KB (no 8.3MB)
    return await getHighRiskFiles(projectPath, minSeverity);
  }
}
```

## 🔄 Actualizaciones incrementales

La arquitectura particionada permite actualizaciones incrementales:

```javascript
// Detectar archivos cambiados
const changedFiles = await detectChangedFiles(projectPath);

// Solo re-analizar archivos cambiados
for (const file of changedFiles) {
  const analysis = await analyzeFile(file);
  await saveFileAnalysis(projectPath, file, analysis);
}

// Actualizar conexiones globales
const newConnections = await regenerateConnections(changedFiles);
await saveConnections(projectPath, newConnections.sharedState, newConnections.eventListeners);
```

## 📝 Notas de implementación

1. **Compatibilidad**: El indexer actualmente genera AMBOS formatos:
   - Monolítico: `system-map-enhanced.json` (para compatibilidad)
   - Particionado: `.aver/` directory (nuevo sistema)

2. **Estructura de carpetas**: `.aver/files/` replica la estructura del proyecto:
   ```
   src/
     UI.js
     Player.js

   .aver/files/
     src/
       UI.js.json
       Player.js.json
   ```

3. **Hash de archivos**: Se usa MD5 para detectar cambios (solo primeros 8 caracteres)

4. **Git-friendly**: `.aver/` se puede versionar con git (cambios incrementales)

## 🎯 Próximos pasos

1. **Implementar actualizaciones incrementales** (Phase 4)
2. **Agregar cache en memoria** (opcional)
3. **MCP Server integration** (Phase 4)
4. **File watcher para auto-regeneración** (Phase 5)

## 📚 Ver también

- [test-query-service.js](../../../test-query-service.js) - Script de prueba completo
- [indexer.js](../indexer.js) - Integración con el indexer
