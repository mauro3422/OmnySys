# Estrategias de Optimización para Análisis Estático de Código

## Resumen de Performance Tracking Implementado

Se agregaron timers en todas las fases críticas del indexer:

### Fases principales medidas:
1. **Cache init** - Inicialización del cache
2. **File scan** - Escaneo de archivos del proyecto
3. **Cache cleanup** - Limpieza de archivos borrados
4. **Parse files** - Parsing de archivos (con sub-timers por batch)
5. **Extract atoms** - Extracción de átomos (con BatchTimer para progreso)
6. **Build calledBy links** - Construcción de enlaces (sub-dividido en 6a-g)
7. **Resolve imports + dataDir** - Resolución de imports
8. **Normalize paths** - Normalización de rutas
9. **Build system graph** - Construcción del grafo
10. **Classify cultures** - Clasificación de culturas de archivos
11. **Code quality analysis** - Análisis de calidad
12. **Save to SQLite** - Guardado en base de datos

## Estrategias de Paralelización para Análisis Estático

### 1. **Worker Threads (Node.js)**
**Qué es:** Threads nativos de Node.js para CPU-intensive tasks
**Cuándo usar:** Parsing y extracción de átomos (CPU-bound)
**Limitaciones:**
- SQLite no es thread-safe para escritura
- Requiere serialización de datos entre threads
- Overhead de creación de workers

**Implementación propuesta:**
```javascript
// Fase 1: Parseo en paralelo con workers
const { Worker } = require('worker_threads');

// Cada worker parsea un subset de archivos
// Resultados se agregan en el thread principal
// Luego se hace bulk-insert a SQLite
```

**Herramientas similares en el mercado:**
- **ESLint**: Usa worker_threads desde v7 para linting paralelo
- **TypeScript**: Usa múltiples workers para chequeo de tipos
- **Rome**: Parser/formatter Rust con paralelización nativa
- **SWC**: Compilador Rust con paralelización

### 2. **Batching con Control de Concurrencia**
**Qué es:** Procesar en batches limitando paralelismo
**Cuándo usar:** Ya implementado (BATCH_SIZE=20), pero puede ajustarse
**Optimización:** Ajustar batch size según:
- Número de cores disponibles: `os.cpus().length`
- Memoria disponible
- Tiempo promedio de parsing por archivo

**Cálculo óptimo de batch size:**
```javascript
const os = require('os');
const OPTIMAL_BATCH_SIZE = Math.min(
  Math.max(10, os.cpus().length * 2),  // Mínimo 10, máximo cores*2
  50  // Hard limit para no saturar memoria
);
```

### 3. **Lazy Loading / On-Demand Parsing**
**Qué es:** No parsear todo al inicio, solo archivos necesarios
**Cuándo usar:** Para proyectos grandes (10k+ archivos)
**Implementación:**
- Parsear solo archivos modificados desde último análisis
- Cache de AST en disco (ya implementado parcialmente)
- Parsear archivos relacionados bajo demanda

### 4. **AST Caching Persistent**
**Qué es:** Guardar AST parseados en disco entre ejecuciones
**Beneficio:** Evita re-parsear archivos no modificados
**Storage:** SQLite o archivos binarios
**Invalidación:** Basada en hash del contenido o timestamp

**Implementación:**
```javascript
// Guardar AST
const astHash = hash(fileContent);
const cached = await getCachedAst(filePath, astHash);
if (cached) return cached;

// Parsear y guardar
const ast = parse(fileContent);
await saveCachedAst(filePath, astHash, ast);
```

### 5. **Streaming / Pipeline Processing**
**Qué es:** Procesar archivos en pipeline sin guardar todo en memoria
**Fases del pipeline:**
1. Scan → Stream de paths
2. Parse → Stream de ASTs
3. Extract → Stream de átomos
4. Save → Stream a SQLite

**Beneficio:** Menor uso de memoria, procesamiento continuo

### 6. **Incremental Analysis**
**Qué es:** Solo analizar archivos modificados
**Implementación:**
- Guardar timestamp/hash de último análisis
- Comparar con archivos actuales
- Analizar solo deltas
- Actualizar grafo existente (no reconstruir)

### 7. **Parallel SQL Writes (Bulk Insert)**
**Problema actual:** SQLite soporta un writer a la vez
**Solución:**
- Acumular inserts en memoria
- Bulk insert cada N registros o cada X ms
- Usar transacciones grandes

**Implementación:**
```javascript
class BulkInserter {
  constructor(db, batchSize = 1000) {
    this.db = db;
    this.batch = [];
    this.batchSize = batchSize;
  }

  add(data) {
    this.batch.push(data);
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  flush() {
    if (this.batch.length === 0) return;
    
    const insert = this.db.prepare('INSERT INTO atoms VALUES (?)');
    const transaction = this.db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });
    
    transaction(this.batch);
    this.batch = [];
  }
}
```

## Análisis de Cuello de Botella Probable

Basado en la arquitectura actual:

### Fase más lenta probable: **Parsing (Fase 4)**
- Parsea 2154 archivos secuencialmente en batches de 20
- Cada archivo requiere I/O de disco + parsing AST
- **Optimización:** Usar worker_threads para parsear múltiples archivos en paralelo

### Segunda fase lenta: **Extracción de átomos (Fase 5)**
- 12,981 átomos extraídos
- Cada extractor corre para cada archivo
- **Optimización:** Paralelizar extractores por archivo

### Tercera fase: **Guardado en SQLite (Fase 12)**
- 65,286 relaciones + 12,981 átomos
- SQLite con un solo writer
- **Optimización:** Bulk insert en transacciones grandes

## Recomendaciones Prioritarias

### Corto plazo (fácil, alto impacto):
1. **Ajustar BATCH_SIZE dinámicamente** según cores disponibles
2. **Bulk insert para relaciones** - Reducir transacciones SQLite
3. **Cache de AST** - Persistir parsed files entre ejecuciones

### Mediano plazo (moderado esfuerzo):
4. **Worker threads para parsing** - Paralelizar fase más lenta
5. **Incremental analysis** - Solo analizar archivos modificados

### Largo plazo (mayor esfuerzo):
6. **Pipeline streaming** - Reducir memoria y mejorar throughput
7. **Rust/WASM parser** - Reemplazar Babel por SWC o similar

## Métricas a Monitorear

Con los timers implementados, monitorear:
- Tiempo por archivo en parsing
- Tiempo por átomo en extracción
- Tiempo por relación en guardado
- Memoria heap usada por fase
- Rate de procesamiento (items/segundo)

Esto permitirá identificar con precisión dónde está el cuello de botella.
