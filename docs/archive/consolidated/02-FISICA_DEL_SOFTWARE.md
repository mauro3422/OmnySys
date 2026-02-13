---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# FÃ­sica del Software - EvoluciÃ³n Fractal de OmnySys

**VersiÃ³n**: v0.7.0 (Data Flow Fractal)  
**Estado**: Sistema evolutivo en producciÃ³n  
**Metafora**: De cajas con cables a Ã¡tomos con electrones orbitando

---

## ðŸŽ¯ La Gran VisiÃ³n

OmnySys no es solo un "analizador de cÃ³digo". Es un **sistema de fÃ­sica del software** que modela cÃ³mo fluye la informaciÃ³n a travÃ©s de un programa, desde el nivel macro (arquitectura) hasta el nivel cuÃ¡ntico (transformaciones de datos individuales).

**Principio fundamental**: *"El software es un sistema fÃ­sico observable. Al igual que la fÃ­sica modela partÃ­culas y fuerzas, OmnySys modela funciones y flujos de datos."*

---

## ðŸ“ˆ EvoluciÃ³n del Sistema (5 Etapas)

### v0.5 - Box Test: El Mapeo de Cables

**Concepto**: Cada archivo es una caja negra. Al levantarla, ves cables que la conectan con otras cajas.

```
ðŸ“¦ src/api.js
   â”œâ”€â”€ cable â†’ ðŸ“¦ src/auth.js
   â”œâ”€â”€ cable â†’ ðŸ“¦ src/db.js
   â””â”€â”€ cable â†’ ðŸ“¦ src/utils.js
```

**QuÃ© revela**: 
- QuÃ© archivos se conectan entre sÃ­
- DÃ³nde estÃ¡n los "god-objects" (cajas con 20+ cables)
- QuÃ© archivos son "orphans" (cajas sin cables = cÃ³digo muerto)

**LimitaciÃ³n**: Solo vemos el EXTERIOR de las cajas.

**DocumentaciÃ³n**: [ARCHETYPE_SYSTEM.md](architecture/ARCHETYPE_SYSTEM.md)

---

### v0.6 - Arquitectura Molecular: Dentro de la Caja

**Concepto**: Dentro de cada caja (archivo) hay Ã¡tomos (funciones) que se conectan entre sÃ­.

```
ðŸ“¦ src/api.js (MolÃ©cula)
   â”œâ”€â”€ âš›ï¸ fetchUser() â”€â”€â†’ âš›ï¸ validateToken()
   â”œâ”€â”€ âš›ï¸ validateToken() â”€â”€â†’ âš›ï¸ checkPermissions()
   â””â”€â”€ âš›ï¸ formatResponse() (standalone)
```

**QuÃ© revela**:
- QuÃ© funciones existen dentro de cada archivo
- CÃ³mo se llaman entre sÃ­ (call graph interno)
- QuÃ© funciones son "god-functions" (Ã¡tomos con muchas conexiones)
- QuÃ© funciones son "dead code" (Ã¡tomos sin llamadas)

**Principio clave**: **SSOT (Single Source of Truth)**
- La metadata del archivo se DERIVA de sus funciones
- Si cambia una funciÃ³n, se recalcula todo el archivo
- Zero duplicaciÃ³n de datos

**DocumentaciÃ³n**: [ARCHITECTURE_MOLECULAR_PLAN.md](architecture/ARCHITECTURE_MOLECULAR_PLAN.md)

---

### v0.7 - Data Flow Fractal: Los Electrones Orbitando

**Concepto**: Dentro de cada Ã¡tomo (funciÃ³n), los datos fluyen como electrones en Ã³rbitas: entran, se transforman, y salen.

```
âš›ï¸ processOrder(order, userId) (Ãtomo)
   â”‚
   â”œâ”€â”€ ðŸ”„ ENTRADA: order.items â†’
   â”‚   â”œâ”€â”€ ðŸ”„ TRANSFORM: calculateTotal() â†’ total
   â”‚   â””â”€â”€ ðŸ”„ TRANSFORM: getUser() â†’ user
   â”‚       â””â”€â”€ ðŸ”„ TRANSFORM: user.discount â†’ discount
   â”‚           â””â”€â”€ ðŸ”„ TRANSFORM: arithmetic â†’ finalTotal
   â”‚               â””â”€â”€ ðŸ”„ SALIDA: saveOrder() + return {...}
```

**QuÃ© revela**:
- **CÃ³mo viaja un dato**: De parÃ¡metro â†’ transformaciÃ³n â†’ return/side effect
- **Transformaciones**: QuÃ© operaciones se aplican (validaciÃ³n, cÃ¡lculo, merge)
- **Cadenas cross-function**: Salida de A â†’ Entrada de B
- **Race conditions**: Dos funciones async escribiendo al mismo recurso
- **SimulaciÃ³n**: "Si modifico X, Â¿quÃ© funciones se ven afectadas?"

**Principio clave**: **Fractal Aâ†’Bâ†’C**
```
Ãtomo:   Params â†’ Transform â†’ Return
MolÃ©cula: Inputs â†’ Chains    â†’ Outputs  
MÃ³dulo:  Imports â†’ Internal  â†’ Exports
Sistema: Entry   â†’ Business  â†’ Side Effects
```

**DocumentaciÃ³n**: [DATA_FLOW/README.md](DATA_FLOW/README.md)

---

## ðŸ”¬ El Modelo AtÃ³mico Completo

### AnalogÃ­a FÃ­sica

| FÃ­sica Real | OmnySys | QuÃ© modela |
|-------------|---------|------------|
| **Universo** | Sistema (Proyecto) | Todo el cÃ³digo |
| **Galaxia** | MÃ³dulo (Feature) | Carpeta de funcionalidad |
| **Planeta** | MolÃ©cula (Archivo) | Archivo con funciones |
| **Ãtomo** | FunciÃ³n | Unidad bÃ¡sica de ejecuciÃ³n |
| **NÃºcleo** | LÃ³gica interna | El algoritmo de la funciÃ³n |
| **Electrones** | Datos fluyendo | ParÃ¡metros â†’ transformaciones â†’ returns |
| **Orbitales** | Conexiones | CÃ³mo los datos viajan entre funciones |
| **Enlaces quÃ­micos** | Llamadas entre funciones | A llama a B |
| **Campo gravitacional** | Side effects globales | localStorage, eventos, DB |

### JerarquÃ­a de DerivaciÃ³n

```
                    SISTEMA (Universo)
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚ Entry Points    â”‚
                    â”‚ Business Flows  â”‚
                    â”‚ Bottlenecks     â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                             â”‚ DERIVA de mÃ³dulos
           â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
           â”‚                 â”‚                 â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
    â”‚  MÃ“DULO     â”‚  â”‚  MÃ“DULO     â”‚  â”‚  MÃ“DULO     â”‚
    â”‚ (Galaxia)   â”‚  â”‚ (Galaxia)   â”‚  â”‚ (Galaxia)   â”‚
    â”‚ auth/       â”‚  â”‚ cart/       â”‚  â”‚ payment/    â”‚
    â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
           â”‚                â”‚                â”‚
           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚ DERIVA de molÃ©culas
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â”‚             â”‚             â”‚
       â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”
       â”‚ MOLÃ‰CULA   â”‚ â”‚MOLÃ‰CULA â”‚ â”‚ MOLÃ‰CULA   â”‚
       â”‚ (Planeta)  â”‚ â”‚(Planeta)â”‚ â”‚ (Planeta)  â”‚
       â”‚ login.js   â”‚ â”‚cart.js  â”‚ â”‚ checkout.jsâ”‚
       â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜
              â”‚            â”‚             â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚ DERIVA de Ã¡tomos
                 â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                 â”‚         â”‚         â”‚
          â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â” â”Œâ”€â”€â”€â–¼â”€â”€â”€â” â”Œâ”€â”€â”€â–¼â”€â”€â”€â”€â”
          â”‚  ÃTOMO   â”‚ â”‚ ÃTOMO â”‚ â”‚ ÃTOMO  â”‚
          â”‚ validate â”‚ â”‚fetch  â”‚ â”‚process â”‚
          â”‚Credentialâ”‚ â”‚User  â”‚ â”‚Order   â”‚
          â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”˜ â””â”€â”€â”€â”¬â”€â”€â”€â”˜ â””â”€â”€â”€â”¬â”€â”€â”€â”€â”˜
                 â”‚         â”‚         â”‚
                 â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚ EXTRAE vÃ­a AST
                    â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
                    â”‚  ELECTRONES â”‚
                    â”‚  (Data Flow)â”‚
                    â”‚  â€¢ inputs   â”‚
                    â”‚  â€¢ transformsâ”‚
                    â”‚  â€¢ outputs  â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Regla de oro**: Si cambia un electrÃ³n (dato), se recalcula todo hacia arriba hasta el universo.

---

## ðŸ§© CÃ³mo se Conecta Todo

### 1. Box Test â†’ Arquetipos

Los **arquetipos** clasifican quÃ© tipo de cables tiene una caja:

| Arquetipo | QuÃ© cables revela | Nivel |
|-----------|-------------------|-------|
| `god-object` | Caja con 20+ cables a todos lados | MolÃ©cula |
| `network-hub` | Cables compartidos por endpoints de API | MolÃ©cula |
| `event-hub` | Cables invisibles (emit/listen) | MolÃ©cula |
| `god-function` | Ãtomo con muchas conexiones internas | Ãtomo |
| `fragile-network` | Ãtomo que hace fetch sin error handling | Ãtomo |

**ConexiÃ³n con Data Flow**: Un `god-function` suele tener **muchas transformaciones** (electrones complejos).

### 2. Ãtomos â†’ Data Flow

Cada Ã¡tomo tiene:
- **Estructura**: Nombre, parÃ¡metros, complejidad
- **Conexiones**: calls, calledBy
- **Side Effects**: network, DOM, storage
- **Archetype**: Tipo de patrÃ³n
- **Data Flow**: **Inputs â†’ Transformations â†’ Outputs** â­ NUEVO en v0.7

```javascript
// Un Ã¡tomo completo (v0.7)
{
  id: "src/api.js::processOrder",
  name: "processOrder",
  
  // Estructura
  params: ["order", "userId"],
  complexity: 12,
  isAsync: true,
  
  // Conexiones (v0.6)
  calls: ["calculateTotal", "getUser", "saveOrder"],
  calledBy: ["handleRequest"],
  
  // Side Effects (v0.6)
  hasNetworkCalls: true,
  hasStorageAccess: true,
  
  // Arquetipo (v0.5-0.6)
  archetype: {
    type: "read-transform-persist",
    severity: 6
  },
  
  // Data Flow (v0.7) â­ NUEVO
  dataFlow: {
    inputs: [
      { name: "order", usages: [...] },
      { name: "userId", usages: [...] }
    ],
    transformations: [
      { from: "order.items", to: "total", via: "calculateTotal" },
      { from: "userId", to: "user", via: "getUser" },
      { from: ["total", "discount"], to: "finalTotal", operation: "arithmetic" }
    ],
    outputs: [
      { type: "side_effect", target: "saveOrder" },
      { type: "return", shape: "{ orderId, total }" }
    ]
  }
}
```

### 3. Data Flow â†’ SimulaciÃ³n

Con el data flow de TODOS los Ã¡tomos, podemos **simular el viaje de un dato**:

```
SimulaciÃ³n: "Â¿QuÃ© pasa con req.body en handleRequest()?"

Journey:
  Step 1: handleRequest â†’ extrae userData
  Step 2: validateUser â†’ valida email
  Step 3: saveUser â†’ guarda en DB
  Step 4: sendWelcome â†’ envÃ­a email

Impacto: Modificar validateUser afecta a saveUser y sendWelcome
Archivos tocados: 4
Funciones tocadas: 6
Side effects: database_write, email_send
```

Esto es posible porque conectamos:
1. **Salida** de validateUser â†’ **Entrada** de saveUser
2. **Salida** de saveUser â†’ **Entrada** de sendWelcome
3. **Side effects** registrados en cada Ã¡tomo

---

## ðŸŽ¯ Zero LLM: El Determinismo Absoluto

### La Promesa

OmnySys busca **97-99% de cobertura** con **0% de LLM** para la extracciÃ³n.

| Capa | TÃ©cnica | LLM? |
|------|---------|------|
| **Box Test** (v0.5) | AST + grafo de imports | âŒ No |
| **Molecular** (v0.6) | AST + call graph | âŒ No |
| **Data Flow** (v0.7) | AST + visitor pattern | âŒ No |
| **SimulaciÃ³n** (v0.7) | Graph walking | âŒ No |
| **Arquetipos** | Rule-based detection | âŒ No (confidence â‰¥ 0.8) |

### CuÃ¡ndo SÃ usamos LLM

Solo cuando `confidence < 0.8`:

```javascript
// Caso 1: Evidencia suficiente â†’ BYPASS
if (confidence >= 0.8) {
  return { needsLLM: false };  // Ahorramos 2-3 segundos
}

// Caso 2: Evidencia parcial â†’ LLM con contexto
if (confidence >= 0.5) {
  return { 
    needsLLM: true,
    context: "Ya detectÃ©: hasNetworkCalls, hasEventEmitters. Verificar: Â¿coordina mÃºltiples APIs?"
  };
}

// Caso 3: Sin evidencia â†’ Full LLM
return { 
  needsLLM: true,
  context: "AnÃ¡lisis completo necesario"
};
```

**EstimaciÃ³n**: Solo ~2-5% de funciones necesitan LLM.

---

## ðŸ”® MÃ¡s AllÃ¡ del v0.7: Â¿QuÃ© sigue?

El fractal puede seguir profundizando:

### v0.8 - Intra-AtÃ³mico: Dentro de la TransformaciÃ³n

**Concepto**: Dentro de cada transformaciÃ³n (electrÃ³n), podemos ver los **sub-Ã¡tomos**:

```javascript
// TransformaciÃ³n actual (v0.7)
{
  from: "total",
  to: "finalTotal",
  operation: "arithmetic"
}

// Intra-atÃ³mico (v0.8) - MÃS GRANULAR
{
  from: "total",
  to: "finalTotal",
  operation: "arithmetic",
  subOperations: [
    { op: "multiply", operands: ["total", "discount"], result: "savings" },
    { op: "subtract", operands: ["total", "savings"], result: "finalTotal" }
  ],
  precision: "line-by-line"
}
```

**Para quÃ© sirve**: 
- Detectar precision loss en cÃ¡lculos financieros
- Optimizar transformaciones innecesarias
- Validar invariantes matemÃ¡ticos

### v0.9 - Estado CuÃ¡ntico: MÃºltiples Universos

**Concepto**: Simular **todos los paths posibles** (if/else, try/catch):

```javascript
// SimulaciÃ³n multi-universo
function processOrder(order) {
  if (!order.items.length) throw new Error("Empty");  // Universo A
  if (order.total > 10000) applyDiscount();           // Universo B
  return saveOrder(order);                            // Universo C
}

// Posibles universos:
Universe A: order.items=[] â†’ throw â†’ catch â†’ error_response
Universe B: order.total=15000 â†’ applyDiscount â†’ saveOrder â†’ success
Universe C: order.total=5000 â†’ saveOrder â†’ success
```

**Para quÃ© sirve**:
- Generar test cases automÃ¡ticamente (happy path, error path, edge cases)
- Detectar paths no cubiertos por tests
- AnÃ¡lisis de riesgo: "Â¿QuÃ© pasa si falla X?"

### v0.10 - Campo Unificado: Entrelazamiento

**Concepto**: Detectar **entrelazamiento cuÃ¡ntico** entre archivos lejanos:

```javascript
// Archivo A (frontend)
const user = await fetchUser(id);

// Archivo B (backend) 
app.get('/api/user/:id', handler);

// Entrelazamiento detectado:
// frontend.fetchUser() â”€â”€entrelazadoâ”€â”€â†’ backend./api/user/:id
// Si cambia el contrato en B, A se rompe (aunque no haya import directo)
```

**Para quÃ© sirve**:
- Detectar breaking changes en APIs
- Mapear dependencias cross-service
- Validar contratos entre frontend y backend

---

## ðŸ“š DocumentaciÃ³n Relacionada

### Fundamentos
- [CORE_PRINCIPLES.md](architecture/CORE_PRINCIPLES.md) - Los 4 Pilares
- [ARCHITECTURE_MOLECULAR_PLAN.md](architecture/ARCHITECTURE_MOLECULAR_PLAN.md) - Ãtomos y molÃ©culas
- [DATA_FLOW/README.md](DATA_FLOW/README.md) - Flujo de datos Fractal

### ImplementaciÃ³n
- [ARCHETYPE_SYSTEM.md](architecture/ARCHETYPE_SYSTEM.md) - Sistema de arquetipos
- [ARCHETYPE_DEVELOPMENT_GUIDE.md](architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md) - Crear arquetipos
- [HYBRID_ANALYSIS_PIPELINE.md](architecture/HYBRID_ANALYSIS_PIPELINE.md) - Pipeline de anÃ¡lisis

### Ideas Futuras
- [TRANSFORMATION_CONTRACTS.md](ideas/TRANSFORMATION_CONTRACTS.md) - Contratos de tipo
- [VIRTUAL_FLOW_SIMULATION.md](ideas/VIRTUAL_FLOW_SIMULATION.md) - SimulaciÃ³n de flujo
- [UNIVERSAL_PATTERN_ENGINE.md](ideas/UNIVERSAL_PATTERN_ENGINE.md) - Motor de patrones

---

## ðŸŽ“ Resumen para Humanos

**Si solo vas a recordar 3 cosas**:

1. **Cajas con cables** (v0.5): Sabemos quÃ© archivos se conectan
2. **Ãtomos dentro de cajas** (v0.6): Sabemos quÃ© funciones existen y se llaman
3. **Electrones orbitando** (v0.7): Sabemos cÃ³mo fluyen los datos dentro de cada funciÃ³n

**Todo es fractal**: El mismo patrÃ³n Aâ†’Bâ†’C se repite en cada nivel (sistema â†’ mÃ³dulo â†’ molÃ©cula â†’ Ã¡tomo â†’ transformaciÃ³n).

**Todo se deriva**: El sistema no duplica datos. Si cambia un electrÃ³n, se recalcula todo hacia arriba.

**Zero LLM**: 97% del anÃ¡lisis es determinÃ­stico (AST + reglas). Solo el 3% necesita inteligencia artificial.

---

**OmnySys v0.7.0** - Modelando el software como un sistema fÃ­sico observable.

