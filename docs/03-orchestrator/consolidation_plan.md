# Plan de Consolidación de Documentación

**Fecha**: 2026-02-12
**Objetivo**: Mover información valiosa a docs/architecture/orchestrator/

---

## Documentos a Consolidar

### 1. FLUJO_ACTUAL_SIMPLIFICADO.md → 01-FLUSO-VIDA-ARCHIVO.md
**Contenido valioso**:
- [x] Pipeline de 7 sistemas nuevos (temporal, type, error, performance)
- [x] Tests rápidos que se pueden hacer
- [x] Estructura de .omnysysdata/

**Acción**: Agregar sección "Sistemas de Extracción" y "Tests Rápidos"

---

### 2. INTEGRACION_COMPLETA_FLUJO.md → 01-FLUSO-VIDA-ARCHIVO.md
**Contenido valioso**:
- [x] Paso 4: Shadow Registry (ancestry)
- [x] Paso 5: Connection Enricher
- [x] Paso 7: Shadows (archivos borrados)

**Acción**: Agregar secciones sobre Shadow Registry y Connection Enricher

---

### 3. ANALISIS_CACHE_COMPLETO.md → 02-SISTEMA-CACHE.md
**Contenido valioso**:
- [x] Stakeholders (18 archivos afectados)
- [x] Estructura detallada de datos (RAM, índice, archivos)
- [x] Diagrama de desincronización multi-capas
- [x] Race conditions

**Acción**: Agregar sección "Stakeholders y Dependencias"

---

### 4. bugs/BUG_47_CACHE_DESYNC.md → 04-TROUBLESHOOTING.md + 05-CAMBIOS-RECIENTES.md
**Contenido valioso**:
- [x] Descripción del bug histórico
- [x] Causa raíz
- [x] Solución implementada
- [x] Tests de verificación

**Acción**: 
- Agregar a 04: Sección "Bug #47 - Cache Desync (Histórico)"
- Agregar a 05: Referencia al fix

---

### 5. HOT_RELOAD_DESIGN.md + HOT_RELOAD_USAGE.md → 03-ORCHESTRATOR-INTERNO.md
**Contenido valioso**:
- [x] Arquitectura de HotReloadManager
- [x] Módulos recargables vs críticos
- [x] Preservación de estado
- [x] Guía de uso

**Acción**: Agregar sección "Hot-Reload System"

---

### 6. MCP_PROBLEMS_ANALYSIS.md → 05-CAMBIOS-RECIENTES.md
**Contenido valioso**:
- [x] Historial de fixes anteriores
- [x] Import paths incorrectos (resueltos)
- [x] Timestamps en logs (resuelto)

**Acción**: Agregar sección "Historial de Fixes Anteriores"

---

## Documentos que NO se consolidan (mantener en lugar original)

- **DATA_FLOW/** - Roadmap futuro, mantener separado
- **architecture/DATA_FLOW.md** - Documentación completa del sistema Data Flow
- **SHADOW_REGISTRY.md** - Documentación completa del Shadow Registry
- **ARCHITECTURE_LAYER_A_B.md** - Arquitectura general
- **MCP_MAINTENANCE_GUIDE.md** - Guía de mantenimiento separada
- **TESTING_GUIDE.md** - Guía de testing general

---

## Proceso de Consolidación

1. **Paso 1**: Leer documento fuente
2. **Paso 2**: Extraer información relevante
3. **Paso 3**: Agregar a documento destino con referencia
4. **Paso 4**: Marcar documento fuente como "consolidado" en su header
5. **Paso 5**: Actualizar docs/INDEX.md si es necesario

---

## Estado

- [ ] FLUJO_ACTUAL_SIMPLIFICADO.md
- [ ] INTEGRACION_COMPLETA_FLUJO.md
- [ ] ANALISIS_CACHE_COMPLETO.md
- [ ] BUG_47_CACHE_DESYNC.md
- [ ] HOT_RELOAD_DESIGN.md + HOT_RELOAD_USAGE.md
- [ ] MCP_PROBLEMS_ANALYSIS.md
