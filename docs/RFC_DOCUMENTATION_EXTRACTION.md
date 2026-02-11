# 🔮 RFC: Extracción de Patrones desde Documentación

**Estado:** Propuesta  
**Prioridad:** Media  
**Complejidad:** Alta  
**Dependencias:** LLM Integration

---

## 🎯 OBJETIVO

Extraer automáticamente patrones, referencias y conocimiento desde archivos de documentación (.md) para enriquecer la "sociedad de átomos" y el grafo de conocimiento del sistema.

---

## 💡 CONCEPTO

### La "Sociedad de Átomos"
Los átomos (funciones) no existen aislados. Forman una sociedad con:
- **Relaciones de llamada** (quién llama a quién)
- **Dependencias de datos** (qué datos comparten)
- **Patrones de uso** (cómo se usan en la documentación)
- **Contexto semántico** (qué representan en el dominio)

### Rol de la Documentación
Los archivos `.md` contienen:
- **Ejemplos de uso** reales del código
- **Explicaciones** del propósito de funciones
- **Referencias cruzadas** entre componentes
- **Decisiones de diseño** y arquitectura

**Idea:** Analizar la documentación para extraer estas relaciones y conectarlas con los átomos.

---

## 🏗️ ARQUITECTURA PROPUESTA

### Componentes

```
documentation-extractor/
├── parsers/
│   ├── markdown-parser.js      # Parsea MD a AST
│   └── code-block-extractor.js # Extrae bloques ```
├── analyzers/
│   ├── reference-detector.js   # Detecta referencias a funciones
│   ├── pattern-extractor.js    # Extrae patrones de uso
│   └── semantic-analyzer.js    # Analiza contexto semántico
├── connectors/
│   └── doc-to-atom-connector.js # Crea conexiones docs ↔ átomos
└── types/
    └── doc-types.js            # Tipos de documentación
```

### Flujo de Trabajo

```
1. Scan .md files
   ↓
2. Parse Markdown → AST
   ↓
3. Extraer bloques de código
   ↓
4. Detectar referencias a funciones/atoms
   ↓
5. Analizar contexto (LLM opcional)
   ↓
6. Crear conexiones documentación → átomos
   ↓
7. Enriquecer metadata de átomos
```

---

## 🔍 ANÁLISIS DETALLADO

### 1. Parser de Markdown

**Entrada:** Archivo `.md`
**Salida:** AST (Abstract Syntax Tree)

**Biblioteca sugerida:** `marked` o `remark`

**Estructura a extraer:**
```javascript
{
  headings: [...],           // Títulos (jerarquía)
  paragraphs: [...],         // Párrafos de texto
  codeBlocks: [...],         // Bloques ```javascript
  lists: [...],              // Listas (features, requisitos)
  links: [...],              // Links internos/externos
  tables: [...]              // Tablas (API, comparativas)
}
```

---

### 2. Detector de Referencias

**Patrones a buscar:**

```javascript
// Referencias directas a funciones
getFileAnalysis()           // función()
verify()                    // función()
AtomExtractionPhase         // Clase
extractComprehensiveMetadata // función camelCase

// Referencias con namespace
verification.orchestrator.verify()
src/layer-a-static/query

// Bloques de código con uso real
```javascript
const result = await verify(projectPath);
console.log(result.status);
```
```

**Implementación:**
```javascript
function detectReferences(text, allAtoms) {
  const references = [];
  
  // Pattern 1: función()
  const funcPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  
  // Pattern 2: Namespace.función
  const namespacePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*\.)+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  
  // Pattern 3: Clase (PascalCase sin paréntesis)
  const classPattern = /\b([A-Z][a-zA-Z0-9]*)(?![a-zA-Z0-9_\(])/g;
  
  // Buscar y validar contra lista de átomos
  for (const match of text.matchAll(funcPattern)) {
    const funcName = match[1];
    if (allAtoms.has(funcName)) {
      references.push({
        type: 'function',
        name: funcName,
        position: match.index,
        confidence: 0.9
      });
    }
  }
  
  return references;
}
```

---

### 3. Analizador Semántico (LLM)

**Uso opcional de LLM para:**

1. **Desambiguar referencias:**
   - `verify()` → ¿Cuál de las 3 funciones verify?
   - Contexto: "sistema de verificación" → `VerificationOrchestrator.verify`

2. **Extraer propósito:**
   - "Esta función se usa para validar el sistema"
   - → Tag: `purpose: validation`

3. **Detectar relaciones semánticas:**
   - "getFileAnalysis es llamado por getMultipleFileAnalysis"
   - → Conexión: caller-callee

4. **Extraer patrones de uso:**
   - "Primero se inicializa, luego se ejecuta, finalmente se guarda"
   - → Pattern: init → execute → save

**Prompt sugerido:**
```
Analiza este fragmento de documentación:

"${documentationFragment}"

Funciones disponibles en el proyecto:
${listOfAllAtoms}

Extrae:
1. Qué funciones se mencionan (con confianza)
2. Contexto semántico (qué se hace)
3. Relaciones entre funciones (si las hay)
4. Patrones de uso descritos

Responde en formato JSON.
```

---

### 4. Conector Docs ↔ Átomos

**Tipos de conexiones a crear:**

```javascript
{
  type: 'documented_in',
  from: 'atom:getFileAnalysis',
  to: 'doc:docs/API.md',
  metadata: {
    section: '## Core Functions',
    context: 'Used for retrieving file metadata',
    confidence: 0.95
  }
}

{
  type: 'example_usage',
  from: 'atom:verify',
  to: 'doc:docs/examples.md',
  metadata: {
    codeBlock: 'const result = await verify(path);',
    lineNumber: 42
  }
}

{
  type: 'related_to',
  from: 'atom:VerificationOrchestrator',
  to: 'atom:IntegrityValidator',
  via: 'doc:docs/architecture.md',
  context: 'Both are part of the verification system'
}
```

---

## 📊 IMPACTO ESPERADO

### Enriquecimiento de Átomos

**Antes:**
```javascript
{
  name: 'getFileAnalysis',
  calledBy: ['getMultipleFileAnalysis']
}
```

**Después:**
```javascript
{
  name: 'getFileAnalysis',
  calledBy: ['getMultipleFileAnalysis'],
  
  // NUEVO: Desde documentación
  documentedIn: ['docs/API.md', 'docs/tutorials.md'],
  purpose: 'Retrieves comprehensive file metadata',
  usagePatterns: [
    {
      pattern: 'standalone',
      description: 'Direct file analysis',
      example: 'getFileAnalysis(path)'
    },
    {
      pattern: 'batch',
      description: 'Part of batch processing',
      example: 'files.map(f => getFileAnalysis(f))'
    }
  ],
  semanticContext: ['file-analysis', 'metadata-extraction', 'layer-a'],
  relatedConcepts: ['atoms', 'static-analysis', 'file-parsing']
}
```

### Beneficios

1. **Mejor búsqueda:** Buscar por concepto, no solo por nombre
2. **Documentación viva:** Saber qué código está documentado
3. **Onboarding:** Nuevos devs pueden explorar código a través de docs
4. **Mantenimiento:** Detectar docs obsoletos (código cambió, doc no)
5. **Insights:** "Esta función es muy documentada pero poco usada"

---

## ⚙️ IMPLEMENTACIÓN

### Fase 1: Extracción Básica (Sin LLM)

**Tareas:**
- [ ] Parser de Markdown
- [ ] Detector de referencias simple
- [ ] Mapeo docs → átomos
- [ ] Almacenamiento de conexiones

**Tiempo estimado:** 2-3 días

### Fase 2: Análisis Semántico (Con LLM)

**Tareas:**
- [ ] Integración con LLM
- [ ] Prompt engineering
- [ ] Caché de resultados
- [ ] Validación de extracciones

**Tiempo estimado:** 1 semana

### Fase 3: UI y Visualización

**Tareas:**
- [ ] Grafo de conocimiento docs-código
- [ ] Indicadores de cobertura doc
- [ ] Sugerencias de documentación faltante

**Tiempo estimado:** 1 semana

---

## 🎓 EJEMPLOS

### Ejemplo 1: Detección de Patrón

**Documentación:**
```markdown
## Uso del Sistema de Verificación

Para verificar un proyecto, sigue estos pasos:

1. Crear el orquestador:
   ```javascript
   const orch = new VerificationOrchestrator(path);
   ```

2. Ejecutar verificación:
   ```javascript
   const result = await orch.verify();
   ```

3. Revisar resultados:
   ```javascript
   console.log(result.issues);
   ```
```

**Extracción:**
```javascript
{
  pattern: 'verification_workflow',
  steps: [
    { atom: 'VerificationOrchestrator', action: 'instantiate' },
    { atom: 'verify', action: 'execute' },
    { atom: 'issues', action: 'inspect' }
  ],
  source: 'docs/verification-guide.md'
}
```

### Ejemplo 2: Referencias Cruzadas

**Documentación:**
```markdown
El sistema usa `extractComprehensiveMetadata` para extraer datos.
Esta función está relacionada con `AtomExtractionPhase` pero opera
a mayor nivel, combinando múltiples extractores.
```

**Extracción:**
```javascript
[
  { atom: 'extractComprehensiveMetadata', context: 'main-extractor' },
  { atom: 'AtomExtractionPhase', context: 'related-component' },
  { 
    relation: 'higher-level-abstraction',
    from: 'extractComprehensiveMetadata',
    to: 'AtomExtractionPhase'
  }
]
```

---

## ⚠️ CONSIDERACIONES

### Rendimiento
- **Parsear todos los .md:** ~500ms para 100 archivos
- **LLM por fragmento:** ~2-5s (usar caché agresivamente)
- **Total estimado:** <10s para proyecto completo

### Precisión
- **Sin LLM:** ~70% (falsos positivos en nombres comunes)
- **Con LLM:** ~95% (contexto desambigúa)

### Mantenimiento
- Actualizar cuando cambien docs
- Invalidar caché cuando cambie código referenciado
- Versionar extracciones

---

## 🔗 RELACIÓN CON OTROS SISTEMAS

### Con Shadow Registry
- Shadow: guarda átomos muertos
- Docs: pueden referenciar átomos muertos (docs obsoletos)
- **Sinergia:** Detectar docs que referencian código eliminado

### Con Audit Logger
- Audit: loguea decisiones
- Docs: explican decisiones arquitectónicas
- **Sinergia:** Vincular decisiones con su documentación

### Con 89 Extractores
- Extractors: sacan metadata de código
- Docs: dan contexto semántico
- **Sinergia:** Metadata completa = extractors + docs

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Extraer >80% de referencias reales
- [ ] Falsos positivos <10%
- [ ] Tiempo de procesamiento <30s
- [ ] Cobertura: % de átomos mencionados en docs
- [ ] Métrica: "Health Score" docs ↔ código

---

**Autor:** Claude (Opencode)  
**Fecha:** 2026-02-11  
**Estado:** Propuesta para v1.1.0
