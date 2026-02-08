# Pipeline de Análisis Híbrido (Static + AI)

**Versión**: v0.5.1  
**Última actualización**: 2026-02-06

---

## Overview

El análisis híbrido combina análisis estático (rápido, determinista) con análisis por IA (profundo, para casos complejos).

**Estrategia 80/20**:
- **80%** de detección: Scripts estáticos (zero cost, <200ms)
- **20%** de casos complejos: IA local (síntesis, verificación)

---

## Pipeline Completo

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
    cssConnections: detectCSSConnections(systemMap),    // CSS variables
    riskScores: calculateRiskScores(systemMap, analysis)
  };

  // ========== PHASE 3: IDENTIFY COMPLEX CASES (~10-20% files) ==========
  console.log('🔍 Phase 3: Identify complex cases...');

  const complexFiles = identifyComplexCases(systemMap, semanticStatic);

  // ========== PHASE 4: AI ANALYSIS (only complex, 3-4s each) ==========
  if (complexFiles.length > 0 && config.enableAI) {
    console.log('🤖 Phase 4: AI analysis for complex cases...');
    aiResults = await analyzeWithAI(complexFiles, semanticStatic);
  }

  // ========== PHASE 5: SYNTHESIS (optional, 5s total) ==========
  if (config.enableAISynthesis) {
    console.log('🤖 Phase 5: AI synthesis...');
    synthesis = await synthesizeFindings(semanticStatic, aiResults);
  }

  // ========== PHASE 6: MERGE & SAVE ==========
  console.log('💾 Phase 6: Merge and save...');
  const enhanced = mergeAllAnalyses(systemMap, staticAnalysis, 
                                     semanticStatic, aiResults, synthesis);
  
  return enhanced;
}
```

---

## Identificación de Casos Complejos

### Triggers para Análisis con IA

```javascript
function shouldUseAI(file, staticAnalysis) {
  return (
    file.hasIndirection ||              // Variables como proxies
    file.hasDynamicProperties ||        // window[varName]
    file.complexityScore > 7 ||         // Alto riesgo
    staticAnalysis.lowConfidence ||     // Scripts no seguros
    file.isHotspot && hasSemanticRisk   // Crítico + sospechoso
  );
}
```

### Ejemplos de Casos Complejos

```javascript
// ❌ Scripts NO pueden detectar:

// 1. Indirección
const state = window.gameState;
state.score = 10;  // ¿state === window.gameState?

// 2. Código dinámico
const propName = config.stateProp;
window[propName] = { score: 0 };  // Runtime value

// 3. Chains complejas
const obj = getStateObject();  // ¿Qué devuelve?
obj.score = 10;

// 4. Template strings dinámicos
const eventName = `game:${action}`;  // ¿Qué valor tiene action?
window.eventBus.on(eventName, handler);
```

---

## Modelos de IA

### Modelo Recomendado: LFM2.5-Thinking

| Característica | Valor |
|----------------|-------|
| Precisión | 92-95% |
| Velocidad | 3-4s por análisis |
| Memoria | <900MB |
| Output | JSON estructurado |
| Costo | $0 (modelo local) |

**Beneficios vs Standard**:
- +39% mejor razonamiento
- +16% mejor tool use (JSON output)
- Thinking traces para debug

---

## Prompt para Casos Complejos

```
Análisis estático ya detectó:
- window.gameState accedido en Player.js (línea 15) y UI.js (línea 23)
- Confidence: 1.0 (determinístico)

Tu tarea:
1. Verificar si hay conexiones ADICIONALES no detectadas
2. Analizar IMPACTO de estas conexiones
3. Sugerir severity ajustada por contexto

Output JSON:
{
  "additionalConnections": [...],
  "verification": {
    "staticFindingsCorrect": true,
    "contextAnalysis": "Player modifica score, UI lo lee...",
    "suggestedSeverity": "critical",
    "reasoning": "UI puede mostrar datos stale si..."
  },
  "recommendations": [...]
}
```

---

## Sistema de Confidence Scoring

### Niveles de Confianza

```javascript
const CONFIDENCE_LEVELS = {
  CERTAIN:    { min: 0.95, color: 'green',  source: 'static' },
  PROBABLE:   { min: 0.75, color: 'blue',   source: 'llm' },
  POSSIBLE:   { min: 0.50, color: 'yellow', source: 'llm' },
  UNCERTAIN:  { min: 0.25, color: 'orange', source: 'llm' },
  UNKNOWN:    { min: 0,    color: 'red',    source: 'none' }
};
```

### Ejemplo en el Grafo

```javascript
{
  connections: [
    { 
      target: "user.js", 
      type: "import",
      confidence: 1.0,  // Parser lo vio directamente
      source: "ast"
    },
    { 
      target: "admin.js", 
      type: "probable_dynamic_import",
      confidence: 0.82,  // IA infirió
      source: "llm",
      reasoning: "La función loadModule se usa en rutas de admin"
    }
  ]
}
```

---

## Performance Esperado

| Proyecto | Phase 1-3 (Static) | Phase 4-5 (AI) | Total |
|----------|-------------------|----------------|-------|
| 100 archivos | 5s | 35s (10 files) | ~45s |
| 500 archivos | 25s | 120s (30 files) | ~145s |
| 1000 archivos | 50s | 300s (75 files) | ~350s |

**Savings vs análisis 100% IA**: 77% más rápido

---

## Referencias

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Arquitectura de 3 capas
- [SEMANTIC_LAYER_MODELS.md](SEMANTIC_LAYER_MODELS.md) - Modelos de IA
- [ROADMAP.md](../ROADMAP.md) - Fases de desarrollo

---

*Documento migrado desde ROADMAP3.MD - Metadata + IA = 95% Coverage*
