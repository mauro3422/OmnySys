### 5.5: Flujo Híbrido Completo (Static + AI)

**Pipeline integrado**:

```javascript
async function analyzeProjectHybrid(projectPath) {
  // ========== PHASE 1: STATIC ANALYSIS (100% files, <200ms) ==========
  console.log('🔍 Phase 1: Static analysis...');

  const systemMap = await buildSystemMap(projectPath);
  const staticAnalysis = await analyzeSystemMap(systemMap);

  // ========== PHASE 2: SEMANTIC - STATIC (100% files, <200ms) ==========
  console.log('🔍 Phase 2: Semantic detection (scripts)...');

  const semanticStatic = {
    sharedState: detectSharedState(systemMap),          // window.*, global.*
    eventPatterns: detectEventPatterns(systemMap),      // on(), emit()
    sideEffects: detectSideEffects(systemMap),          // DOM, network, storage
    riskScores: calculateRiskScores(systemMap, analysis) // Rule-based
  };

  // ========== PHASE 3: IDENTIFY COMPLEX CASES (~10-20% files) ==========
  console.log('🔍 Phase 3: Identify complex cases...');

  const complexFiles = identifyComplexCases(systemMap, semanticStatic);

  console.log(`  → ${complexFiles.length} files need AI analysis`);
  console.log(`  → ${systemMap.files.length - complexFiles.length} files done with scripts`);

  // ========== PHASE 4: AI ANALYSIS (only complex, 2s each) ==========
  let aiResults = {};

  if (complexFiles.length > 0 && config.enableAI) {
    console.log('🤖 Phase 4: AI analysis for complex cases...');
    aiResults = await analyzeWithAI(complexFiles, semanticStatic);
  }

  // ========== PHASE 5: SYNTHESIS (optional, 5s total) ==========
  let synthesis = null;

  if (config.enableAISynthesis) {
    console.log('🤖 Phase 5: AI synthesis...');
    synthesis = await synthesizeFindings(semanticStatic, aiResults);
  }

  // ========== PHASE 6: MERGE & SAVE ==========
  console.log('💾 Phase 6: Merge and save...');

  const enhanced = mergeAllAnalyses(
    systemMap,
    staticAnalysis,
    semanticStatic,
    aiResults,
    synthesis
  );

  fs.writeFileSync('enhanced-system-map.json', JSON.stringify(enhanced, null, 2));

  return enhanced;
}
```

**Identificación de casos complejos**:

```javascript
function identifyComplexCases(systemMap, semanticStatic) {
  const complexFiles = [];

  for (const [filePath, fileInfo] of Object.entries(systemMap.files)) {
    const needsAI =
      // 1. Alto riesgo + bajo confidence
      (fileInfo.riskScore > 7 && hasLowConfidencePatterns(fileInfo)) ||

      // 2. Hotspot con semantic connections
      (isHotspot(filePath, analysis) && semanticStatic.connections[filePath]?.length > 0) ||

      // 3. Código dinámico detectado
      hasDynamicPatterns(fileInfo) ||

      // 4. Indirección compleja
      hasIndirection(fileInfo) ||

      // 5. Configuración manual (flags en código)
      fileInfo.forceAIAnalysis;

    if (needsAI) {
      complexFiles.push({
        path: filePath,
        reason: getComplexityReason(fileInfo),
        staticFindings: semanticStatic.connections[filePath] || []
      });
    }
  }

  return complexFiles;
}
```

**Merge de resultados**:

```javascript
function mergeAllAnalyses(systemMap, staticAnalysis, semanticStatic, aiResults, synthesis) {
  const enhanced = {
    metadata: {
      version: '0.4.0',
      generated: new Date().toISOString(),
      analyzers: {
        static: 'layer-a-v0.3.4',
        semanticStatic: 'layer-a-extended-v0.3.5',
        semanticAI: aiResults ? 'layer-b-lfm2.5-thinking-v1' : null
      },
      stats: {
        totalFiles: Object.keys(systemMap.files).length,
        analyzedWithScripts: Object.keys(systemMap.files).length - (aiResults ? Object.keys(aiResults).length : 0),
        analyzedWithAI: aiResults ? Object.keys(aiResults).length : 0,
        aiUsagePercentage: aiResults ? (Object.keys(aiResults).length / Object.keys(systemMap.files).length * 100).toFixed(1) + '%' : '0%'
      }
    },
    files: {},
    synthesis: synthesis || null
  };

  for (const [filePath, fileInfo] of Object.entries(systemMap.files)) {
    enhanced.files[filePath] = {
      // Static analysis
      ...fileInfo,

      // Semantic - Static
      semanticConnections: semanticStatic.connections[filePath] || [],
      sideEffects: semanticStatic.sideEffects[filePath] || {},
      riskScore: semanticStatic.riskScores[filePath] || { total: 0 },

      // AI results (if analyzed)
      aiEnhancement: aiResults[filePath] || null,

      // Analysis metadata
      analysis: {
        staticAnalyzed: true,
        semanticStaticAnalyzed: true,
        aiAnalyzed: !!aiResults[filePath],
        needsReanalysis: false
      }
    };
  }

  return enhanced;
}
```

**Performance esperado**:

```
Project: 100 files

Phase 1: Static analysis           → 2s
Phase 2: Semantic (scripts)        → 2s
Phase 3: Identify complex          → 0.1s
Phase 4: AI (10 files @ 2s each)   → 20s
Phase 5: Synthesis                 → 5s
Phase 6: Merge & save              → 0.5s

TOTAL: ~30s (vs 200s si TODO fuera con IA)
Savings: 85% faster
```

**Configuración**:

```javascript
// cognisystem.config.js
module.exports = {
  semantic: {
    // Static detection (always enabled)
    staticDetection: true,

    // AI analysis (optional)
    enableAI: false,  // Default: false (zero cost)
    aiThreshold: {
      riskScore: 7,           // Analizar con IA si risk >= 7
      hotspotConnections: 3,  // Hotspot + 3+ connections
      complexityScore: 8      // Complexity >= 8
    },

    // AI synthesis (optional)
    enableAISynthesis: false,  // Default: false

    // Model
    aiModel: 'lfm2.5-thinking',
    aiModelPath: '~/.cache/lm-studio/models/lfm2.5-1.2b-thinking'
  }
};
```

### 5.6: Validación del Enfoque Híbrido

**Test en scenario-2-semantic**:

```bash
# 1. Solo scripts (sin IA)
npm run analyze:semantic-static test-cases/scenario-2-semantic/src

# Expected:
✅ 3 shared_state connections (100% detected)
✅ 3 event_listener connections (100% detected)
✅ 6 side effects (100% detected)
✅ Risk scores: 4.0-7.5
✅ Time: <200ms
✅ Cost: $0

# 2. Con IA (casos complejos)
npm run analyze:semantic-hybrid test-cases/scenario-2-semantic/src

# Expected:
✅ Same connections (AI confirma, no agrega)
✅ Enhanced severity (AI ajusta por contexto)
✅ Synthesis: "Player-UI connection is critical due to real-time updates"
✅ Time: ~5s (solo synthesis)
✅ Cost: $0 (modelo local)
```

**Resultado esperado**:
- Scripts detectan 100% en caso simple
- IA agrega valor en synthesis y context understanding
- No hay diferencia en detección (validación del enfoque)

---

## FASE 6: Auto-Update + File Watching

**Objetivo**: Mantener el mapa actualizado sin regenerar todo

### 6.1: Incremental Rebuild

**Estrategia**:
```javascript
// Solo re-analizar archivos afectados
fileWatcher.on('change', (changedFile) => {
  const affectedFiles = [
    changedFile,
    ...systemMap.files[changedFile].usedBy,
    ...systemMap.files[changedFile].dependsOn
  ];

  reanalyzeFiles(affectedFiles); // Solo esto, no todo
  updateSystemMap(affectedFiles);
});
```

### 6.2: SQLite Migration

**Entregables**:
- Migrar de JSON a SQLite para queries O(1)
- Schema optimizado para búsquedas

```sql
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  content TEXT,
  last_analyzed TIMESTAMP
);

CREATE TABLE dependencies (
  from_file TEXT,
  to_file TEXT,
  type TEXT,
  symbols TEXT,
  PRIMARY KEY (from_file, to_file)
);

CREATE INDEX idx_usedBy ON dependencies(to_file);
CREATE INDEX idx_dependsOn ON dependencies(from_file);
```

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

**✅ COMPLETADO**: Phase 1, 2, 3.0, 3.1, 3.2, 3.3, 3.4
**📍 ACTUAL**: Phase 3.4 - Semantic Layer Data Architecture (v0.3.4)
**⏭️ SIGUIENTE**: Phase 3.5 - Semantic Detection Static (Hybrid Approach)

**Estrategia**: Enfoque híbrido 80/20
- 80% detección con scripts (zero cost, <200ms)
- 20% casos complejos con IA (cuando sea necesario)
- IA para síntesis y verificación (opcional)

**Versión**: v0.3.4
**Quality Score**: 98/100 (Grade A)
**Última actualización**: 2026-02-02

**Próximas implementaciones**:
1. Phase 3.5: Static semantic detection (scripts puros)
2. Phase 4: MCP Server
3. Phase 5: AI layer (casos complejos solo)
