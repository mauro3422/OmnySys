# Sistema de Hot-Reload para OmnySys MCP Server

## 🎯 Objetivo
Permitir que el servidor OmnySys se actualice automáticamente cuando su propio código cambie, sin perder:
- Cache de archivos analizados
- Estado del orquestador
- Datos del proyecto

## 🏗️ Diseño

### Componentes

```
HotReloadManager
├── fileWatcher (monitorea cambios en src/)
├── moduleRegistry (tracking de módulos cargados)
├── statePreserver (guarda/recupera estado)
└── reloadCoordinator (orquesta el reload)
```

### Flujo de Hot-Reload

1. **Detección**: FileWatcher detecta cambio en archivo del sistema
2. **Clasificación**: Determina qué tipo de módulo cambió
3. **Preservación**: Guarda estado crítico
4. **Invalidación**: Limpia caché de módulos de Node.js
5. **Recarga**: Importa dinámicamente el módulo nuevo
6. **Restauración**: Recupera el estado preservado
7. **Re-registro**: Actualiza handlers/tools si es necesario

### Módulos Recargables vs Estado

**Recargables (sin estado propio)**:
- ✅ Tools (14 herramientas MCP)
- ✅ Extractores de código
- ✅ Handlers de eventos
- ✅ Queries y APIs

**Estado crítico (a preservar)**:
- 🔴 Cache de archivos analizados (this.cache)
- 🔴 Cola del orquestador (this.orchestrator.queue)
- 🔴 Estado de indexing (this.orchestrator.isIndexing)
- 🔴 File hashes (this.orchestrator.fileWatcher.fileHashes)

## 📋 Implementación

### 1. HotReloadManager

```javascript
class HotReloadManager {
  constructor(server) {
    this.server = server;
    this.watchedModules = new Map();
    this.fsWatcher = null;
  }

  async start() {
    // Monitorear cambios en src/layer-c-memory/mcp/
    this.fsWatcher = watch('./src/layer-c-memory/mcp', { recursive: true }, 
      (eventType, filename) => {
        if (filename.endsWith('.js')) {
          this.handleFileChange(filename);
        }
      }
    );
  }

  async handleFileChange(filePath) {
    const moduleType = this.classifyModule(filePath);
    
    switch (moduleType) {
      case 'tool':
        await this.reloadTool(filePath);
        break;
      case 'extractor':
        await this.reloadExtractor(filePath);
        break;
      case 'handler':
        await this.reloadHandler(filePath);
        break;
      case 'critical':
        logger.warn('Critical module changed, manual restart required');
        break;
    }
  }

  classifyModule(filePath) {
    if (filePath.includes('/tools/')) return 'tool';
    if (filePath.includes('/extractor')) return 'extractor';
    if (filePath.includes('/handler')) return 'handler';
    if (filePath.includes('server-class.js')) return 'critical';
    return 'other';
  }

  async reloadTool(filePath) {
    // 1. Preservar estado
    const toolState = this.captureToolState();
    
    // 2. Invalidar caché de Node.js
    const modulePath = path.resolve(filePath);
    delete require.cache[modulePath];
    
    // 3. Recargar módulo
    const newModule = await import(`${filePath}?update=${Date.now()}`);
    
    // 4. Re-registrar tool en MCP server
    this.server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [...existingTools, newModule.toolDefinition]
    }));
    
    // 5. Restaurar estado
    this.restoreToolState(toolState);
    
    logger.info(`🔥 Hot-reloaded: ${filePath}`);
  }

  captureToolState() {
    return {
      cache: this.server.cache.export(),
      orchestratorQueue: this.server.orchestrator.queue.export(),
      fileHashes: new Map(this.server.orchestrator.fileWatcher?.fileHashes)
    };
  }

  restoreToolState(state) {
    this.server.cache.import(state.cache);
    this.server.orchestrator.queue.import(state.orchestratorQueue);
    if (this.server.orchestrator.fileWatcher) {
      this.server.orchestrator.fileWatcher.fileHashes = state.fileHashes;
    }
  }
}
```

### 2. Integración con Server Class

```javascript
// En server-class.js
export class OmnySysMCPServer {
  constructor(projectPath) {
    // ... existing code ...
    
    // Hot-reload manager (auto-mejoramiento)
    this.hotReloadManager = null;
  }

  async initialize() {
    // ... existing initialization ...
    
    // Iniciar hot-reload si estamos en modo desarrollo
    if (process.env.OMNYSYS_HOT_RELOAD === 'true') {
      this.hotReloadManager = new HotReloadManager(this);
      await this.hotReloadManager.start();
      logger.info('🔥 Hot-reload enabled');
    }
  }
}
```

### 3. Invalidación de Caché de Node.js

```javascript
function invalidateModuleCache(modulePath) {
  // ESM no tiene require.cache, usamos query string único
  return `${modulePath}?update=${Date.now()}`;
}
```

## ⚠️ Precauciones

1. **Estado consistente**: Siempre preservar antes de recargar
2. **Transacciones**: Si falla el reload, mantener versión anterior
3. **Módulos críticos**: server-class.js requiere reinicio manual
4. **Dependencias**: Recargar módulos en orden correcto (dependientes primero)

## 🔄 Proceso Completo

```
Cambio detectado en tools/impact-map.js
├─→ Preservar: cache, queue, fileHashes
├─→ Invalidar: caché de impact-map.js
├─→ Recargar: import('./tools/impact-map.js?update=123456')
├─→ Actualizar: registro en MCP server
├─→ Restaurar: cache, queue, fileHashes
└─→ Listo: Nuevo código activo sin perder estado
```

## 🎉 Beneficios

1. **Desarrollo iterativo**: Cambios inmediatos sin reiniciar
2. **Automejora**: El sistema se puede modificar a sí mismo
3. **Zero downtime**: Actualizaciones transparentes
4. **Debugging rápido**: Probar cambios al instante
