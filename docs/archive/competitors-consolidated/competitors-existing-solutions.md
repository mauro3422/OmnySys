---
?? **DOCUMENTO RESCATADO DEL ARCHIVO - INFORMACI�N ESTRAT�GICA**

An�lisis detallado de herramientas existentes (MCP servers, Dependency Cruiser, etc.)
Fecha original: 2026-02-??
Relevancia: ALTA - Benchmarking de competidores

---
# Análisis de Soluciones Existentes

## Resumen

Este documento analiza las herramientas y servicios existentes que intentan resolver problemas similares al de OmnySys, evaluando sus fortalezas, limitaciones y por qué no resuelven completamente nuestro caso de uso.

---

## 1. Servidores MCP de Análisis de Código

### @er77/code-graph-rag-mcp

**Descripción**: Servidor MCP que crea un grafo inteligente del código usando RAG (Retrieval-Augmented Generation).

**Características**:
- Análisis de dependencias entre archivos
- Grafo de llamadas a funciones
- Impact analysis: "¿Qué archivos se afectan si modifico X?"

**Fortalezas**:
- ✅ Ya funciona como servidor MCP (estándar de la industria)
- ✅ Pensado específicamente para IAs
- ✅ Usa RAG para búsquedas semánticas

**Limitaciones**:
- ❌ Análisis on-demand (lento, no pre-construido)
- ❌ No especifica si detecta conexiones semánticas (eventos, estado)
- ❌ Documentación limitada sobre qué tipos de conexiones detecta

**¿Por qué no es suficiente?**
No sabemos si puede detectar:
- Estado compartido sin imports directos
- Sistemas de eventos
- Side effects (localStorage, DOM)
- Archivos desconectados (shaders, CSS)

### CodeGraphContext

**Descripción**: Otro servidor MCP para análisis de dependencias.

**Características**:
- Lista "Impacto de cambio en una función" como caso de uso principal
- Grafo de dependencias estático

**Fortalezas**:
- ✅ Enfocado en el problema que queremos resolver
- ✅ Compatible con MCP

**Limitaciones**:
- ❌ Solo análisis estático (confirmar)
- ❌ No menciona conexiones semánticas
- ❌ Velocidad de respuesta no especificada

---

## 2. Herramientas de Análisis Estático

### Dependency Cruiser

**Descripción**: Herramienta CLI para validar y visualizar dependencias en proyectos JS/TS.

**Características**:
- Detecta imports y exports
- Valida reglas arquitectónicas (ej: "layer A no puede importar layer B")
- Genera gráficos de dependencias

**Fortalezas**:
- ✅ Muy rápido (análisis estático puro)
- ✅ Configurable con reglas personalizadas
- ✅ Detecta dependencias circulares

**Limitaciones**:
- ❌ Solo ve imports directos
- ❌ No es una herramienta para IAs (CLI para humanos)
- ❌ No detecta estado compartido, eventos, etc.

**Ejemplo de regla**:
```json
{
  "forbidden": [
    {
      "from": { "path": "^src/ui" },
      "to": { "path": "^src/backend" },
      "comment": "UI no debe importar backend directamente"
    }
  ]
}
```

**¿Por qué no es suficiente?**
No está pensado para IAs. Requiere que el humano configure reglas manualmente.

### Madge

**Descripción**: Generador de grafos de dependencias para Node.js.

**Características**:
- Visualiza dependencias en formato imagen o JSON
- Detecta ciclos
- Soporta CommonJS, AMD, ES6

**Fortalezas**:
- ✅ Simple y rápido
- ✅ Output en JSON (programáticamente usable)

**Limitaciones**:
- ❌ Solo análisis superficial
- ❌ No pensado para integración con IAs

---

## 3. Herramientas de Búsqueda de Código

### Sourcegraph

**Descripción**: Plataforma de búsqueda de código con análisis semántico.

**Características**:
- Búsqueda inteligente de código
- "Find references" avanzado
- Navegación de dependencias

**Fortalezas**:
- ✅ Muy potente para búsquedas
- ✅ Detecta referencias que IDEs normales no ven
- ✅ API para integración

**Limitaciones**:
- ❌ Plataforma completa (overkill para nuestro caso)
- ❌ Requiere servidor dedicado
- ❌ No pensado para inyección de contexto a IAs

### GitHub Copilot / GitHub Copilot Chat

**Descripción**: Asistente de código de GitHub con acceso al contexto del workspace.

**Características**:
- Puede leer múltiples archivos del proyecto
- Entiende dependencias mediante embeddings
- Integrado con el IDE

**Fortalezas**:
- ✅ Ya tiene consciencia del proyecto
- ✅ Puede responder preguntas sobre el codebase

**Limitaciones**:
- ❌ Sigue siendo reactivo (no proactivo)
- ❌ No garantiza que considere todas las dependencias
- ❌ No expone el grafo de dependencias explícitamente
- ❌ Dependiente de GitHub/Microsoft

---

## 4. Herramientas de Refactoring

### jscodeshift

**Descripción**: Toolkit para modificación automatizada de código (codemods).

**Características**:
- Transforma código usando AST
- Útil para refactorings masivos (ej: renombrar función en 100 archivos)

**Fortalezas**:
- ✅ Muy preciso (trabaja con AST)
- ✅ Puede modificar múltiples archivos a la vez

**Limitaciones**:
- ❌ Requiere escribir transformaciones manualmente
- ❌ No analiza conexiones semánticas
- ❌ No es una herramienta de análisis, es de transformación

### ts-morph

**Descripción**: API para manipular código TypeScript mediante su AST.

**Características**:
- Leer, analizar y modificar código TS
- Extraer información de tipos

**Fortalezas**:
- ✅ API fácil de usar
- ✅ Pensado para herramientas de análisis
- ✅ Útil para construir OmnySys Capa A

**Limitaciones**:
- ❌ Solo TypeScript (no JS puro, no otros lenguajes)
- ❌ Es una librería, no una solución completa

---

## 5. Herramientas de Testing

### Jest --findRelatedTests

**Descripción**: Jest puede ejecutar solo los tests relacionados con archivos modificados.

**Características**:
- Analiza qué archivos importan el modificado
- Ejecuta tests relevantes (más rápido que ejecutar todo)

**Comando**:
```bash
jest --findRelatedTests src/CameraState.js
# Ejecuta tests que importan CameraState.js
```

**Fortalezas**:
- ✅ Análisis de impacto automático
- ✅ Ya integrado en herramientas populares

**Limitaciones**:
- ❌ Solo funciona con tests
- ❌ Solo ve imports directos
- ❌ No ayuda durante la edición (solo después)

---

## 6. IDEs Modernos

### VS Code (IntelliSense, Go to Definition, Find All References)

**Características**:
- "Find All References" encuentra usos de una función
- "Go to Definition" navega a la definición
- Análisis de tipos con TypeScript

**Fortalezas**:
- ✅ Ya disponible, gratis
- ✅ Rápido y preciso

**Limitaciones**:
- ❌ Herramienta para humanos, no para IAs
- ❌ Requiere interacción manual
- ❌ No detecta conexiones semánticas

---

## 7. Herramientas de IA para Código

### Cursor IDE

**Descripción**: IDE con IA integrada que puede editar múltiples archivos.

**Características**:
- IA consciente del contexto del proyecto
- Puede hacer cambios multi-archivo
- Usa embeddings del codebase

**Fortalezas**:
- ✅ Diseñado para evitar bugs colaterales
- ✅ IA puede "ver" más allá de un archivo

**Limitaciones**:
- ❌ Propietario (no código abierto)
- ❌ No expone cómo funciona internamente
- ❌ Sigue fallando en proyectos complejos (según usuarios)

### Aider

**Descripción**: CLI tool que permite a la IA editar múltiples archivos usando git.

**Características**:
- Comandos para agregar archivos al contexto
- Commits automáticos
- Usa git diff para entender cambios

**Fortalezas**:
- ✅ Código abierto
- ✅ Diseñado para modificaciones multi-archivo

**Limitaciones**:
- ❌ Usuario debe especificar qué archivos incluir
- ❌ No hay análisis automático de dependencias
- ❌ Sigue siendo reactivo, no proactivo

---

## 8. Market de MCP

### mcpmarket.com - Tool: "Dependency"

**Descripción**: Herramienta MCP que evalúa código contra reglas arquitectónicas.

**Características**:
- Valida que el código cumpla reglas definidas
- Puede bloquear cambios que violan la arquitectura

**Fortalezas**:
- ✅ Preventivo (detecta problemas antes de commit)
- ✅ Compatible con MCP

**Limitaciones**:
- ❌ Requiere definir reglas manualmente
- ❌ No genera el grafo automáticamente
- ❌ Solo valida, no sugiere qué más revisar

---

## Comparación: Soluciones Existentes vs OmnySys

| Feature | Existing MCP Tools | Dependency Cruiser | Cursor/Copilot | OmnySys |
|---------|-------------------|-------------------|---------------|-------------|
| **Análisis Estático** | ✅ | ✅ | ✅ | ✅ |
| **Análisis Semántico** | ❓ | ❌ | ✅ (black box) | ✅ (IA local) |
| **Velocidad** | ❌ (on-demand) | ✅ | ❓ | ✅ (pre-built) |
| **Detección de Estado Compartido** | ❓ | ❌ | ❓ | ✅ |
| **Detección de Eventos** | ❓ | ❌ | ❓ | ✅ |
| **Archivos Desconectados (shaders, CSS)** | ❌ | ❌ | ❓ | ✅ |
| **Integración MCP** | ✅ | ❌ | ❌ | ✅ |
| **Código Abierto** | ✅ | ✅ | ❌ | ✅ (será) |
| **Proactivo (inyección automática)** | ❌ | ❌ | ❌ | ✅ |

---

## Lecciones Aprendidas

### Qué Podemos Reutilizar

1. **Estándar MCP**: No reinventar la rueda, usar MCP para la integración
2. **Parsers Existentes**: `@babel/parser`, `ts-morph` para análisis estático
3. **Patrones de Dependency Cruiser**: Inspiración para reglas de validación

### Qué Necesitamos Construir

1. **Capa Semántica**: Ninguna herramienta existente detecta todas las conexiones que necesitamos
2. **Pre-construcción**: Las herramientas on-demand son lentas para nuestro caso de uso
3. **Proactividad**: Las herramientas actuales esperan a que el usuario pregunte

---

## Conclusión

**Existe infraestructura útil**, pero ninguna solución completa:

- Los servidores MCP existentes pueden ser un buen punto de partida, pero necesitamos validar sus capacidades
- Las herramientas de análisis estático son rápidas pero limitadas
- Las IAs de código (Cursor, Copilot) tienen el enfoque correcto pero son cajas negras propietarias

**Nuestra ventaja**:
- Combinación única: Análisis estático + IA semántica + Pre-construcción + Proactividad
- Código abierto y transparente
- Diseñado específicamente para el problema de visión de túnel

**Recomendación**: Construir OmnySys reutilizando componentes existentes (parsers, MCP) pero con arquitectura propia.

