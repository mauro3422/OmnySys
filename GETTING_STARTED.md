# Getting Started - Primeros Pasos

## Estado Actual del Proyecto

✅ **FASE 0 COMPLETADA** - Documentación y Estructura

Hemos creado la base completa de CogniSystem:
- Documentación exhaustiva del problema y la solución
- Arquitectura técnica detallada de las 3 capas
- Roadmap con fases claras
- Estructura de carpetas profesional
- Casos de prueba sintéticos

**Próximo paso**: Implementar Capa A (Análisis Estático)

---

## Estructura del Proyecto

```
cogni-system/
├── README.md                           ⭐ Empieza aquí
├── ROADMAP.md                          📋 Plan de desarrollo
├── ARCHITECTURE.md                     🏗️ Diseño técnico
├── GETTING_STARTED.md                  👉 Este archivo
│
├── docs/
│   ├── PROBLEM_ANALYSIS.md             📊 Análisis del problema original
│   ├── EXISTING_SOLUTIONS.md           🔍 Comparación con mercado
│   └── FUTURE_IDEAS.md                 💡 Ideas de expansión
│
├── test-cases/
│   ├── README.md                       🧪 Guía de test cases
│   └── scenario-1-simple-import/       ✅ Primer caso de prueba
│       ├── README.md
│       ├── src/                        (código sintético)
│       ├── expected-graph.json         (ground truth)
│       └── expected-warnings.json      (advertencias esperadas)
│
├── src/
│   ├── layer-a-static/                 🔵 Capa A: Análisis Estático
│   │   └── README.md                   (qué implementar)
│   ├── layer-b-semantic/               🟢 Capa B: IA Semántica
│   │   └── README.md
│   └── layer-c-memory/                 🟣 Capa C: Memoria Persistente
│       └── README.md
│
├── package.json
└── .gitignore
```

---

## ¿Qué Sigue?

### Opción A: Empezar a Codear (Recomendado)

**Implementar Capa A - Análisis Estático**

1. **Lee la documentación**:
   - [src/layer-a-static/README.md](src/layer-a-static/README.md) - Qué componentes implementar
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Diseño técnico detallado

2. **Instala dependencias**:
   ```bash
   npm install
   ```

3. **Crea el primer componente: `scanner.js`**:
   - Escanea el filesystem
   - Filtra archivos por extensión
   - Ignora node_modules, dist, etc.

4. **Valida con test case**:
   ```bash
   node src/layer-a-static/scanner.js test-cases/scenario-1-simple-import/src
   ```

5. **Continúa con los demás componentes**:
   - `parser.js` (parsea archivos a AST)
   - `resolver.js` (resuelve rutas de imports)
   - `graph-builder.js` (construye el grafo)
   - `indexer.js` (orquestador principal)

### Opción B: Crear Más Test Cases

Si prefieres tener más casos de prueba antes de empezar:

1. **Scenario 2: Shared State**
   - Crear archivos sintéticos
   - Definir expected-graph.json

2. **Scenario 3: Event System**
   - Emisor y listeners
   - Conexión sin imports directos

3. Ver [test-cases/README.md](test-cases/README.md) para la lista completa

### Opción C: Explorar Herramientas Existentes

Antes de construir desde cero, puedes validar herramientas del mercado:

1. Instalar `@er77/code-graph-rag-mcp`:
   ```bash
   npm install -g @er77/code-graph-rag-mcp
   ```

2. Probar en uno de tus proyectos bloqueados

3. Documentar qué funciona y qué no

4. Usar esos insights para CogniSystem

---

## Comandos Útiles

```bash
# Instalar dependencias
npm install

# Ejecutar tests (cuando estén implementados)
npm test

# Ver estructura del proyecto
tree -L 2 -I 'node_modules'

# Validar que el proyecto está bien estructurado
ls -la
```

---

## Flujo de Desarrollo Recomendado

### Fase 1: Capa A (MVP)

**Duración**: No estimamos tiempos, enfoque en qué construir

**Objetivos**:
1. ✅ Scanner que encuentra archivos
2. ✅ Parser que extrae imports/exports
3. ✅ Graph builder que conecta archivos
4. ✅ Validar con `scenario-1-simple-import`

**Criterio de éxito**: El grafo generado coincide con `expected-graph.json`

### Fase 2: Integración Básica

**Objetivos**:
1. ✅ Servidor MCP simple que expone `get_impact_map`
2. ✅ Skill para Claude Code que llama al servidor
3. ✅ Validar que una IA puede consultar el grafo

### Fase 3: Capa B (Semántica)

**Objetivos**:
1. ✅ Pattern matchers (eventos, storage)
2. ✅ Connection inference
3. ✅ Validar con `scenario-2-shared-state`

---

## Gestión de Contexto

**Importante**: Cuando se compacte el contexto de la IA que te está ayudando:

1. **La documentación sobrevive**: Todo está en archivos Markdown
2. **Puedes retomar desde aquí**: Este archivo es tu punto de entrada
3. **Los test cases son tu guía**: Valida cada componente con ellos

**Para retomar**:
1. Lee [README.md](README.md) para entender el problema
2. Lee [ROADMAP.md](ROADMAP.md) para ver el plan
3. Lee el README de la capa que estés implementando
4. Continúa donde lo dejaste

---

## Preguntas Frecuentes

### ¿Por dónde empiezo?

**Respuesta**: Implementa `scanner.js` en `src/layer-a-static/`. Es el componente más simple y te dará momentum.

### ¿Necesito saber mucho sobre ASTs?

**Respuesta**: No. `@babel/parser` hace el trabajo pesado. Solo necesitas saber cómo recorrer el árbol.

### ¿Qué pasa si me bloqueo?

**Respuesta**:
1. Revisa [ARCHITECTURE.md](ARCHITECTURE.md) - tiene ejemplos de código
2. Mira el test case correspondiente - muestra qué se espera
3. Busca librerías similares (Dependency Cruiser, Madge) para inspiración

### ¿Debo implementar todo de una vez?

**Respuesta**: **NO**. Implementa incrementalmente:
1. Scanner → valida
2. Parser → valida
3. Graph builder → valida
4. etc.

### ¿Cuándo debería usar esto en proyectos reales?

**Respuesta**: Solo cuando:
- ✅ Capa A funciona perfectamente en test cases
- ✅ Has validado en un proyecto pequeño tuyo
- ✅ Estás cómodo con posibles bugs

**No lo uses en producción hasta Fase 5 del ROADMAP**

---

## Recursos Externos

### Documentación de Librerías
- [@babel/parser](https://babeljs.io/docs/babel-parser) - Parser de JS/TS
- [@babel/traverse](https://babeljs.io/docs/babel-traverse) - Recorrido de AST
- [fast-glob](https://github.com/mrmlnc/fast-glob) - File scanning
- [chokidar](https://github.com/paulmillr/chokidar) - File watching

### Proyectos Similares (Inspiración)
- [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser) - Análisis estático
- [Madge](https://github.com/pahen/madge) - Grafo de dependencias
- [@er77/code-graph-rag-mcp](https://github.com/er77/code-graph-rag-mcp) - Servidor MCP de grafos

### MCP (Model Context Protocol)
- [MCP Docs](https://modelcontextprotocol.io/) - Especificación oficial
- [MCP SDK](https://github.com/modelcontextprotocol/sdk) - SDK para construir servidores

---

## Notas Importantes

### Sobre el Renombramiento de la Carpeta

**Acción pendiente**: Renombrar la carpeta del proyecto de `aver` a `cogni-system`

Esto no se puede hacer automáticamente desde la IA, debes hacerlo manualmente:

```bash
# Opción 1: Desde la carpeta padre
mv aver cogni-system

# Opción 2: En Windows (explorador de archivos)
# Click derecho → Renombrar
```

### Sobre Git

**Recomendación**: Inicializa git cuando empieces a codear:

```bash
git init
git add .
git commit -m "Initial commit: Project structure and documentation"
```

### Sobre Dependencias Opcionales

El `package.json` tiene `optionalDependencies`:
- `@modelcontextprotocol/sdk` - Para Capa C (Fase 2)
- `better-sqlite3` - Para storage escalable (Fase 4)
- `ollama` - Para IA local (Fase 3, opcional)

**No las necesitas en Fase 1**, instala solo cuando llegues a esas fases.

---

## Motivación

Recuerda por qué estamos construyendo esto:

> "Estoy atrapado entre monolitos que la IA no puede regenerar y módulos que causan visión de túnel. Mis proyectos están bloqueados."

**CogniSystem es la solución**. Cada línea de código que escribas nos acerca a proyectos que puedan crecer sin miedo.

---

## Próximo Paso Concreto

**Ahora mismo, haz esto**:

1. Renombra la carpeta a `cogni-system`
2. Abre [src/layer-a-static/README.md](src/layer-a-static/README.md)
3. Crea el archivo `src/layer-a-static/scanner.js`
4. Implementa la función `scanProject(rootPath)`
5. Valida que funciona:
   ```bash
   node src/layer-a-static/scanner.js test-cases/scenario-1-simple-import/src
   ```
6. Debería imprimir: `['fileA.js', 'fileB.js', 'fileC.js']`

**¡Empieza pequeño, itera rápido!**

---

¿Listo para construir? 🚀
