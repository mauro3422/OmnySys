# Roadmap Detallado: Estabilizacion y Verificacion Post-Tree-sitter

**Ultima Actualizacion**: 2026-02-25
**Estado Actual**: Migracion Base Completada (Babel -> Tree-sitter)

Tras la exitosa migracion del motor de analisis estatico a Tree-sitter en Layer A, el enfoque del proyecto se desplaza de la "extraccion de datos" a la "verificacion de integridad y optimizacion estructural".

---

## Fase 1: Estandarizacion de Extraccion (COMPLETADO)
Se ha unificado el pipeline de extraccion eliminando Babel y duplicidad de logica.
- [x] Migracion total de Data Flow (Input, Transformation, Output).
- [x] Eliminacion de extractores atomicos redundantes.
- [x] Migracion de detectores Tier 3 (Global State, Events, Side Effects).
- [x] Pipeline asincrono y soporte para WASM grammars.

---

## Fase 2: Auditoria de Integridad y Verificacion MCP (EN PROGRESO)
El objetivo es asegurar que las mas de 30 herramientas del MCP reflejen la realidad del codigo sin perdida de datos.
- **Auditoria de Herramientas (1 a 31)**: Verificar secuencialmente que herramientas como get_function_details, get_call_graph y find_symbol_instances devuelvan informacion exacta.
- **Impact Map Validation**: Asegurar que las conexiones entre atomos sean correctas tras el cambio de AST.
- **Zero Warnings Policy**: El indexer debe correr sobre cualquier repositorio sin arrojar fallos de parseo o de extraccion de datos.

---

## Fase 3: Optimizacion mediante S-Expressions (Queries)
Standardizar la extraccion para que añadir nuevas capacidades sea trivial y declarativo.
- **Queries Declarativas (.scm)**: Reemplazar el codigo de navegacion imperativo (walk()) por archivos de Query de Tree-sitter.
- **Centralizacion de Reglas**: Mover la logica de deteccion de "Side Effects" o "Shared States" a queries estandarizadas.
- **Mejora de Performance**: Reducir el tiempo de indexacion mediante el uso del motor de busqueda nativo de Tree-sitter.

---

## Fase 4: Analisis Cross-File Profundo (Layer B/C)
Fortalecer la "vision de conjunto" del sistema.
- **Trace Data Journey v2**: Perfeccionar el seguimiento deterministico de variables a traves de multiples archivos.
- **Segmentacion Molecular**: Mejorar el agrupamiento de atomos en moleculas basado en el flujo de datos real.

---

## Fase 5: Expansion Multi-Lenguaje (En Espera)
- Una vez estabilizada la base JS/TS, se añadirán gramáticas para Python y Go siguiendo el mismo estándar de queries definido en la Fase 3.

---

> [!IMPORTANT]
> **Prioridad Actual**: No expandir horizontalmente (mas lenguajes) hasta que la profundidad (verificacion de herramientas MCP) sea del 100%. La estabilidad y la precison son nuestra ventaja competitiva.
