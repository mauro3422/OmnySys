# Visión: Código como Sistema Físico

**Versión**: 1.0.0  
**Estado**: Documento de investigación  
**Creado**: 2026-02-18  

---

## La Idea Central

> **El código no es solo texto. Es un sistema físico observable con propiedades medibles, patrones predecibles, y leyes que lo gobiernan.**

Si la física estudia partículas y sus interacciones, OmnySys estudia funciones y sus conexiones. Y al igual que la física, podemos:

1. **Medir** propiedades (complejidad, impacto, entropía)
2. **Predecir** comportamientos (si cambio X, pasa Y)
3. **Reparar** automáticamente (recalcular conexiones)
4. **Detectar** anomalías (entropía alta = código enfermo)

---

## Los Datos que Tenemos

### Layer A Extrae (por archivo)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    17 EXTRACTORES ACTIVOS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CONTRATOS              PATRONES              AVANZADOS                 │
│  ─────────              ─────────              ─────────                │
│  • jsdoc                • async patterns       • side effects           │
│  • runtime              • error handling       • call graph             │
│                         • build deps           • data flow              │
│                                                • type inference         │
│                                                • temporal patterns      │
│                                                • dependency depth       │
│                                                • performance hints      │
│                                                • historical metadata    │
│                                                • DNA                    │
│                                                • error flow             │
│                                                • performance metrics    │
│                                                • type contracts         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lo que Podemos Calcular

```
DADO un átomo (función), podemos saber:

┌─────────────────────────────────────────────────────────────────────────┐
│  PROPIEDAD           │  CÓMO SE CALCULA           │  QUÉ NOS DICE       │
├─────────────────────────────────────────────────────────────────────────┤
│  Complejidad         │  AST + McCabe              │  Dificultad mental  │
│  Impacto             │  usedBy + transitive       │  Blast radius       │
│  Estabilidad         │  cambiosRecientes / total  │  Probabilidad bug   │
│  Entropía            │  conexionesRotas / total   │  Salud del código   │
│  Confianza           │  patronesDetectados        │  Calidad metadata   │
│  Peso                │  α×complejidad + β×impacto │  Importancia        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Concepto 1: Entropía del Código

### Definición

La **entropía** mide qué tan "desordenado" está el código. Igual que en termodinámica:

- **Entropía baja** = Código ordenado, predecible, mantenible
- **Entropía alta** = Código caótico, impredecible, propenso a bugs

### Cálculo Propuesto

```
Entropía(archivo) = -Σ [P(conexión) × log(P(conexión))]

Donde:
- P(conexión) = probabilidad de que una conexión esté "sana"
- Una conexión está "sana" si: confidence >= 0.8 && !isBroken
```

### Ejemplo

```javascript
// Archivo con baja entropía
const lowEntropy = {
  connections: [
    { to: 'utils.js', confidence: 0.95, status: 'healthy' },
    { to: 'config.js', confidence: 0.92, status: 'healthy' },
    { to: 'types.js', confidence: 0.88, status: 'healthy' }
  ]
};
// Entropía ≈ 0.1 (muy ordenado)

// Archivo con alta entropía
const highEntropy = {
  connections: [
    { to: 'utils.js', confidence: 0.95, status: 'healthy' },
    { to: 'MISSING.js', confidence: 0.3, status: 'broken' },
    { to: 'dynamic???', confidence: 0.2, status: 'unknown' },
    { to: 'api.js', confidence: 0.4, status: 'weak' }
  ]
};
// Entropía ≈ 0.8 (caótico)
```

### Aplicación

```
SI Entropía(archivo) > 0.7:
  → ALERTA: "Este archivo necesita refactorización"
  → ACCIÓN: Sugerir simplificación de conexiones
```

---

## Concepto 2: Auto-Reparación

### La Idea

Si tenemos suficiente metadata, el sistema puede **detectar y reparar** automáticamente ciertos problemas:

### Tipos de Auto-Reparación

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TIPO                │  DETECCIÓN              │  REPARACIÓN            │
├─────────────────────────────────────────────────────────────────────────┤
│  Import roto         │  confidence < 0.3       │  Buscar en exportIndex │
│  Función renombrada  │  callGraph.noMatch      │  Sugerir nuevo nombre  │
│  Dependencia faltante│  unresolvedImports      │  Buscar similar        │
│  Tipo incorrecto     │  typeInference.mismatch │  Sugerir tipo correcto │
│  Parámetro agregado  │  signatureChange        │  Actualizar callers    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ejemplo: Import Roto

```javascript
// DETECCIÓN
{
  file: 'src/api.js',
  import: { source: './utils', resolved: null, status: 'broken' },
  confidence: 0.2
}

// ANÁLISIS DEL SISTEMA
const suggestions = exportIndex.search('utils');
// → ['src/lib/utils.js', 'src/helpers/utils.js', 'src/common/utils.js']

// VERIFICACIÓN
for (const candidate of suggestions) {
  const exports = exportIndex[candidate];
  if (exports.includes('requiredFunction')) {
    return { fix: `import from '${candidate}'`, confidence: 0.85 };
  }
}

// AUTO-REPARACIÓN (con aprobación del usuario)
applyFix(file, oldImport, newImport);
```

### Limitaciones

```
✅ PUEDE AUTO-REPARAR:
   - Imports con paths incorrectos
   - Renombres de funciones exportadas
   - Parámetros agregados con defaults

⚠️ NECESITA CONFIRMACIÓN:
   - Cambios en múltiples archivos
   - Modificaciones de tipos
   - Refactorings grandes

❌ NO PUEDE (aún):
   - Lógica de negocio
   - Cambios semánticos
   - Decisiones de diseño
```

---

## Concepto 3: Sociedad de Átomos

### La Idea

Las funciones no existen en aislamiento. Forman **sociedades** con reglas emergentes:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SOCIEDAD DE ÁTOMOS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│     [fetchUser] ──────→ [validateUser] ──────→ [saveUser]              │
│          │                    │                    │                    │
│          │                    │                    │                    │
│          ↓                    ↓                    ↓                    │
│     [cacheUser]          [logEvent]          [notifyUser]              │
│          │                                         │                    │
│          └─────────────────────────────────────────┘                    │
│                              │                                          │
│                              ↓                                          │
│                     [auditLog]                                          │
│                                                                         │
│  PROPIEDADES EMERGENTES:                                                │
│  • fetchUser + validateUser + saveUser = "User Creation Pipeline"      │
│  • cacheUser + notifyUser = "Side Effect Chain"                        │
│  • Todos conectados a auditLog = "Observability Pattern"               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detección de Sociedades

```javascript
// Algoritmo para detectar sociedades
function detectSociety(atoms) {
  const societies = [];
  
  // 1. Detectar cadenas (chains)
  const chains = findSequentialChains(atoms);
  // fetchUser → validateUser → saveUser = "User Creation Chain"
  
  // 2. Detectar clusters (funciones que se llaman mutuamente)
  const clusters = findClusters(atoms);
  // {fetchUser, cacheUser, notifyUser} = "User Side Effects"
  
  // 3. Detectar hubs (funciones conectadas a muchas)
  const hubs = findHubs(atoms);
  // auditLog conectado a 15 funciones = "Observability Hub"
  
  // 4. Calcular propiedades de la sociedad
  return societies.map(s => ({
    ...s,
    entropy: calculateEntropy(s),
    cohesion: calculateCohesion(s),  // Qué tan conectados están
    stability: calculateStability(s) // Qué tan propenso a cambios
  }));
}
```

### Métricas de Sociedad

```
COHESIÓN: Qué tan conectados están los miembros
┌─────────────────────────────────────────────────────────────────────────┐
│  Cohesión = conexionesInternas / (n × (n-1))                            │
│                                                                         │
│  n = número de átomos en la sociedad                                    │
│  Cohesión alta (0.8+) = Funciones muy interdependientes                │
│  Cohesión baja (0.2-) = Funciones débilmente conectadas                │
└─────────────────────────────────────────────────────────────────────────┘

ESTABILIDAD: Qué tan propensa a cambios
┌─────────────────────────────────────────────────────────────────────────┐
│  Estabilidad = 1 - (cambiosRecientes / conexionesTotales)               │
│                                                                         │
│  Estabilidad alta = Sociedad madura, cambios predecibles              │
│  Estabilidad baja = Sociedad inestable, muchos cambios recientes      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Concepto 4: Límites Matemáticos

### La Idea

Cada función tiene **límites** matemáticos. Si los excede, algo está mal:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LÍMITE              │  VALOR MÁXIMO     │  QUÉ INDICA SI EXCEDE       │
├─────────────────────────────────────────────────────────────────────────┤
│  Complejidad         │  15               │  Función hace demasiado     │
│  Parámetros          │  4                │  Demasiadas responsabilidades│
│  Calls salientes     │  10               │  Acoplamiento alto          │
│  Calls entrantes     │  20               │  God function candidate     │
│  Profundidad nested  │  4                │  Difícil de entender        │
│  Líneas              │  50               │  Necesita split             │
│  Entropía            │  0.6              │  Código enfermo             │
│  Duplicidad          │  3                │  Código repetido            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fórmula de Salud

```
Salud(función) = 
  Σ [peso × (1 - violación/ límite)]
  
Donde:
- peso = importancia de cada métrica
- violación = valor actual si excede límite, 0 si no
- límite = valor máximo permitido

Ejemplo:
  complejidad: 18 (límite 15) → violación = 3
  params: 3 (límite 4) → violación = 0
  
  Salud = 0.3×(1-3/15) + 0.2×(1-0/4) + ...
        = 0.3×0.8 + 0.2×1 + ...
        = 0.24 + 0.2 + ...
```

---

## Concepto 5: Predicción de Cambios

### La Idea

Con suficiente historia, podemos **predecir** qué cambios son probables:

```javascript
// ANÁLISIS HISTÓRICO
const history = {
  'fetchUser': {
    changes: [
      { date: '2026-01-10', type: 'param_added', param: 'options' },
      { date: '2026-01-15', type: 'error_added', error: 'NetworkError' },
      { date: '2026-02-01', type: 'cache_added' }
    ],
    patterns: ['validation_added_after', 'error_handling_evolved']
  }
};

// PREDICCIÓN
function predictChanges(atom, history) {
  const similarAtoms = findSimilar(atom);  // Por ADN
  const historicalPatterns = analyzePatterns(similarAtoms);
  
  return {
    likelyChanges: [
      { type: 'error_handling', probability: 0.75, reason: '78% de funciones similares agregaron' },
      { type: 'validation', probability: 0.65, reason: 'Patrón detectado en clan' },
      { type: 'caching', probability: 0.45, reason: 'Tendencia en el proyecto' }
    ],
    recommendations: [
      'Consider adding error handling before production',
      'Validate inputs early (pattern: validate-then-process)'
    ]
  };
}
```

---

## Roadmap de Implementación

### Fase 1: Métricas Base (Q1 2026)

```
☐ Implementar cálculo de entropía
☐ Implementar cálculo de salud
☐ Agregar límites configurables
☐ Visualizar métricas en dashboard
```

### Fase 2: Auto-Reparación Básica (Q2 2026)

```
☐ Detectar imports rotos
☐ Sugerir reparaciones
☐ Aplicar con aprobación del usuario
☐ Log de reparaciones aplicadas
```

### Fase 3: Sociedades (Q3 2026)

```
☐ Detectar cadenas automáticamente
☐ Detectar clusters
☐ Calcular cohesión y estabilidad
☐ Sugerir refactorings basados en sociedades
```

### Fase 4: Predicción (Q4 2026)

```
☐ Recolectar historia de cambios
☐ Analizar patrones históricos
☐ Predecir cambios probables
☐ Sugerir preventivamente
```

---

## Filosofía: Código como Física

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   "El código obedece leyes, igual que la física.                       │
│    Nuestro trabajo es descubrirlas y usarlas."                          │
│                                                                         │
│   LEYES DEL CÓDIGO (propuestas):                                        │
│                                                                         │
│   1ª Ley: La entropía siempre aumenta (sin intervención)               │
│           → El código se degrada si no se mantiene                     │
│                                                                         │
│   2ª Ley: El impacto se propaga con decaimiento exponencial            │
│           → Cambios lejanos afectan menos que cambios cercanos         │
│                                                                         │
│   3ª Ley: Toda acción tiene una reacción en el grafo                   │
│           → Cambiar X siempre afecta a Y (visible o no)                │
│                                                                         │
│   4ª Ley: La complejidad tiene un límite natural                       │
│           → Funciones > 15 complejidad tienden a dividirse             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Referencias

- [layer-graph.md](./layer-graph.md) - Sistema de grafos con pesos
- [principles.md](../01-core/principles.md) - Los 4 Pilares
- [philosophy.md](../01-core/philosophy.md) - Física del Software
- [archetypes.md](./archetypes.md) - Sistema de confianza

---

**Este documento es vivo.** A medida que descubramos más patrones, los agregaremos aquí.
