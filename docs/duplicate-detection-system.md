# Sistema Unificado de Detección de Duplicados

## 📋 Overview

El sistema de detección de duplicados de OmnySystem ahora cuenta con una arquitectura unificada que coordina:

1. **Duplicados Estructurales** (DNA hash) - Mismas implementación
2. **Duplicados Conceptuales** (semantic fingerprint) - Mismo propósito, diferente implementación
3. **Coordinación Inteligente** - Priorización y tracking unificado

## 🏗️ Arquitectura

```
src/
├── shared/compiler/
│   ├── duplicate-utils.js          ← API unificada
│   └── duplicate-remediation.js    ← Planes de remediación
│
└── core/file-watcher/guards/
    ├── duplicate-risk.js           ← Guard estructural (DNA)
    ├── conceptual-duplicate-risk.js ← Guard conceptual (semántico)
    └── unified-duplicate-guard.js  ← Coordinador unificado
```

## 🔧 API Unificada (`duplicate-utils.js`)

### Funciones Exportadas

```javascript
import {
    generateAlternativeNames,    // Sugiere nombres para evitar colisiones
    normalizeFilePath,           // Normaliza rutas Windows/Unix
    loadPreviousFindings,        // Carga historial de semantic_issues
    buildDuplicateDebtHistory,   // Calcula deuda técnica
    buildDuplicateContext,       // Contexto enriquecido para persistencia
    coordinateDuplicateFindings  // Coordina structural + conceptual
} from '#shared/compiler/duplicate-utils.js';
```

### Ejemplo de Uso

```javascript
// Cargar findings previos
const previousFindings = loadPreviousFindings(db, filePath, 'code_duplicate');

// Calcular deuda técnica
const debtHistory = buildDuplicateDebtHistory(filePath, currentFindings, previousFindings);

console.log(debtHistory.debt);
// {
//   score: 75,           // 0-100
//   level: 'high',       // critical | high | medium | low
//   trend: 'increasing', // increasing | decreasing | stable
//   accumulationRate: 'high'
// }
```

## 🎯 Guards Disponibles

### 1. Structural Duplicate Guard (`duplicate-risk.js`)

Detecta duplicados por **DNA hash** (misma implementación):

```javascript
import { detectDuplicateRisk } from './guards/duplicate-risk.js';

const findings = await detectDuplicateRisk(rootPath, filePath, context, {
    maxFindings: 8,
    minLinesOfCode: 4
});
```

**Características:**
- Compara DNA hash (patternHash, flowType, etc.)
- Detecta copias exactas o casi exactas
- Issue type: `code_duplicate_high` | `code_duplicate_medium`

### 2. Conceptual Duplicate Guard (`conceptual-duplicate-risk.js`)

Detecta duplicados por **semantic fingerprint** (mismo propósito):

```javascript
import { detectConceptualDuplicateRisk } from './guards/conceptual-duplicate-risk.js';

const findings = await detectConceptualDuplicateRisk(rootPath, filePath, context, {
    maxFindings: 5,
    minLinesOfCode: 3
});
```

**Características:**
- Compara semanticFingerprint (verb:domain:entity)
- Detecta funciones con mismo propósito pero diferente implementación
- Issue type: `code_conceptual_duplicate_high` | `code_conceptual_duplicate_medium`

### 3. Unified Duplicate Guard (`unified-duplicate-guard.js`) ⭐

**Coordina ambos guards y proporciona detección unificada:**

```javascript
import { detectUnifiedDuplicateRisk } from './guards/unified-duplicate-guard.js';

const result = await detectUnifiedDuplicateRisk(rootPath, filePath, context, {
    maxFindings: 10,
    minLinesOfCode: 3,
    enableStructural: true,   // Ejecutar guard estructural
    enableConceptual: true    // Ejecutar guard conceptual
});
```

**Retorna:**
```javascript
{
    structural: [...],           // Findings estructurales
    conceptual: [...],           // Findings conceptuales
    coordinated: {
        hasOverlap: true,        // Mismos símbolos en ambos
        priority: 'structural-critical',
        overlapDetails: [...],
        combinedRemediation: [...]
    },
    debtHistory: {
        score: 75,
        level: 'high',
        trend: 'increasing',
        summary: { total: 5, new: 2, persistent: 3, resolved: 1 }
    },
    totalFindings: 5
}
```

## 📊 Sistema de Deuda Técnica

### Cálculo del Score

```
Score = (persistentes × 3) + (nuevos × 2) - (resueltos × 1)
Normalizado a 0-100
```

### Niveles

| Score | Nivel | Acción Recomendada |
|-------|-------|-------------------|
| 75-100 | `critical` | Refactoring sprint inmediato |
| 50-74 | `high` | Priorizar en próximo sprint |
| 25-49 | `medium` | Planificar refactorización |
| 0-24 | `low` | Mantenimiento normal |

### Tendencias

- `critical-increasing`: >5 persistentes + nuevos > resueltos
- `increasing`: Nuevos > resueltos
- `decreasing`: Resueltos > nuevos
- `stable-high`: Persistentes > 0, nuevos = resueltos
- `stable`: Sin deuda acumulada

## 🚀 Uso en File Watcher

El unified guard se registra automáticamente en el registry:

```javascript
// registry.js
this.registerImpactGuard('unified-duplicate-risk', detectUnifiedDuplicateRisk, {
    domain: 'code',
    version: '1.0.0',
    description: 'Unified coordinator for structural (DNA) and conceptual (semantic) duplicate detection'
});
```

Se ejecuta automáticamente cuando un archivo cambia.

## 📝 Ejemplo de Output en Logs

```
[UNIFIED DUPLICATE GUARD] src/my-file.js: 5 total -> buildUser(structural:2), processPayment(conceptual:3) | Debt: high (75/100, increasing)
```

## 🎯 Recomendaciones Automáticas

El sistema genera recomendaciones basadas en el historial:

```javascript
{
    recommendations: [
        {
            priority: 'critical',
            action: 'High technical debt from persistent duplicates. Schedule refactoring sprint.',
            reason: '3 duplicate(s) carried over without resolution'
        },
        {
            priority: 'high',
            action: 'New duplicates detected faster than resolution. Review code review process.',
            reason: '2 new vs 0 resolved'
        }
    ]
}
```

## 🔍 Coordinación de Duplicados

Cuando un símbolo tiene **ambos tipos** de duplicados (structural + conceptual):

```javascript
{
    hasOverlap: true,
    overlapDetails: [{
        symbol: 'buildUser',
        structuralCount: 2,
        conceptualCount: 3,
        totalInstances: 5,
        recommendation: 'CRITICAL: Same symbol has both structural and conceptual duplicates',
        suggestedAction: 'Consolidate all 5 variants into a single canonical implementation'
    }],
    priority: 'structural-critical'
}
```

## 📚 Patrones de Diseño

### 1. **Detección en Paralelo**
```javascript
const [structural, conceptual] = await Promise.all([
    runStructuralGuard(),
    runConceptualGuard()
]);
```

### 2. **Tracking de Historial**
```javascript
const previousFindings = loadPreviousFindings(db, filePath, issueTypePrefix);
const debtHistory = buildDuplicateDebtHistory(current, previous);
```

### 3. **Persistencia Enriquecida**
```javascript
const enrichedContext = buildDuplicateContext(findings, debtHistory);
await persistWatcherIssue(rootPath, filePath, issueType, severity, message, enrichedContext);
```

## 🛠️ Migración

### De Guards Individuales a Unified

**Antes:**
```javascript
await detectDuplicateRisk(rootPath, filePath, context);
await detectConceptualDuplicateRisk(rootPath, filePath, context);
```

**Ahora:**
```javascript
await detectUnifiedDuplicateRisk(rootPath, filePath, context, {
    enableStructural: true,
    enableConceptual: true
});
```

## 📈 Métricas

El sistema trackea:

- **Total findings**: Cantidad total de duplicados
- **Findings nuevos**: Detectados por primera vez
- **Findings persistentes**: Deuda técnica acumulada
- **Findings resueltos**: Issues que desaparecieron
- **Resolution rate**: % de resolución por archivo

## ⚠️ Consideraciones

1. **Performance**: El unified guard ejecuta ambos guards en paralelo
2. **Normalización**: Todas las rutas se normalizan a forward slashes
3. **Historial**: Se carga de `semantic_issues` (último issue por archivo)
4. **Deuda técnica**: Score se recalcula en cada ejecución

## 🔮 Próximos Pasos (Opcional)

- [ ] Agregar umbral configurable por proyecto
- [ ] Integrar con CI/CD para blocking duplicates
- [ ] Dashboard de deuda técnica acumulada
- [ ] Sugerencias de canonical implementation basadas en caller count
