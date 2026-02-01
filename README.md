# CogniSystem - Motor de Conciencia Sistémica para IAs

## El Problema

Las IAs que trabajan con código sufren de **visión de túnel**: cuando editan un archivo, pierden de vista el contexto completo del sistema. Esto causa bugs colaterales porque modifican código sin considerar:

- Archivos que dependen del código modificado
- Conexiones semánticas no obvias (estado compartido, eventos, lógica de negocio)
- Efectos en cascada en otras partes del sistema

### La Encrucijada del Desarrollador

Al trabajar con IAs en proyectos modulares, te encuentras atrapado:

```
┌─────────────────────────────────────┐
│   ARCHIVOS GRANDES (Monolíticos)   │
│                                     │
│  ✓ Contexto completo en un lugar   │
│  ✗ IA no puede regenerar sin        │
│    romper sintaxis (300+ líneas)   │
└─────────────────────────────────────┘
                 ⬇️
            BLOQUEADO
                 ⬆️
┌─────────────────────────────────────┐
│   ARCHIVOS PEQUEÑOS (Modulares)    │
│                                     │
│  ✓ IA puede regenerar sin problemas│
│  ✗ Visión de túnel: pierde          │
│    conexiones entre módulos        │
└─────────────────────────────────────┘
```

**Resultado**: Proyectos que no pueden crecer porque cualquier cambio rompe algo inesperado.

## La Solución: CogniSystem

Un motor híbrido de tres capas que inyecta contexto a la IA **antes** de que edite código:

### Arquitectura

```
┌──────────────────────────────────────────────┐
│  CAPA A: Rastreador Estático (El Cuerpo)    │
│  ────────────────────────────────────────    │
│  • Scripts rápidos (tree-sitter, AST)       │
│  • Mapea: imports, llamadas, exports        │
│  • Genera grafo de dependencias técnico     │
└──────────────────────────────────────────────┘
                    ⬇️
┌──────────────────────────────────────────────┐
│  CAPA B: Enlazador IA (La Mente)            │
│  ────────────────────────────────────────    │
│  • IA Local (Qwen2.5-Coder u otro pequeño)  │
│  • Encuentra conexiones semánticas          │
│  • Ejemplo: "zoom en JS afecta u_resolution"│
└──────────────────────────────────────────────┘
                    ⬇️
┌──────────────────────────────────────────────┐
│  CAPA C: Memoria Persistente (Subproceso)   │
│  ────────────────────────────────────────    │
│  • Grafo pre-construido en SQLite/JSON      │
│  • Se activa cuando IA va a editar          │
│  • Inyecta contexto relevante               │
└──────────────────────────────────────────────┘
```

### Flujo de Trabajo

1. **Instalación**: El sistema escanea el proyecto y genera `system-map.json`
2. **Detección**: La IA dice "voy a editar CameraState.js"
3. **Inyección**: CogniSystem entrega:
   - Dependencias directas: "RenderEngine.js lo importa"
   - Conexiones semánticas: "MinimapUI.js se ve afectado (estado compartido)"
4. **Edición Protegida**: La IA modifica los 3 archivos necesarios, no solo 1

## Ventajas vs Soluciones Existentes

| Feature | Herramientas MCP Actuales | CogniSystem |
|---------|---------------------------|-------------|
| **Análisis Estático** | ✓ Sí | ✓ Sí |
| **Conexiones Semánticas** | ✗ No | ✓ Sí (Capa B) |
| **Velocidad** | Analiza on-demand (lento) | Pre-construido (instantáneo) |
| **Desconexiones** | ✗ Falla en CSS, Shaders, eventos | ✓ IA las detecta |
| **Integración** | App externa | Skill nativo en workflow |

## Estado del Proyecto

**Fase Actual**: Setup y casos de prueba sintéticos

Estamos construyendo la base en un entorno controlado antes de aplicarlo a proyectos reales. Ver [ROADMAP.md](ROADMAP.md) para el plan completo.

## Estructura del Repositorio

```
cogni-system/
├── README.md                    (este archivo)
├── ROADMAP.md                   (fases de desarrollo)
├── ARCHITECTURE.md              (diseño técnico detallado)
├── docs/
│   ├── PROBLEM_ANALYSIS.md      (análisis del problema original)
│   ├── EXISTING_SOLUTIONS.md    (comparación con herramientas del mercado)
│   └── FUTURE_IDEAS.md          (ideas para expandir el sistema)
├── test-cases/
│   ├── README.md                (guía de casos de prueba)
│   └── scenario-1-camera-minimap/  (ejemplo sintético)
├── src/
│   ├── layer-a-static/          (indexer estático)
│   ├── layer-b-semantic/        (analizador con IA)
│   └── layer-c-memory/          (persistencia y servidor MCP)
└── package.json
```

## ¿Por Qué Esto Es Necesario?

**Caso real**: Tienes un proyecto con 50 archivos modulares. Modificas el sistema de cámara. La IA no sabe que:
- El minimapa depende de la posición de la cámara
- El shader usa las mismas coordenadas
- El sistema de zoom afecta el culling de objetos

**Resultado**: 3 bugs colaterales que toman días debuggear.

**Con CogniSystem**: La IA recibe el mapa de impacto antes de editar y actualiza los 4 archivos necesarios en una sola pasada.

## Instalación

(Por completar - Primera fase: crear casos de prueba)

## Uso

(Por completar - Primera fase: validar arquitectura)

## Roadmap

Ver [ROADMAP.md](ROADMAP.md) para el plan de desarrollo detallado.

## Contribuciones

Este es un proyecto experimental nacido de la frustración con proyectos bloqueados. Si sufres del mismo problema, tus ideas y casos de uso son bienvenidos.

## Licencia

Por definir
