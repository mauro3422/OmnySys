# Orchestrator & Data Flow Architecture

**Versión**: v0.7.1  
**Última actualización**: 2026-02-12  
**Estado**: Documentación consolidada post-fixes  

---

## 🎯 Propósito de esta Documentación

Esta carpeta contiene el **único punto de verdad** para entender:
1. Cómo fluyen los datos en OmnySys
2. Cómo funciona el orchestrator
3. Cómo interactúan los sistemas de caché
4. Cómo diagnosticar y arreglar problemas comunes

**Si hay un problema con el flujo de datos, empezar aquí.**

---

## 📚 Documentos Disponibles

### 🔰 Para Entender el Sistema

| Documento | Descripción | Cuándo leer |
|-----------|-------------|-------------|
| [01-FLujo-VIDA-ARCHIVO.md](./01-FLUSO-VIDA-ARCHIVO.md) | **Flujo completo**: Desde que tocas un archivo hasta que está disponible para las tools | Para entender el pipeline end-to-end |
| [02-SISTEMA-CACHE.md](./02-SISTEMA-CACHE.md) | **Los 4 cachés**: Qué hace cada uno, por qué existen, problemas conocidos | Cuando hay problemas de "datos viejos" o desincronización |
| [03-ORCHESTRATOR-INTERNO.md](./03-ORCHESTRATOR-INTERNO.md) | **Cómo funciona el orchestrator**: Colas, workers, decisión LLM | Para entender por qué algunos archivos van a LLM y otros no |

### 🔧 Para Diagnosticar Problemas

| Documento | Descripción | Cuándo leer |
|-----------|-------------|-------------|
| [04-TROUBLESHOOTING.md](./04-TROUBLESHOOTING.md) | **Problemas comunes y soluciones**: Cache desync, procesos zombie, etc. | Cuando algo no funciona |
| [05-CAMBIOS-RECENTES.md](./05-CAMBIOS-RECENTES.md) | **Historial de fixes**: Qué se arregló y cuándo | Para entender el estado actual del código |

---

## 🗺️ Mapa del Sistema (Resumen Visual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS OMNYSYS                             │
└─────────────────────────────────────────────────────────────────────────────┘

   USUARIO TOCA ARCHIVO
           │
           ▼
   ┌───────────────┐
   │ File Watcher  │ ←── Detecta cambio
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐     ┌─────────────────┐
   │ Cache         │────→│ Invalida cache  │ ←── Borra datos viejos
   │ Invalidator   │     │ del archivo     │
   └───────┬───────┘     └─────────────────┘
           │
           ▼
   ┌───────────────┐
   │ Layer A       │ ←── Análisis estático (regex, AST)
   │ (indexer.js)  │     • Exports, imports, funciones
   └───────┬───────┘     • Data flow, side effects
           │             • Guarda en .omnysysdata/
           ▼
   ┌───────────────┐
   │ Orchestrator  │ ←── Decide: ¿Necesita LLM?
   │ Decision      │     • 90% de archivos: BYPASS
   └───────┬───────┘     • 10% complejos: COLA LLM
           │
           ▼
   ┌───────────────┐     ┌─────────────────┐
   │ Analysis      │←────│ LLM Analyzer    │ ←── Solo para complejos
   │ Worker        │     │ (Layer B)       │     • God objects
   │ (cola)        │     │                 │     • Orphan modules
   └───────┬───────┘     └─────────────────┘     • Estado global
           │
           ▼
   ┌───────────────┐
   │ Storage       │ ←── Guarda en disco
   │ Manager       │     • .omnysysdata/files/
   └───────┬───────┘     • .omnysysdata/atoms/
           │             • index.json
           ▼
   ┌───────────────┐     ┌─────────────────┐
   │ Unified       │←────│ Cache           │ ←── INVALIDACIÓN
   │ Cache         │     │ Invalidator     │     (Fix reciente)
   │ Manager       │     │ (después de     │
   └───────────────┘     │ guardar)        │
                         └─────────────────┘

   MCP TOOLS consultan ←── getFileAnalysis()
   ↓                        (lee de disco o cache)
   RESPUESTA A CLAUDE/OPENCODE
```

---

## 🚨 Reglas de Oro (TL;DR)

1. **Layer A siempre primero**: Sin análisis estático, no hay decisión LLM
2. **LLM es lazy**: Solo se inicia si hay archivos con `confidence < 0.8`
3. **Cache se invalida después de guardar**: Worker → Guarda → Invalida cache
4. **SSOT en disco**: `.omnysysdata/` es la única verdad, cache es optimización
5. **Orchestrator limpia en shutdown**: Si no, quedan zombies (fix reciente)

---

## 🎯 Problemas Conocidos (Ya Arreglados)

| Problema | Estado | Fix en | Documentado en |
|----------|--------|--------|----------------|
| Cache desincronizado | ✅ Arreglado | `analysis-worker.js` | [05-CAMBIOS-RECENTES.md](./05-CAMBIOS-RECENTES.md) |
| Orchestrator zombie | ✅ Arreglado | `server-class.js` | [05-CAMBIOS-RECENTES.md](./05-CAMBIOS-RECENTES.md) |
| Hot-reload timeouts | ✅ Arreglado | `hot-reload-manager.js` | [05-CAMBIOS-RECENTES.md](./05-CAMBIOS-RECENTES.md) |
| 4 cachés duplicados | ⏳ Pendiente | - | [02-SISTEMA-CACHE.md](./02-SISTEMA-CACHE.md) |
| LLM temprano en pipeline | ⏳ Pendiente | - | [01-FLUSO-VIDA-ARCHIVO.md](./01-FLUSO-VIDA-ARCHIVO.md) |

---

## 📖 Documentación Relacionada

### Arquitectura General
| Documento | Descripción | Relación con Orchestrator |
|-----------|-------------|---------------------------|
| [DATA_FLOW.md](../DATA_FLOW.md) | Sistema Data Flow Fractal | Contexto del sistema de flujo de datos |
| [ARCHITECTURE_LAYER_A_B.md](../ARCHITECTURE_LAYER_A_B.md) | Capas A (Static) y B (LLM) | Cómo funcionan las capas que el orchestrator coordina |
| [HYBRID_ANALYSIS_PIPELINE.md](../HYBRID_ANALYSIS_PIPELINE.md) | Pipeline de 6 fases (static → AI) | Estrategia 80/20 que usa el orchestrator |
| [ARCHETYPE_SYSTEM.md](../ARCHETYPE_SYSTEM.md) | Sistema de arquetipos | Cómo se decide si un archivo necesita LLM (confidence-based) |
| [SHADOW_REGISTRY.md](../SHADOW_REGISTRY.md) | Sistema de linaje | Metadata evolutiva que el orchestrator mantiene |
| [CORE_PRINCIPLES.md](../CORE_PRINCIPLES.md) | Los 4 pilares | Principios que guían el diseño |

### Guías de Uso
| Documento | Descripción |
|-----------|-------------|
| [TOOLS_GUIDE.md](../../guides/TOOLS_GUIDE.md) | Cómo usar las 14 herramientas MCP |
| [HOT_RELOAD_USAGE.md](../../HOT_RELOAD_USAGE.md) | Sistema de hot-reload para desarrollo |

### Historial de Problemas
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [MCP_PROBLEMS_ANALYSIS.md](../../MCP_PROBLEMS_ANALYSIS.md) | Análisis completo de problemas | ⚠️ Histórico - ver [05-CAMBIOS-RECIENTES.md](./05-CAMBIOS-RECIENTES.md) para fixes aplicados |
| [ANALISIS_CACHE_COMPLETO.md](../../ANALISIS_CACHE_COMPLETO.md) | Análisis detallado de los 4 cachés | ℹ️ Referencia técnica |

---

**Nota para mantenedores**: Si modificas el flujo de datos, actualizar estos documentos. El próximo desarrollador (o yo mismo en 3 meses) te lo agradecerá.
