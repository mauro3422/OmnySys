# CogniSystem - Roadmap de Desarrollo

## Filosofía de Desarrollo

**Enfoque incremental**: Construir y validar cada capa antes de pasar a la siguiente. Evitar el "big bang" que puede generar frustración si no funciona de inmediato.

**Principio**: "Funciona en sintético antes de tocar código real"

---

## FASE 0: Preparación y Documentación ✅

**Objetivo**: Capturar todo el conocimiento antes de que se compacte el contexto.

**Tareas**:
- [x] Crear README.md con análisis del problema
- [x] Crear ROADMAP.md (este archivo)
- [ ] Crear ARCHITECTURE.md con diseño técnico
- [ ] Crear docs/ con análisis detallado
- [ ] Crear estructura de carpetas del proyecto

**Entregables**:
- Documentación completa que puede sobrevivir a la compactación de contexto
- Estructura de proyecto profesional
- Casos de uso claramente definidos

---

## FASE 1: Capa A - Indexer Estático (MVP)

**Duración estimada**: No estimamos tiempos - nos enfocamos en qué construir

**Objetivo**: Crear un analizador estático que genere un grafo de dependencias técnico.

### 1.1: Parser de Código

**Entregables**:
- Script que puede parsear archivos JS/TS y extraer:
  - Imports/exports
  - Llamadas a funciones
  - Acceso a propiedades
  - Definiciones de clases/funciones

**Stack técnico**:
- Node.js
- `@babel/parser` o `ts-morph` para AST parsing
- `ripgrep` para búsquedas rápidas (opcional)

**Casos de prueba**:
```
test-cases/scenario-1-simple-import/
  ├── fileA.js (exporta función)
  └── fileB.js (importa de A)
Resultado esperado: Grafo detecta A → B
```

### 1.2: Constructor de Grafo

**Entregables**:
- Script que recorre el proyecto y construye `system-map.json`:
```json
{
  "files": {
    "src/CameraState.js": {
      "exports": ["CameraState", "updateCamera"],
      "imports": ["./math/Vector3"],
      "usedBy": ["src/RenderEngine.js", "src/Input.js"],
      "calls": ["Vector3.normalize", "clamp"]
    }
  },
  "dependencies": [
    { "from": "RenderEngine.js", "to": "CameraState.js", "type": "import" },
    { "from": "CameraState.js", "to": "Vector3.js", "type": "import" }
  ]
}
```

**Casos de prueba**:
```
test-cases/scenario-2-chain-dependency/
  ├── A.js (exporta X)
  ├── B.js (importa X, exporta Y)
  └── C.js (importa Y)
Resultado esperado: Grafo detecta A → B → C
```

### 1.3: Visualización (Debug)

**Entregables**:
- Script que convierte `system-map.json` a formato Mermaid o Graphviz
- Permite visualizar el grafo en markdown

**Propósito**:
Validar que el grafo está correctamente construido antes de usarlo.

---

## FASE 2: Integración Básica con IA

**Objetivo**: Hacer que una IA pueda consultar el grafo antes de editar.

### 2.1: Servidor MCP Simple

**Entregables**:
- Servidor MCP que expone una herramienta: `get_impact_map`
- Input: nombre de archivo
- Output: lista de archivos relacionados

**Ejemplo de uso**:
```bash
IA: "Voy a editar CameraState.js"
Tool: get_impact_map("CameraState.js")
Respuesta: {
  "directDependents": ["RenderEngine.js", "Input.js"],
  "indirectDependents": ["Main.js"],
  "imports": ["Vector3.js"]
}
IA: "Entendido, revisaré RenderEngine.js también"
```

### 2.2: Skill de Pre-Edición

**Entregables**:
- Skill personalizado que se ejecuta antes de editar
- Automáticamente llama a `get_impact_map` y muestra advertencias

**Casos de prueba**:
```
test-cases/scenario-3-forgotten-dependent/
  ├── StateManager.js (módulo central)
  ├── UI.js (depende del estado)
  └── Logic.js (depende del estado)

Prueba: Pedir a IA editar StateManager sin mencionar UI/Logic
Resultado esperado: Skill advierte "Ojo, UI.js y Logic.js dependen de esto"
```

---

## FASE 3: Capa B - Analizador Semántico con IA

**Objetivo**: Detectar conexiones que el análisis estático no puede ver.

### 3.1: Configuración de IA Local

**Entregables**:
- Setup de modelo local (Qwen2.5-Coder-7B o similar)
- Script que puede hacer inferencia local

**Consideraciones**:
- Evaluar si vale la pena el costo computacional
- Comparar con alternativas (GPT-4o-mini vía API)

### 3.2: Detector de Conexiones Semánticas

**Entregables**:
- Script que lee el código y detecta:
  - Estado compartido (variables globales, stores)
  - Eventos/listeners
  - Efectos indirectos (ej: un botón que triggerea una función en otro módulo)

**Prompt para la IA**:
```
Analiza este código y lista todos los archivos del proyecto que
podrían verse afectados si modifico esta función, incluso si no
hay un import directo. Considera: estado compartido, eventos,
callbacks, configuración global.
```

**Casos de prueba**:
```
test-cases/scenario-4-event-coupling/
  ├── Button.js (dispara evento "click")
  ├── Analytics.js (escucha "click")
  └── Logger.js (escucha "click")

Resultado esperado: IA detecta que Button afecta Analytics y Logger
aunque no hay imports directos.
```

### 3.3: Enriquecimiento del Grafo

**Entregables**:
- Script que combina Capa A (estático) + Capa B (semántico)
- Genera `enhanced-system-map.json` con metadata enriquecida

---

## FASE 4: Capa C - Memoria Persistente y Automatización

**Objetivo**: Que el sistema funcione sin intervención manual.

### 4.1: Base de Datos de Grafo

**Entregables**:
- Migrar de JSON a SQLite para queries rápidas
- Índices para búsqueda eficiente

### 4.2: Auto-Actualización

**Entregables**:
- File watcher que detecta cambios en el código
- Regenera solo las partes del grafo afectadas (no todo el proyecto)

**Desafío**:
¿Cómo saber qué partes regenerar sin analizar todo el proyecto cada vez?

### 4.3: Hooks de Pre-Edición Automáticos

**Entregables**:
- Hook que intercepta todas las operaciones de edición de IA
- Inyecta contexto automáticamente sin que la IA tenga que pedirlo

---

## FASE 5: Validación en Proyecto Real

**Objetivo**: Llevar CogniSystem a uno de tus proyectos bloqueados.

### 5.1: Selección de Proyecto

**Criterios**:
- Proyecto con bugs colaterales recurrentes
- Suficientemente complejo (10+ archivos modulares)
- Caso de uso claro y repetible

### 5.2: Instalación y Monitoreo

**Entregables**:
- Instalar CogniSystem en el proyecto
- Generar el grafo inicial
- Intentar una modificación que históricamente rompe cosas

### 5.3: Iteración

**Preguntas a responder**:
- ¿El grafo detectó las dependencias correctamente?
- ¿La IA usó el contexto para evitar bugs?
- ¿Hubo falsos positivos (conexiones irrelevantes)?
- ¿Faltaron conexiones importantes?

---

## FASE 6: Optimización y Escalado

**Objetivo**: Hacer que CogniSystem funcione en proyectos grandes (100+ archivos).

### 6.1: Performance

**Desafíos**:
- Tiempo de indexación inicial
- Tamaño del grafo en memoria
- Queries lentas

**Soluciones a evaluar**:
- Índices en SQLite
- Caché de resultados comunes
- Análisis parcial (solo lo necesario)

### 6.2: Filtrado Inteligente

**Problema**:
Si inyectamos todas las dependencias, saturamos el contexto de la IA.

**Solución**:
- Ranking de relevancia (directo vs indirecto)
- Límite de archivos relacionados (ej: máximo 5)
- Priorizar por tipo de cambio

---

## FASE 7: Features Avanzadas (Futuro)

### Ideas para expandir:

**Predicción de Impacto**:
- Antes de editar, mostrar: "Este cambio afectará 12 tests"

**Sugerencias Proactivas**:
- "Nota: si cambias esta función, probablemente quieras actualizar la documentación en docs/API.md"

**Integración con Testing**:
- Automáticamente ejecutar solo los tests relacionados con los archivos modificados

**Análisis de Riesgo**:
- "⚠️ Este archivo es crítico, usado por 15 módulos. ¿Seguro?"

**Detector de Código Muerto**:
- "Este archivo no es usado por nadie, ¿eliminarlo?"

---

## Criterios de Éxito

**Fase 1**: Grafo estático funciona en casos sintéticos
**Fase 2**: IA puede consultar el grafo manualmente
**Fase 3**: IA detecta conexiones semánticas correctamente
**Fase 4**: Sistema funciona automáticamente sin intervención
**Fase 5**: **CLAVE** - Previene bugs colaterales en proyecto real
**Fase 6**: Escala a proyectos grandes sin problemas de performance

---

## Notas de Desarrollo

### Principios:
1. **No estimar tiempos** - enfocarse en qué construir
2. **Validar antes de escalar** - cada fase debe funcionar antes de la siguiente
3. **Casos de prueba primero** - construir lo que sabemos que funciona
4. **Iterar en base a feedback real** - no construir features especulativos

### Gestión de Expectativas:
- Puede no funcionar al primer intento
- Algunas ideas pueden ser inviables
- El objetivo es aprender y mejorar, no perfección inmediata

---

## Estado Actual

**En progreso**: FASE 0 - Documentación y estructura

**Siguiente paso**: Completar estructura de carpetas y casos de prueba sintéticos para FASE 1.
