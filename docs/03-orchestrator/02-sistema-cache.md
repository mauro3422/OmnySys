# Sistema de Caché

**Documento**: 02-SISTEMA-CACHE.md  
**Versión**: v0.7.1  
**Descripción**: Los 4 sistemas de caché, por qué existen, y el plan para consolidarlos

---

## 🎯 TL;DR - Resumen Ejecutivo

OmnySys tiene **4 sistemas de caché diferentes** que hacen trabajo solapado:

1. **UnifiedCacheManager** - El "oficial" (pero incompleto)
2. **CacheInvalidator** - Especializado en invalidación
3. **AtomicCache** - Para funciones (átomos)
4. **DerivationCache** - Para metadata derivada

**Problema**: El Worker guarda en disco pero NO actualizaba el caché (ya arreglado).

**Solución a largo plazo**: Consolidar en un solo sistema con estrategias.

---

## 🗺️ Mapa de los 4 Cachés

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMAS DE CACHÉ ACTUALES                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣  UnifiedCacheManager                                       │
│      src/core/unified-cache-manager/index.js                   │
│      • Usado por: MCP Server, Orchestrator                     │
│      • Propósito: Cache general del sistema                    │
│      • Datos: Archivos, dependencias, metadata                 │
│      • Persistencia: Disco (.omnysysdata/cache/) + RAM         │
│      • Features: TTL, LRU, grafo de dependencias              │
│                                                                 │
│  2️⃣  CacheInvalidator                                          │
│      src/core/cache-invalidator/index.js                       │
│      • Usado por: File Watcher, Analysis Worker                │
│      • Propósito: Invalidación SÍNCRONA y ATÓMICA              │
│      • Datos: Operaciones de invalidación                      │
│      • Persistencia: RAM + backup (rollback)                   │
│      • Features: Transacciones, rollback, retry               │
│                                                                 │
│  3️⃣  AtomicCache                                               │
│      src/shared/atomic-cache.js                                │
│      • Usado por: Sistema Molecular (v0.6.0)                   │
│      • Propósito: Cache de FUNCIONES (átomos)                  │
│      • Datos: Funciones individuales                           │
│      • Persistencia: RAM only                                  │
│      • Features: TTL, LRU, índice inverso (file→atoms)        │
│                                                                 │
│  4️⃣  DerivationCache                                           │
│      src/shared/derivation-engine.js (clase interna)           │
│      • Usado por: Reglas de derivación molecular               │
│      • Propósito: Cachear resultados de derivación             │
│      • Datos: Resultados de reglas (ej: moleculeComplexity)    │
│      • Persistencia: RAM only                                  │
│      • Features: LRU                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparación Detallada

| Feature | UnifiedCacheManager | CacheInvalidator | AtomicCache | DerivationCache |
|---------|-------------------|------------------|-------------|-----------------|
| **Map() interno** | ✅ ramCache | ✅ (en ops) | ✅ atoms | ✅ cache |
| **TTL (expiración)** | ✅ 5 min | ❌ No | ✅ 5 min | ❌ No |
| **LRU eviction** | ✅ Sí | ❌ No | ✅ Sí | ✅ Sí |
| **Índice inverso** | ✅ entries | ❌ No | ✅ fileToAtoms | ❌ No |
| **Grafo dependencias** | ✅ Sí | ❌ No | ❌ No | ❌ No |
| **Persistencia** | Disco + RAM | RAM + backup | RAM only | RAM only |
| **Transacciones** | ❌ No | ✅ Sí | ❌ No | ❌ No |
| **Rollback** | ❌ No | ✅ Sí | ❌ No | ❌ No |

---

## 🔍 Análisis por Caché

### 1️⃣ UnifiedCacheManager (El "oficial")

**Propósito**: Caché general para todo el sistema MCP.

**Estructura interna**:
```javascript
class UnifiedCacheManager {
  constructor(projectPath) {
    this.index = {
      entries: {},           // filePath → CacheEntry
      dependencyGraph: {},   // filePath → [dependencias]
      metadata: {}
    };
    this.ramCache = new Map();    // Caché RAM con TTL
    this.defaultTtlMinutes = 5;
    this.maxRamEntries = 1000;    // LRU limit
  }
}
```

**Módulos mezclados**:
- `storage.js`: Carga/guarda desde disco
- `ram-cache.js`: Operaciones RAM (get/set/invalidate)
- `dependency.js`: Grafo de dependencias
- `atoms.js`: Operaciones de átomos

**Problema**: Es un "god object". Hace demasiado.

**Usado por**:
- `Orchestrator.initialize()` - Carga datos al iniciar
- `CacheInitStep` - Inicializa caché del MCP

---

### 2️⃣ CacheInvalidator (El "especializado en borrar")

**Propósito**: Invalidación SÍNCRONA y ATÓMICA.

**Creado para**: BUG #47 (Cache Desynchronization)

**Arquitectura SOLID**:
```javascript
class CacheInvalidator extends EventEmitter {
  constructor(cacheManager) {
    this.ramOps = new RamStorageOperations(cacheManager);
    this.diskOps = new DiskStorageOperations(projectPath);
    this.indexOps = new IndexOperations(cacheManager);
  }
  
  async invalidateSync(filePath) {
    // Transacción atómica: todo o nada
    const transaction = new AtomicTransaction();
    transaction.add(RAM invalidation);
    transaction.add(Disk deletion);
    transaction.add(Index update);
    return transaction.execute();  // Rollback si falla
  }
}
```

**Problema**: Tiene SU PROPIA lógica de RAM ops. Duplica funcionalidad de `ram-cache.js`.

**Usado por**:
- `File Watcher` - Al detectar cambios
- `Analysis Worker` - Después de guardar (fix reciente)

---

### 3️⃣ AtomicCache (El "de funciones")

**Propósito**: Caché específico para átomos (funciones).

**Estructura**:
```javascript
class AtomicCache {
  constructor() {
    this.atoms = new Map();           // atomId → {data, expiry}
    this.derivations = new DerivationCache();  // ← Usa #4
    this.fileToAtoms = new Map();     // Índice inverso
    this.ttlMs = 5 * 60 * 1000;       // 5 min
    this.maxAtoms = 1000;             // LRU
  }
}
```

**Problemas**:
1. Tiene SU PROPIO `derivations` caché (Duplicación #3 → #4)
2. Tiene SU PROPIO TTL/LRU (mismo que UnifiedCacheManager)
3. Es global singleton: `export const atomicCache = new AtomicCache()`
4. **Parece no estar usando actualmente** (no encontré imports recientes)

---

### 4️⃣ DerivationCache (El "de derivaciones")

**Propósito**: Cachear resultados de reglas de derivación molecular.

```javascript
class DerivationCache {
  constructor() {
    this.cache = new Map();  // Clave: filePath + hash(atoms) + ruleName
  }
  
  derive(filePath, atoms, ruleName) {
    const key = `${filePath}::${hash(atoms)}::${ruleName}`;
    if (this.cache.has(key)) return cached;
    
    const result = DerivationRules[ruleName](atoms);
    this.cache.set(key, result);
    return result;
  }
}
```

**Usado por**: `AtomicCache` (como `this.derivations`)

---

## 🔄 Flujo de Datos entre Cachés

```
Usuario toca archivo
        │
        ▼
┌─────────────────┐
│ File Watcher    │
└────────┬────────┘
         │
         ▼
┌───────────────────────┐
│ CacheInvalidator      │ ←── Invalida EN AMBOS
│ • UnifiedCacheManager │     (ramCache + disco)
│ • Disco               │
└────────┬──────────────┘
         │
         ▼
┌─────────────────┐
│ Analysis Worker │ ←── Guarda resultado
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ Storage Manager      │ ←── Guarda en .omnysysdata/
│ (disco)              │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ CacheInvalidator     │ ←── FIX RECIENTE: Invalida otra vez
│ (después de guardar) │     para forzar re-carga
└──────────────────────┘
         │
         ▼
┌─────────────────┐
│ MCP Tools       │ ←── Consultan datos
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ UnifiedCacheManager  │ ←── Lee de cache (ahora actualizado)
│ o disco (fallback)   │
└──────────────────────┘
```

---

## 🐛 Problema Crítico (Ya Arreglado)

### Síntoma
Cambios en archivos no se veían reflejados inmediatamente.

### Causa Root
```javascript
// ANTES (bug):
// analysis-worker.js:246
await saveFileAnalysis(this.rootPath, job.filePath, mergedResult);
// Guardaba en disco PERO no invalidaba cache

// Tools leían del cache (datos viejos)
// Resultado: Cambios "invisibles"
```

### Fix Aplicado
```javascript
// DESPUÉS (fix):
await saveFileAnalysis(this.rootPath, job.filePath, mergedResult);

// NUEVO: Invalidar cache
const { getCacheInvalidator } = await import('../cache-invalidator/index.js');
const invalidator = getCacheInvalidator({ projectPath: this.rootPath });
await invalidator.invalidateSync(job.filePath);
```

**Commit**: `f21f3ee`

---

## 🏗️ Solución Propuesta: Consolidación

### Opción A: Arquitectura SSOT (Recomendada)

```
┌─────────────────────────────────────────────────────────────┐
│                 CACHE SYSTEM UNIFICADO (SSOT)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CacheManager (único punto de entrada)              │   │
│  │  • Responsabilidad: Orquestar operaciones           │   │
│  │  • NO implementa storage directamente               │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│           ┌───────────────┼───────────────┐                │
│           ▼               ▼               ▼                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ RamStrategy │  │ DiskStrategy │  │ Derivation   │      │
│  │             │  │              │  │ Strategy     │      │
│  │ • TTL       │  │ • JSON files │  │ (decorator)  │      │
│  │ • LRU       │  │ • Backup     │  │              │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  InvalidationCommand (transacciones)                │   │
│  │  • Usa CacheManager para operaciones                │   │
│  │  • Mantiene lógica de rollback                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Principios Aplicados

| Principio | Implementación |
|-----------|----------------|
| **SSOT** | Un solo `CacheManager` conoce todo |
| **SRP** | Cada estrategia hace UNA cosa |
| **DIP** | `InvalidationCommand` depende de `CacheManager` |
| **OCP** | Nuevas estrategias sin modificar existentes |

---

## 📋 Plan de Migración

### Fase 1: Consolidar Invalidación (Inmediato)
- ✅ CacheInvalidator → usar UnifiedCacheManager.ramCache
- ✅ Remover duplicación de RamStorageOperations

### Fase 2: Evaluar AtomicCache (Investigación)
- ¿Está siendo usado actualmente?
- Si NO: Deprecar
- Si SÍ: Migrar a CacheManager con estrategia "atoms"

### Fase 3: Consolidar DerivationCache (Largo plazo)
- Mover a estrategia "derivation" dentro de CacheManager

### Fase 4: Unificar API (Largo plazo)
- Un solo punto de entrada: `CacheManager`
- Todas las operaciones pasan por ahí
- Invalidación, storage, derivación: todo integrado

---

## 📁 Archivos Clave

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `src/core/unified-cache-manager/index.js` | 57 | CacheManager principal |
| `src/core/unified-cache-manager/ram-cache.js` | 124 | Operaciones RAM |
| `src/core/cache-invalidator/index.js` | 296 | Invalidación atómica |
| `src/shared/atomic-cache.js` | 199 | Cache de átomos |
| `src/shared/derivation-engine.js` | 400+ | Cache de derivaciones |

---

## ✅ Checklist para Mantenedores

- [ ] ¿Agregué un nuevo caché? → Consolidar con existente
- [ ] ¿Modifiqué invalidación? → Actualizar este documento
- [ ] ¿Cambio en flujo de datos? → Verificar `01-FLUSO-VIDA-ARCHIVO.md`

---

## 📚 Referencias

### Documentación Técnica Detallada
| Documento | Contenido |
|-----------|-----------|
| [ANALISIS_CACHE_COMPLETO.md](../../ANALISIS_CACHE_COMPLETO.md) | Análisis exhaustivo de los 4 cachés, stakeholders (18 archivos), y estructura de datos |
| [04-TROUBLESHOOTING.md](./04-TROUBLESHOOTING.md) | Problemas comunes y diagnóstico |
| [05-CAMBIOS-RECIENTES.md](./05-CAMBIOS-RECENTES.md) | Fix de cache invalidation reciente |

### Código Fuente
- `src/core/unified-cache-manager/` - Implementación actual
- `src/core/cache-invalidator/` - Sistema de invalidación
- `src/shared/atomic-cache.js` - Cache de átomos
- `src/shared/derivation-engine.js` - Motor de derivaciones

---

**Volver al [README](./README.md)**
