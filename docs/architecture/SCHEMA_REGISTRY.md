# Schema Registry y Unificación de Migraciones

**Fecha**: 2026-02-28  
**Versión**: v0.9.65  
**Estado**: ✅ Completado

---

## 📋 Problemas Resueltos

### 1. Fragmentación de Schema ❌ → ✅

**Problema**: Existían 3 fuentes de verdad para el schema de la base de datos:
- `schema.sql` → Definición base
- `connection.js` → Migraciones hardcoded
- `migrations/index.js` → Migraciones adicionales

**Consecuencia**: Bug de las "58 columnas" - inconsistencia entre lo definido y lo migrado.

**Solución**: `schema-registry.js` como **SINGLE SOURCE OF TRUTH (SSOT)**

---

### 2. Cache ESM en Reinicios ❌ → ✅

**Problema**: `restart_server` no limpiaba el cache ESM de Node.js en modo standalone.

**Consecuencia**: Cambios en el código no se reflejaban sin reinicio manual del proceso.

**Solución**: 
- Documentación clara de que el **proxy mode** es requerido para ESM cache clearing real
- Mensajes de advertencia en modo standalone
- El proxy (mcp-server.js) ya implementa restart verdadero vía `process.send()`

---

## 🏗️ Arquitectura Nueva

### Schema Registry (`schema-registry.js`)

```
src/layer-c-memory/storage/database/
├── schema-registry.js      ← NUEVO: SSOT para schema
├── connection.js           ← Refactorizado para usar registry
└── schema.sql              ← Base legacy (se mantiene para compatibilidad)
```

#### Características del Registry

1. **Definición Declarativa**: Todas las tablas y columnas definidas en un solo lugar
2. **Auto-Migración**: Detecta y agrega columnas faltantes automáticamente
3. **Drift Detection**: Advierte si hay columnas en DB que no están en el registry
4. **Export SQL**: Genera schema.sql desde el registry

#### Ejemplo de Uso

```javascript
import { 
  getTableColumns, 
  detectMissingColumns, 
  generateAddColumnSQL 
} from './schema-registry.js';

// Obtener columnas registradas
const columns = getTableColumns('atoms');

// Detectar columnas faltantes en DB existente
const existing = db.prepare('PRAGMA table_info(atoms)').all();
const missing = detectMissingColumns('atoms', existing);

// Generar SQL para agregar columnas
for (const col of missing) {
  const sql = generateAddColumnSQL('atoms', col.name);
  db.exec(sql);
}
```

---

### Connection.js Refactorizado

**ANTES**:
```javascript
// Migraciones hardcoded
if (!atomColumns.includes('in_degree')) {
  this.db.exec("ALTER TABLE atoms ADD COLUMN in_degree INTEGER DEFAULT 0");
}
if (!atomColumns.includes('out_degree')) {
  this.db.exec("ALTER TABLE atoms ADD COLUMN out_degree INTEGER DEFAULT 0");
}
// ... 20+ ifs más
```

**AHORA**:
```javascript
// Usa schema-registry como SSOT
const registeredTables = getRegisteredTables();

for (const tableName of registeredTables) {
  // Crear tabla si no existe
  if (!tableExists) {
    const createSQL = generateCreateTableSQL(tableName);
    this.db.exec(createSQL);
  }
  
  // Agregar columnas faltantes automáticamente
  const existingColumns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const missingColumns = detectMissingColumns(tableName, existingColumns);
  
  for (const column of missingColumns) {
    const addColumnSQL = generateAddColumnSQL(tableName, column.name);
    this.db.exec(addColumnSQL);
  }
}

// Drift detection
this._checkSchemaDrift();
```

---

### Migraciones Simplificadas

**ANTES**: Migraciones de schema + datos mezclados

**AHORA**: Solo migraciones de DATOS (el schema es automático)

```javascript
// migrations/index.js
const DATA_MIGRATIONS = [
  {
    name: 'fix_purpose_object_bug',
    type: 'fix',
    description: 'Corregir purpose_type = [object Object]',
    check: () => { /* ... */ },
    run: () => { /* ... */ }
  }
  // Solo migraciones de datos, no de schema
];
```

---

## 🛠️ Herramienta MCP Unificada

### `get_schema` (UNIFICADA)

Herramienta unificada para consultar schemas del sistema. Reemplaza a `get_atom_schema` + `get_schema_status`.

**Uso**:
```javascript
// Schema de átomos (metadata)
get_schema({ type: 'atoms', atomType: 'function', sampleSize: 5 })

// Schema de base de datos (estado)
get_schema({ type: 'database' })

// Schema de base de datos (con SQL exportado)
get_schema({ type: 'database', includeSQL: true })

// Schema del registry (definición registrada)
get_schema({ type: 'registry' })
```

**Respuesta (type='atoms')**:
```json
{
  "schemaType": "atoms",
  "totalAtoms": 13485,
  "matchingAtoms": 5000,
  "keyMetrics": { "total": 5000, "withCalls": 3000, ... },
  "fieldCoverage": { "total": 60, "covered": 55, "orphaned": 5 },
  "correlations": [...],
  "schema": [...],
  "sampleAtoms": [...]
}
```

**Respuesta (type='database')**:
```json
{
  "schemaType": "database",
  "health": { "status": "healthy", "score": 100, "grade": "A" },
  "summary": {
    "totalRegisteredTables": 8,
    "existingTables": 8,
    "missingTables": 0,
    "totalMissingColumns": 0
  },
  "recommendations": [...]
}
```

**Respuesta (type='registry')**:
```json
{
  "schemaType": "registry",
  "totalTables": 8,
  "tables": {
    "atoms": {
      "description": "Átomos del sistema",
      "columnCount": 58,
      "columns": [...],
      "indexes": [...]
    }
  }
}
```

### `export_schema` (ELIMINADA)

❌ Eliminada - No era útil para IAs. El SQL se puede obtener con `get_schema({ type: 'database', includeSQL: true })` si es realmente necesario.

---

## 📊 Tablas Registradas (v0.9.65)

| Tabla | Columnas | Descripción |
|-------|----------|-------------|
| `atoms` | 58 | Átomos del sistema |
| `files` | 7 | Metadatos por archivo |
| `atom_relations` | 8 | Grafo de dependencias |
| `system_files` | 18 | Archivos enriquecidos |
| `semantic_connections` | 8 | Conexiones semánticas |
| `cache_entries` | 5 | Cache en SQLite |
| `atom_versions` | 6 | Control de versiones |
| `atom_events` | 9 | Event sourcing |

**Total**: 8 tablas, 119 columnas

---

## 🔄 Flujo de Migración Automática

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Startup                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Ejecutar schema.sql base                           │
│  (Crea tablas principales si no existen)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Iterar sobre schema-registry                       │
│  - Crear tablas faltantes desde registry                    │
│  - Crear índices                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Detectar columnas faltantes                        │
│  - PRAGMA table_info por tabla                              │
│  - Comparar con registry                                    │
│  - Generar ALTER TABLE ADD COLUMN                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Drift Detection                                      │
│  - Advertir columnas extra en DB                            │
│  - Advertir tablas faltantes                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Ejecutar migraciones de datos                      │
│  (Solo si hay datos para migrar, no schema)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 ESM Cache Clearing

### Modos de Reinicio

| Modo | Comando | ESM Cache | Proceso | stdio |
|------|---------|-----------|---------|-------|
| **Proxy** | `npm run mcp` | ✅ Limpia | Nuevo | ✅ Vivo |
| **Standalone** | `node mcp-server-worker.js` | ❌ No limpia | Mismo | ✅ Vivo |

### Recomendación

**SIEMPRE** usar el proxy para desarrollo:
```bash
npm run mcp
```

Para reiniciar con cache limpio:
```javascript
restart_server({ clearCache: true, reanalyze: true })
```

Esto envía `process.send({ type: 'restart' })` al proxy, que:
1. Mata el worker actual
2. Spawna nuevo proceso Node.js (ESM cache vacío)
3. Mantiene conexión stdio con el IDE

---

## 📝 Archivos Modificados

### Nuevos Archivos
- `src/layer-c-memory/storage/database/schema-registry.js` - SSOT del schema
- `src/layer-c-memory/mcp/tools/get-schema-status.js` - Herramientas de schema

### Archivos Modificados
- `src/layer-c-memory/storage/database/connection.js` - Usa registry
- `src/layer-c-memory/migrations/index.js` - Solo migraciones de datos
- `src/layer-c-memory/mcp/tools/restart-server.js` - Docs ESM cache
- `src/layer-c-memory/mcp/tools/index.js` - Registra nuevas tools

---

## ✅ Testing

```bash
# Test schema-registry carga
node -e "import('./src/layer-c-memory/storage/database/schema-registry.js')
  .then(r => console.log('Tables:', r.getRegisteredTables().length))"

# Test connection carga con registry
node -e "import('./src/layer-c-memory/storage/database/connection.js')
  .then(() => console.log('Connection OK'))"

# Test tools cargan
node -e "import('./src/layer-c-memory/mcp/tools/index.js')
  .then(r => console.log('Tools:', r.toolDefinitions.length))"
```

**Output esperado**:
```
Tables: 8
Connection OK
Tools: 18
```

---

## 🎯 Próximos Pasos

1. **Eliminar schema.sql** → Migrar completamente a registry (v0.10.0)
2. **CLI para migraciones** → `omny db:migrate` comando
3. **Versionado de schema** → Tracking de versiones en system_metadata
4. **Auto-backup** → Backup automático antes de migraciones

---

## 📚 Referencias

- [Schema Registry API](../src/layer-c-memory/storage/database/schema-registry.js)
- [Connection Manager](../src/layer-c-memory/storage/database/connection.js)
- [Migrations](../src/layer-c-memory/migrations/index.js)
- [Get Schema Status Tool](../src/layer-c-memory/mcp/tools/get-schema-status.js)
