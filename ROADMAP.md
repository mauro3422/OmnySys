# CogniSystem - Roadmap de Desarrollo

**Versión actual**: v0.4.5 - MCP Unified Entry Point ✅  
**Última actualización**: 2026-02-03

---

## Filosofía de Desarrollo

**Enfoque incremental**: Construir y validar cada capa antes de pasar a la siguiente. Evitar el "big bang" que puede generar frustración si no funciona de inmediato.

**Principio**: "Funciona en sintético antes de tocar código real"

---

## Estado Actual (v0.4.5)

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ COMPLETADO - MCP Unified Entry Point                    │
│                                                             │
│  Un solo comando inicia todo el sistema:                   │
│  node src/layer-c-memory/mcp-server.js /proyecto           │
│                                                             │
│  • Orchestrator (cola + worker + file watcher)             │
│  • Indexación automática en background                     │
│  • Tools MCP listas para usar                              │
│  • Auto-análisis cuando archivo no existe                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Fases Completadas

### ✅ FASE 0: Preparación y Documentación

**Estado**: Completada

- [x] README.md con análisis del problema
- [x] ROADMAP.md con plan de desarrollo
- [x] ARCHITECTURE.md con diseño técnico
- [x] docs/ con análisis detallado
- [x] Estructura de carpetas del proyecto
- [x] Changelog modular por versión

---

### ✅ FASE 1: Capa A - Análisis Estático

**Estado**: Completada (95%)

**Entregables**:
- [x] Parser de código (JS/TS) con Babel AST
- [x] Extracción de imports/exports/definiciones
- [x] Constructor de grafo de dependencias
- [x] `system-map.json` con grafo completo
- [x] 15+ casos de prueba sintéticos
- [x] Detección de patrones (shared state, eventos, side effects)
- [x] Risk scorer basado en reglas
- [x] Análisis de calidad (unused exports, circular deps, etc.)

**Ubicación**: `src/layer-a-static/`

---

### ✅ FASE 2: Integración MCP Básica

**Estado**: Completada (90%)

**Entregables**:
- [x] Servidor MCP con tools
- [x] `get_impact_map()` - Mapa de impacto
- [x] `analyze_change()` - Análisis de cambios
- [x] `explain_connection()` - Explicar conexiones
- [x] `get_risk_assessment()` - Evaluación de riesgos
- [x] `search_files()` - Búsqueda de archivos
- [x] Query service eficiente
- [x] Storage particionado en `.OmnySystemData/`

**Ubicación**: `src/layer-c-memory/`

---

### ✅ FASE 3: Capa B - Análisis Semántico

**Estado**: Completada (85%)

**Entregables**:
- [x] Schema de datos para semantic layer
- [x] Detección estática de conexiones semánticas
  - [x] Shared state detector (`window.*`, `global.*`)
  - [x] Event pattern detector (emitters/listeners)
  - [x] Side effects detector
- [x] Análisis con IA local (Qwen2.5-Coder)
- [x] Validación de respuestas LLM (JSON schemas)
- [x] Scoring híbrido (estático + IA)
- [x] `enhanced-system-map.json` con datos enriquecidos
- [x] Conexiones CSS-in-JS, TypeScript, Redux/Context

**Ubicación**: `src/layer-b-semantic/`

---

### ✅ FASE 4: Orchestrator y Procesamiento

**Estado**: Completada (90%)

**Entregables**:
- [x] AnalysisQueue con prioridades (CRITICAL > HIGH > MEDIUM > LOW)
- [x] AnalysisWorker para procesar con LLM
- [x] FileWatcher para cambios en tiempo real
- [x] BatchProcessor para agrupar cambios
- [x] StateManager para persistencia atómica
- [x] WebSocket para notificaciones en tiempo real
- [x] Interrupción de trabajos de menor prioridad
- [x] Rollback de caché en caso de error

**Ubicación**: `src/core/`

---

### ✅ FASE 5: Unified Entry Point (v0.4.5)

**Estado**: Completada (95%)

**Entregables**:
- [x] MCP Server como entry point único
- [x] Orchestrator como componente interno
- [x] Auto-indexación en startup (si no hay datos)
- [x] Tools con auto-análisis (encola CRITICAL si falta)
- [x] Cache unificado (v0.4.4)
- [x] UnifiedCacheManager con invalidación en cascada
- [x] Documentación de tools MCP

**Ubicación**: `src/layer-c-memory/mcp-server.js`

---

## Fases en Progreso / Próximas

### 🏗️ FASE 6: Beta Testing y Robustez

**Objetivo**: Preparar el sistema para uso real en proyectos

**Duración estimada**: 2-4 semanas

**Tareas**:
- [ ] Testing en proyectos reales (3-5 proyectos open source)
- [ ] Benchmark de performance (tiempo de análisis vs tamaño del proyecto)
- [ ] Manejo de errores graceful (qué pasa si LLM no responde)
- [ ] Métricas de uso (qué tools se usan más)
- [ ] Documentación de troubleshooting
- [ ] Guía de instalación simplificada

**Casos de prueba objetivo**:
```
Proyectos para testear:
1. React component library (50-100 archivos)
2. Node.js API (100-200 archivos)
3. Vue/Nuxt app (150-300 archivos)
4. Proyecto propio del usuario
```

---

### ⏭️ FASE 7: Protocolo MCP Real

**Objetivo**: Implementar el protocolo MCP estándar para integración nativa con Claude Desktop

**Tareas**:
- [ ] Implementar MCP SDK (@anthropic-ai/mcp)
- [ ] Configuración via `claude_desktop_config.json`
- [ ] Stdio transport para comunicación con Claude
- [ ] Tool definitions dinámicas
- [ ] Schema validation de requests/responses

**Configuración objetivo**:
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "cognisystem": {
      "command": "node",
      "args": [
        "/path/to/cognisystem/src/layer-c-memory/mcp-server.js",
        "/path/to/user/project"
      ]
    }
  }
}
```

---

### ⏭️ FASE 8: VS Code Extension

**Objetivo**: Extensión oficial de VS Code para visualización gráfica

**Tareas**:
- [ ] Graph view interactivo (dependencias entre archivos)
- [ ] Panel de "Impact Preview" antes de guardar
- [ ] Decoraciones en el editor (warnings de alto riesgo)
- [ ] Status bar con estado del sistema
- [ ] Comandos: "Analyze Current File", "Show Impact Map", etc.

**Ubicación**: `cognisystem-vscode/` (ya iniciado)

---

### ⏭️ FASE 9: Optimización de Performance

**Objetivo**: Soportar proyectos grandes (1000+ archivos)

**Tareas**:
- [ ] Análisis incremental (solo archivos cambiados)
- [ ] Lazy loading de datos del grafo
- [ ] Caché de análisis por función (no solo por archivo)
- [ ] Workers paralelos para análisis
- [ ] Optimización de queries (índices en SQLite)

**Métricas objetivo**:
| Tamaño del Proyecto | Tiempo de Indexación | Query Time |
|---------------------|---------------------|------------|
| 100 archivos | < 30 segundos | < 100ms |
| 500 archivos | < 3 minutos | < 200ms |
| 1000 archivos | < 10 minutos | < 500ms |

---

### ⏭️ FASE 10: Features Avanzadas

**Objetivo**: Expandir capacidades del sistema

**Tareas**:
- [ ] Soporte multi-lenguaje (Python, Go, Rust)
- [ ] Análisis de tests (qué tests correr tras cambio)
- [ ] Sugerencias de refactoring automáticas
- [ ] Detección de dead code avanzada
- [ ] Integración con CI/CD (fallar build si riesgo crítico)
- [ ] Historial de cambios (quién modificó qué y cuándo)

---

## Métricas de Progreso

### Por Componente

| Componente | Estado | Líneas de Código | Test Coverage |
|------------|--------|-----------------|---------------|
| Capa A (Static) | 95% ✅ | ~3,500 | 70% |
| Capa B (Semantic) | 85% ✅ | ~2,800 | 60% |
| Capa C (Memory) | 90% ✅ | ~1,500 | 50% |
| Orchestrator | 90% ✅ | ~1,200 | 40% |
| MCP Tools | 95% ✅ | ~800 | 30% |
| Cache System | 95% ✅ | ~600 | 50% |
| **TOTAL** | **90%** | **~10,400** | **50%** |

### Por Funcionalidad

| Feature | Status | Notas |
|---------|--------|-------|
| Análisis estático | ✅ Completo | 15+ detectores |
| Análisis semántico | ✅ Completo | Híbrido: estático + IA |
| Cola de prioridad | ✅ Completo | CRITICAL > HIGH > MEDIUM > LOW |
| File watching | ✅ Completo | Detección en tiempo real |
| Auto-indexación | ✅ Completo | Background, no bloqueante |
| Tools MCP | ✅ Completo | 6 tools disponibles |
| VS Code Bridge | 🏗️ WIP | Puerto 9998 |
| MCP Protocol | ⏭️ Planned | Integración con Claude Desktop |
| Multi-lenguaje | ⏭️ Planned | Python, Go, Rust |

---

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para historial detallado.

**Últimas versiones**:
- v0.4.5: MCP Unified Entry Point (current)
- v0.4.4: Unified Cache System
- v0.4.3: Bug fixes y estabilidad
- v0.4.2: Context optimization
- v0.4.0: Semantic enrichment con IA

---

## Contribuciones

¿Quieres contribuir? Áreas donde necesitamos ayuda:

1. **Testing**: Probar el sistema en proyectos reales
2. **Documentación**: Tutoriales, guías de uso
3. **Performance**: Optimización para proyectos grandes
4. **Lenguajes**: Soporte para Python, Go, Rust
5. **UI/UX**: Mejorar visualización de dependencias

---

## Referencias

- [README.md](README.md) - Overview del proyecto
- [ARCHITECTURE.md](ARCHITECTURE.md) - Diseño técnico
- [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) - Documentación de tools
- [changelog/](changelog/) - Historial de versiones
