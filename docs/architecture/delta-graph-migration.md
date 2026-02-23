# Arquitectura Delta-Graph: Migración JSON → SQLite

## 📋 Resumen Ejecutivo

**Fecha:** 2026-02-22  
**Decisión:** Migrar sistema de almacenamiento de JSON files → SQLite + Grafo en memoria  
**Motivación:** EMFILE errors, pérdida de datos potencial, escalabilidad limitada  
**Estado:** Aprobado para implementación

---

## 🔴 Problema Actual

### 1. EMFILE: Too Many Open Files

**Síntoma:** Durante reindexado completo, el sistema intenta abrir miles de archivos JSON simultáneamente:

```
❌ Error saving atom tests/unit/.../foo.test.js::test(bar): 
   EMFILE: too many open files
```

**Causa raíz:**
- 12,640 átomos = 12,640 archivos JSON
- Sistema operativo limita file descriptors (Windows: ~512 default)
- Cada `fs.writeFile()` consume un FD hasta completar

**Impacto:**
- Reindexado falla parcialmente
- Datos no se persisten (pérdida silenciosa)
- Retry con backoff ayuda pero no garantiza entrega

### 2. Pérdida de Datos Potencial

**Escenario crítico:**
```javascript
// graceful-write.js actual
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    await fs.writeFile(path, data);
    return; // Éxito
  } catch (error) {
    if (isEMFILE(error)) {
      await sleep(delay);
      continue; // Reintenta
    }
    throw error; // Error fatal
  }
}
// Después de 3 reintentos...
throw lastError; // 💥 Datos perdidos
```

**Problema:** Si después de 3 reintentos sigue fallando, el error se propaga y el átomo NO se guarda.

### 3. Escalabilidad Limitada

**Métricas actuales:**
- 2,140 archivos fuente
- 12,385 funciones (átomos)
- 3,317 conexiones semánticas
- 111MB de JSON dispersos

**Proyección:**
- Año 1: 5,000 archivos, 30K funciones
- Año 2: 10,000 archivos, 60K funciones

**Con JSON files:**
- Búsqueda: O(n) - escanear directorios
- Sin índices: Cada query recorre todo
- Sin transacciones: Estado inconsistente posible

### 4. Latencia en Queries

**Ejemplo:** Buscar todas las funciones async que llaman a "saveAtom"

```javascript
// Con JSON files (actual):
const atoms = await getAllAtoms(); // Lee 12,640 archivos
const result = atoms.filter(a => 
  a.isAsync && a.calls?.includes('saveAtom')
);
// Tiempo: ~2-5 segundos
```

---

## ✅ Solución Propuesta: Delta-Graph Architecture

### Principios Fundamentales

1. **Delta Updates:** Solo cambios incrementales, nunca full rebuild
2. **ACID Transactions:** Atomicidad entre persistencia y grafo
3. **Event Sourcing:** Todo cambio queda registrado (audit trail)
4. **Graph in Memory:** Análisis de grafos en tiempo real
5. **SQLite Persistence:** Almacenamiento confiable y simple

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    DELTA-GRAPH ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 CAMBIO (FileWatcher o AtomicEdit)                      │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │ Delta        │─────▶│ Transaction  │                   │
│  │ Analyzer     │      │ Manager      │                   │
│  │ (qué cambió) │      │ (ACID)       │                   │
│  └──────────────┘      └──────┬───────┘                   │
│                               │                            │
│                 ┌─────────────┼─────────────┐             │
│                 │             │             │              │
│                 ▼             ▼             ▼              │
│          ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│          │ SQLite   │  │ Graph    │  │ Event    │         │
│          │ (atoms)  │  │ (mem)    │  │ Log      │         │
│          └──────────┘  └──────────┘  └──────────┘         │
│                 │             │             │              │
│                 └─────────────┴─────────────┘             │
│                               │                            │
│                               ▼                            │
│                      ┌──────────────┐                      │
│                      │ Consistency  │                      │
│                      │ Validator    │                      │
│                      └──────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Schema de SQLite

### Tabla: `atoms`
Fuente de verdad para todos los átomos.

```sql
CREATE TABLE atoms (
  id TEXT PRIMARY KEY,           -- "src/file.js::functionName"
  file_path TEXT NOT NULL,       -- Ruta relativa del archivo
  function_name TEXT NOT NULL,   -- Nombre de la función
  line INTEGER,                  -- Línea de inicio
  end_line INTEGER,              -- Línea final
  type TEXT,                     -- 'function', 'arrow', 'method'
  signature TEXT,                -- Firma completa
  data JSON NOT NULL,            -- Datos completos como JSON
  version INTEGER DEFAULT 1,     -- Versionado optimista
  created_at INTEGER,            -- unixepoch
  updated_at INTEGER             -- unixepoch
);

-- Índices críticos
CREATE INDEX idx_atoms_file ON atoms(file_path);
CREATE INDEX idx_atoms_name ON atoms(function_name);
CREATE INDEX idx_atoms_updated ON atoms(updated_at);

-- Full-text search
CREATE VIRTUAL TABLE atoms_fts USING fts5(
  function_name, signature,
  content='atoms',
  content_rowid='id'
);
```

### Tabla: `atom_events`
Event sourcing - todo cambio queda registrado.

```sql
CREATE TABLE atom_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atom_id TEXT NOT NULL,
  operation TEXT NOT NULL,       -- 'create', 'update', 'delete'
  delta TEXT NOT NULL,           -- JSON con cambios específicos
  previous_version INTEGER,
  new_version INTEGER,
  timestamp INTEGER DEFAULT (unixepoch()),
  source TEXT,                   -- 'file-watcher', 'atomic-edit', 'mcp'
  transaction_id TEXT            -- Para agrupar cambios atómicos
);

CREATE INDEX idx_events_atom ON atom_events(atom_id);
CREATE INDEX idx_events_time ON atom_events(timestamp);
CREATE INDEX idx_events_txn ON atom_events(transaction_id);
```

### Vista: `graph_edges`
Grafo derivado de los datos.

```sql
CREATE VIEW graph_edges AS
SELECT 
  a.id as source_id,
  a.file_path as source_file,
  a.function_name as source_name,
  json_each.value as target_id,
  'calls' as edge_type
FROM atoms a, json_each(json_extract(a.data, '$.calls'))
WHERE json_extract(a.data, '$.calls') IS NOT NULL;
```

---

## 🔄 Flujo de Datos

### Escenario: IA edita un archivo

```
T+0ms:  IA guarda cambio en src/utils.js
        │
T+50ms: FileWatcher detecta (debounce 50ms)
        │
T+100ms: Tree-sitter parsea funciones modificadas
         - función A: modificada (línea 25)
         - función B: sin cambios
         - función C: nueva (línea 40)
        │
T+150ms: Delta Analyzer genera delta
         {
           file: 'src/utils.js',
           modified: [{id: 'src/utils.js::A', fields: ['calls']}],
           created: [{id: 'src/utils.js::C', ...}]
         }
        │
T+200ms: Transaction Manager inicia TX
         ├─ UPDATE atoms SET data=..., version=2 WHERE id='A'
         ├─ INSERT INTO atoms (...) VALUES (...) -- C
         ├─ INSERT INTO atom_events (...) -- 2 eventos
         └─ graph.updateNode('A'); graph.addNode('C')
        │
T+250ms: Commit exitoso
        │
T+300ms: MCP Tools ven cambios inmediatamente
```

**Tiempo total: 300ms** (vs 5-10s con full reindex)

---

## 📊 Comparación: Antes vs Después

| Aspecto | JSON Files | SQLite + Delta-Graph |
|---------|-----------|---------------------|
| **Escritura** | EMFILE errors | ✅ ACID transactions |
| **Pérdida de datos** | Posible tras retries | ✅ Zero data loss |
| **Query simple** | O(n) - escanear todo | ✅ O(log n) - índice B-tree |
| **Query compleja** | 2-5 segundos | ✅ <50ms |
| **Búsqueda texto** | No existe | ✅ Full-text search |
| **Audit trail** | No existe | ✅ Event sourcing |
| **Concurrencia** | Riesgo de corrupción | ✅ WAL mode |
| **Backup** | Copiar 12,640 archivos | ✅ Copiar 1 archivo .db |
| **Tamaño** | 111MB dispersos | ~50MB compactado |

---

## 🚀 Plan de Migración

### Fase 1: Capa de Abstracción (Semana 1)

Crear interfaz que oculte el backend:

```javascript
// src/layer-c-memory/storage/atoms/atom-repository.js
export class AtomRepository {
  async save(atom) { }
  async findById(id) { }
  async findByFile(filePath) { }
  async findByName(name) { }
  async query(filter) { }
  async getGraph() { }
}

// Implementación actual (JSON) - temporal
export class JSONAtomRepository extends AtomRepository { }

// Implementación nueva (SQLite)
export class SQLiteAtomRepository extends AtomRepository { }
```

### Fase 2: Migración de Datos (Semana 2)

```javascript
// Script de migración
async function migrateJSONToSQLite() {
  const jsonRepo = new JSONAtomRepository();
  const sqliteRepo = new SQLiteAtomRepository();
  
  const allAtoms = await jsonRepo.getAll();
  
  for (const atom of allAtoms) {
    await sqliteRepo.save(atom);
  }
  
  console.log(`Migrated ${allAtoms.length} atoms`);
}
```

### Fase 3: Cutover Gradual (Semana 3)

```javascript
// Feature flag
const USE_SQLITE = process.env.OMNY_STORAGE === 'sqlite';

export function getRepository() {
  return USE_SQLITE 
    ? new SQLiteAtomRepository()
    : new JSONAtomRepository();
}
```

### Fase 4: Remover JSON (Semana 4)

Una vez confirmado que SQLite funciona:
- Remover `JSONAtomRepository`
- Actualizar documentación
- Backup y archive de JSONs viejos

---

## 🛡️ Manejo de Errores

### Estrategia: At-Least-Once Delivery

```javascript
// Si falla la escritura en SQLite, retry infinito
// con backoff exponencial hasta lograrlo

async function saveWithGuarantee(atom) {
  let attempt = 0;
  
  while (true) {
    try {
      await db.run('INSERT OR REPLACE INTO atoms ...');
      return; // Éxito
    } catch (error) {
      attempt++;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      
      console.warn(`Save failed (attempt ${attempt}), retrying in ${delay}ms`);
      await sleep(delay);
      
      // Nunca damos up - seguimos intentando
    }
  }
}
```

### Estrategia: Consistency Check

```javascript
// Periódicamente verificar que SQLite y Grafo están sincronizados
async function verifyConsistency() {
  const sqlCount = await db.get('SELECT COUNT(*) FROM atoms');
  const graphCount = graphEngine.getNodeCount();
  
  if (sqlCount !== graphCount) {
    console.error('INCONSISTENCY DETECTED!');
    await rebuildGraphFromSQLite();
  }
}
```

---

## 📈 Métricas de Éxito

Después de la migración, deberíamos ver:

1. **Tiempo de reindexado:** De 30s a <5s
2. **Tiempo de query:** De 2-5s a <50ms
3. **EMFILE errors:** 0
4. **Data loss events:** 0
5. **Tamaño en disco:** De 111MB a ~50MB
6. **Tiempo de backup:** De 10s a <1s

---

## 🔄 Integración con Tree-sitter

A futuro, cuando migremos de Babel a Tree-sitter:

```javascript
// Tree-sitter genera AST más rápido
const ast = treeSitter.parse(sourceCode);

// Extractor de atoms actualizado
const atoms = extractAtomsFromAST(ast);

// Se guardan igual en SQLite
await atomRepository.saveMany(atoms);
```

SQLite es agnóstico al parser - solo recibe los datos.

---

## 📝 Decisiones Registradas

### ¿Por qué SQLite y no PostgreSQL?
- **Simplicidad:** Zero-config, file-based
- **Suficiente:** Hasta 281TB, >100K hits/day
- **Portabilidad:** Un archivo que se puede mover
- **MAD:** "Minimal Admin Database"

### ¿Por qué Grafo en memoria y no Neo4j?
- **Velocidad:** Análisis 100x más rápido en memoria
- **Simplicidad:** Sin servidor adicional
- **Costo:** Gratis vs licencia Neo4j
- **Rebuild:** Podemos reconstruir desde SQLite en segundos

### ¿Por qué Event Sourcing?
- **Audit:** Sabemos quién cambió qué y cuándo
- **Replay:** Podemos reconstruir estado histórico
- **Debug:** Facilita trackear bugs
- **IA:** Entiende el "por qué" de los cambios

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| SQLite corrupto | WAL mode + backups automáticos |
| Grafo out of sync | Consistency validator periódico |
| Query lenta | Índices + EXPLAIN ANALYZE |
| Migración falla | Feature flag + rollback plan |
| Lock contention | WAL mode permite readers concurrentes |

---

## 🎯 Próximos Pasos

1. ✅ **Este documento** - Aprobado
2. 🔄 **Compact** - Limpiar contexto
3. 📊 **Análisis** - Schema de tools, metadata flow
4. 💻 **Implementación** - Empezar Fase 1
5. 🧪 **Testing** - Validar con dataset real
6. 🚀 **Deploy** - Cutover gradual

---

**Documento aprobado para implementación.**

**Firma:** Claude (OpenCode) + Mauro  
**Fecha:** 2026-02-22
