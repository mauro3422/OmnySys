# Watcher Guard Standardization Guide

El sistema de guardias de OmnySys permite ejecutar validaciones automáticas tras la modificación o creación de archivos. Los guardias se clasifican en dos tipos según su momento de ejecución.

## Tipos de Guardias

### 1. Semantic Guards
Se ejecutan inmediatamente después de la extracción atómica. Tienen acceso a los átomos recién procesados.
- **Cuándo se ejecutan**: Durante `analyzeAndIndex`.
- **Firma**: `async (rootPath, filePath, context, atoms, options) => results`
- **Uso ideal**: Detección de errores de lógica, inconsistencias de nomenclatura, validación de data-flow.

### 2. Impact Guards
Se ejecutan después de que todo el archivo ha sido indexado y persistido.
- **Cuándo se ejecutan**: Al final de los eventos `add` y `change` del watcher.
- **Firma**: `async (rootPath, filePath, context, options) => results`
- **Uso ideal**: Detección de dependencias circulares, análisis de impacto en cascada, detección de duplicados globales.

## Cómo implementar un nuevo guardia

1. Crea el archivo en `src/core/file-watcher/guards/`.
2. Exporta una función asíncrona que cumpla con la firma correspondiente.
3. Regístrala en `src/core/file-watcher/guards/registry.js`.

### Ejemplo de Registro

```javascript
// En src/core/file-watcher/guards/registry.js
import { yourNewGuard } from './your-guard.js';

// Para un guardia semántico
this.registerSemanticGuard('identificador-unico', yourNewGuard);

// Para un guardia de impacto
this.registerImpactGuard('identificador-impacto', yourNewGuard);
```

## Persistencia de Resultados

Para que un guardia emita alertas que sean visibles en las herramientas MCP y la UI, debe utilizar `persistWatcherIssue`:

```javascript
import { persistWatcherIssue } from '../watcher-issue-persistence.js';

await persistWatcherIssue(
    rootPath,
    filePath,
    'tu_tipo_de_issue',
    'high|medium|low',
    'Mensaje de error descriptivo',
    { extra: 'data' }
);
```
