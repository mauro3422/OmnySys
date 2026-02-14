# Flujo MCP Corregido v0.9.1

**Fecha**: 2026-02-13  
**Estado**: ✅ **CORREGIDO**

---

## 🐛 Bugs Encontrados y Corregidos

### Bug #1: LLM Iniciado Antes de Layer A (CRÍTICO)
**Problema**: LLM se iniciaba en Step 2, esperando 10-30s, antes de saber si se necesitaba.

**Impacto**: Inicio lento innecesario, recursos desperdiciados.

**Solución**: 
- Mover `LLMSetupStep` a Step 4 (después de cache, antes de orchestrator)
- Iniciar LLM en **background** (non-blocking)
- El Orchestrator conectará cuando el LLM esté listo

### Bug #2: Cache Duplicado (CRÍTICO)
**Problema**: 
- `CacheInitStep` creaba `server.cache`
- `Orchestrator.initialize()` creaba `this.cache` (segunda instancia)

**Impacto**: Dos caches independientes = inconsistencia de datos.

**Solución**: 
- Pasar `server.cache` al Orchestrator vía opción `cache: server.cache`
- Orchestrator usa cache externo si se proporciona

### Bug #3: FileWatcher sin Cache preparado (MEDIO)
**Problema**: Orchestrator iniciaba FileWatcher antes de que cache tuviera datos.

**Solución**: `CacheInitStep` (Step 2) corre antes de `OrchestratorInitStep` (Step 5).

---

## ✅ Flujo Corregido (v0.9.1)

```
┌─────────────────────────────────────────────────────────────────┐
│  MCP SERVER INITIALIZATION PIPELINE (CORRECT ORDER)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 0: InstanceDetectionStep                                   │
│  ├── Detecta si hay otra instancia PRIMARY corriendo            │
│  ├── Si existe: Modo LIGHT (skip pasos pesados)                 │
│  └── Si no: Modo PRIMARY (health beacon en puerto 9998)         │
│                                                                  │
│  Step 1: LayerAAnalysisStep                                      │
│  ├── Análisis estático de TODO el proyecto                      │
│  ├── Crea archivos en .omnysysdata/                             │
│  ├── Extrae átomos, moléculas, arquetipos                       │
│  └── Determina qué archivos PUEDEN necesitar LLM                │
│                                                                  │
│  Step 2: CacheInitStep                                           │
│  ├── Crea UnifiedCacheManager en server.cache                   │
│  ├── Carga metadata del proyecto                                │
│  ├── Carga conexiones entre archivos                            │
│  ├── Carga risk assessment                                      │
│  └── Cache listo para ser compartido                            │
│                                                                  │
│  Step 3: LLMSetupStep                                            │
│  ├── Inicia LLM server en BACKGROUND (no bloqueante)            │
│  ├── NO espera health check (continúa inmediatamente)           │
│  └── El Orchestrator conectará cuando esté listo                │
│                                                                  │
│  Step 4: OrchestratorInitStep                                    │
│  ├── Crea Orchestrator con server.cache (compartido)            │
│  ├── Inicializa FileWatcher (usa cache compartido)              │
│  ├── Inicializa AnalysisWorker                                  │
│  ├── Inicializa BatchProcessor                                  │
│  ├── Intenta conectar a LLM (reintentará si no está listo)      │
│  └── Orchestrator listo para procesar cambios                   │
│                                                                  │
│  Step 5: McpSetupStep                                            │
│  ├── Crea servidor MCP (SDK oficial)                            │
│  ├── Registra 16 herramientas MCP                               │
│  ├── Configura handlers para ListTools/CallTool                 │
│  └── Servidor listo para recibir llamadas                       │
│                                                                  │
│  Step 6: ReadyStep                                               │
│  └── Servidor listo y respondiendo                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparación: Antes vs Después

### Orden Anterior (BUG)
```
1. InstanceDetectionStep  ✅
2. LLMSetupStep           🔴 Iniciaba LLM (bloqueante 10-30s)
3. LayerAAnalysisStep     🔴 Analizaba archivos
4. OrchestratorInitStep   🔴 Cache duplicado
5. CacheInitStep          🔴 Cache no usado
6. McpSetupStep           ⚠️
7. ReadyStep              ⚠️
```

### Orden Nuevo (CORRECTO)
```
1. InstanceDetectionStep  ✅
2. LayerAAnalysisStep     ✅ Análisis estático PRIMERO
3. CacheInitStep          ✅ Cache con datos
4. LLMSetupStep           ✅ LLM en background (no bloquea)
5. OrchestratorInitStep   ✅ Conecta cuando esté listo
6. McpSetupStep           ✅
7. ReadyStep              ✅
```

---

## 🔧 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `server-class.js` | Pipeline: LayerA → Cache → LLM(bg) → Orchestrator |
| `llm-setup-step.js` | Step 3, inicia LLM en background (non-blocking) |
| `layer-a-analysis-step.js` | Step 1 |
| `cache-init-step.js` | Step 2 |
| `orchestrator-init-step.js` | Step 4, usa cache compartido |
| `lifecycle.js` | Usa cache externo si se proporciona |
| `01-flujo-vida-archivo.md` | Bug #1 marcado como resuelto |
| `03-orchestrator-interno.md` | Comentarios actualizados |

---

## 🎯 Beneficios del Fix

1. **Inicio rápido**: LLM no bloquea, servidor inicia inmediatamente
2. **Sin cache duplicado**: Memoria ahorrada, consistencia garantizada
3. **FileWatcher preparado**: Tiene cache listo al iniciar
4. **LLM background**: Se inicia en paralelo mientras el servidor se inicializa
5. **Mejor arquitectura**: Cada componente tiene su responsabilidad clara

---

## 🧪 Testing del Flujo

```bash
# Test 1: Inicio rápido (LLM en background)
node src/layer-c-memory/mcp-server.js ./test-simple
# Debería iniciar inmediatamente, LLM arranca en segundo plano

# Test 2: Verificar cache compartido
curl http://localhost:9998/health
# Debería mostrar modo PRIMARY

# Test 3: Verificar que LLM está disponible después de unos segundos
# Las tools que necesiten LLM funcionarán cuando esté listo
```

---

**Flujo MCP corregido y optimizado. Todos los bugs resueltos.**
