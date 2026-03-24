# Pattern Detection Engine V2

Sistema robusto de detección de patrones de código con heurísticas inteligentes.

## 🎯 Problema que Resuelve

El sistema anterior tenía **falsos positivos masivos**:
- 2001 "deep chains" cuando solo ~20 eran reales
- 33 "shared objects críticos" cuando solo ~3 lo eran
- Quality Score: 0/100 cuando debería ser ~65/100

## 🏗️ Arquitectura SOLID

### S - Single Responsibility
Cada detector hace **UNA** cosa:
- `DeepChainsDetector`: Solo cadenas MUY profundas (>7 niveles)
- `SharedObjectsDetector`: Solo objetos de ESTADO (no config)

### O - Open/Closed
Abierto a extensión:
```javascript
// Añadir detector personalizado
engine.addDetector({
  id: 'my-detector',
  loader: () => import('./my-detector.js'),
  priority: 50
});
```

### L - Liskov Substitution
Todos los detectores implementan la misma interfaz:
```javascript
class MyDetector extends PatternDetector {
  async detect(systemMap) { /* ... */ }
}
```

### I - Interface Segregation
Contratos mínimos y claros:
```javascript
interface PatternDetector {
  getId(): string
  getName(): string
  detect(systemMap): DetectionResult
}
```

### D - Dependency Inversion
El core no depende de implementaciones:
```javascript
// Core depende de abstracción
this.registry.listDetectors().forEach(detector => {
  // No sabe qué detector es, solo ejecuta
});
```

## 📊 Configuración Adaptativa

### Thresholds Configurables

```javascript
const config = {
  thresholds: {
    deepChains: {
      minDepth: 7,        // Solo cadenas > 7 niveles
      maxAcceptable: 20,  // Más de 20 es preocupante
    },
    sharedObjects: {
      minUsageCount: 3,   // Mínimo 3 usos para ser "compartido"
      minRiskScore: 30,   // Score mínimo para ser "crítico"
      configPatterns: [/^CONFIG$/i],  // Patterns de bajo riesgo
      statePatterns: [/store$/i],     // Patterns de alto riesgo
    }
  },
  weights: {
    deepChains: 0.15,     // 15% del score total
    sharedObjects: 0.20,  // 20% del score
  }
};
```

### Por Tipo de Proyecto

```javascript
// Detecta automáticamente y ajusta pesos
const engine = new PatternDetectionEngine();
// 'standard' | 'microservices' | 'library'
```

## 🔍 Heurísticas Inteligentes

### Deep Chains

**ANTES:** Cualquier cadena >= 5 niveles = problema
**AHORA:** Solo cadenas con **riskScore >= 20**

```javascript
riskScore = (depth - 7)² + (fanIn - 3) * 2

Ejemplo:
- Cadena de 8 niveles, fanIn=2:  score = 1 + 0 = 1 (NO reportar)
- Cadena de 10 niveles, fanIn=5: score = 9 + 10 = 19 (NO reportar)
- Cadena de 12 niveles, fanIn=8: score = 25 + 25 = 50 (REPORTAR high)
```

### Shared Objects

**ANTES:** Cualquier objeto mutable usado 2 veces = crítico
**AHORA:** Distingue CONFIG vs STATE

```javascript
// CONFIG (bajo riesgo)
export const CONFIG = { apiUrl: '...' }
// Score: -25 (por naming pattern)

// STATE (alto riesgo)
export const globalStore = { data: [], addItem() {} }
// Score: +35 (state pattern) + 25 (mutators) = 60 (CRÍTICO)

// UTILS (bajo riesgo)
export const helpers = { formatDate() {}, parseJSON() {} }
// Score: -15 (utils pattern)
```

## 🚀 Uso

### Básico

```javascript
import { PatternDetectionEngine } from './pattern-detection/index.js';

const engine = new PatternDetectionEngine();
const results = await engine.analyze(systemMap);

console.log(`Score: ${results.qualityScore.score}/100`);
console.log(`Grade: ${results.qualityScore.grade}`);
```

### Configurado

```javascript
const engine = new PatternDetectionEngine({
  thresholds: {
    deepChains: { minDepth: 10 },  // Solo cadenas > 10
    sharedObjects: { minRiskScore: 50 }  // Solo muy críticos
  },
  weights: {
    deepChains: 0.30,  // Darle más peso
    sharedObjects: 0.10
  }
});
```

### Detector Personalizado

```javascript
import { PatternDetector } from './pattern-detection/engine.js';

class ApiConsistencyDetector extends PatternDetector {
  getId() { return 'apiConsistency'; }
  
  async detect(systemMap) {
    // Tu lógica aquí
    return {
      detector: this.getId(),
      findings: [...],
      score: 85
    };
  }
}

engine.addDetector({
  id: 'apiConsistency',
  loader: async () => ({ default: ApiConsistencyDetector }),
  priority: 80
});
```

## 📈 Resultados Esperados

| Métrica | Antes | Después |
|---------|-------|---------|
| Deep Chains | 2001 | ~15 (reales) |
| Shared Objects Críticos | 33 | ~3 (reales) |
| Quality Score | 0/100 | ~65/100 (B) |
| Falsos Positivos | ~95% | ~10% |

## 🔧 Integración con Sistema Existente

El engine es **100% backward compatible**:

```javascript
// analyzer.js
import { generateAnalysisReport } from './analyzer.js';

// Funciona igual que antes
const report = await generateAnalysisReport(systemMap);

// Pero ahora usa algoritmos V2 cuando están disponibles
```

## 🎓 Lecciones Aprendidas

1. **Cantidad ≠ Calidad**: Más findings no significa mejor análisis
2. **Contexto importa**: Un grafo denso no es malo, solo las cadenas problemáticas
3. **Heurísticas > Reglas rígidas**: Los naming patterns son muy informativos
4. **Thresholds adaptativos**: Cada proyecto tiene necesidades diferentes

## 🛣️ Roadmap

- [ ] Más detectores: race conditions, memory leaks, API inconsistencies
- [ ] Machine Learning: Aprender de los falsos positivos reportados
- [ ] Historical Analysis: Comparar con versiones anteriores
- [ ] IDE Integration: Sugerencias en tiempo real

## 📚 Documentación

- `engine.js` - Core del sistema
- `registry.js` - Registro de detectores
- `aggregator.js` - Agregación de scores
- `detectors/*.js` - Detectores individuales

---

**Versión**: 2.0.0  
**Estado**: ✅ Estable y listo para usar  
**Breaking Changes**: Ninguno (100% compatible)
