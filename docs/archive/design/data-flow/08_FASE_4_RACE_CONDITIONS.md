# Fase 4: Detector de Race Conditions

## Objetivo

Detectar condiciones de carrera (race conditions) en el flujo de datos asíncrono del sistema. Identificar cuando múltiples funciones pueden acceder/modificar el mismo estado simultáneamente sin coordinación adecuada.

## Conceptos Clave

### ¿Qué es una Race Condition?

Una race condition ocurre cuando:
1. **Múltiples operaciones asíncronas** acceden al mismo recurso
2. **El orden de ejecución** no está determinístico
3. **El resultado depende** del timing de las operaciones

### Tipos de Race Conditions a Detectar

#### 1. **Read-Write Race (RW)**
```javascript
// Función A lee
const value = globalState.counter;

// Función B escribe (async)
async function increment() {
  globalState.counter++; // Race con A
}
```

#### 2. **Write-Write Race (WW)**
```javascript
// Ambas funciones escriben al mismo tiempo
async function saveUser1() {
  await db.users.update({ id: 1 }, { name: 'A' });
}

async function saveUser2() {
  await db.users.update({ id: 1 }, { name: 'B' }); // Race!
}
```

#### 3. **Async Init Race**
```javascript
// Singleton pattern roto
let connection = null;

async function getConnection() {
  if (!connection) {
    // Race: dos llamadas pueden entrar aquí
    connection = await createConnection();
  }
  return connection;
}
```

#### 4. **Event Handler Race**
```javascript
// Listener puede disparar antes de que el setup complete
emitter.on('data', processData);
// vs
await setupDataSource();
emitter.emit('data', data);
```

## Arquitectura del Detector

### Componentes

```
RaceConditionDetector
├── RacePatternMatcher      # Identifica patrones conocidos
├── DataFlowAnalyzer        # Analiza flujos de datos concurrentes  
├── SharedStateTracker      # Rastrea estado compartido
├── AsyncPathFinder         # Encuentra paths asíncronos
└── RiskScorer              # Calcula severidad del riesgo
```

### Proceso de Detección

1. **Identificar Estado Compartido**
   - Variables globales
   - Propiedades de objetos mutables
   - Recursos externos (DB, files, cache)
   - Singletons/estado de módulo

2. **Encontrar Accessos Concurrentes**
   - Múltiples entry points que acceden al mismo estado
   - Funciones async que no usan locks/coordinación
   - Callbacks/event handlers sin sincronización

3. **Clasificar el Tipo de Race**
   - RW: Read-Write
   - WW: Write-Write
   - RA: Read-Async (lectura durante async op)
   - IE: Initialization Error

4. **Calcular Severidad**
   - **Critical**: Pérdida de datos, corrupción
   - **High**: Inconsistencias, comportamiento no determinístico
   - **Medium**: Performance issues, retries innecesarios
   - **Low**: Teórico, muy improbable

## Implementación

### Paso 1: Estructura Base

```javascript
// src/layer-a-static/race-detector/index.js

export class RaceConditionDetector {
  constructor(projectData) {
    this.project = projectData;
    this.sharedState = new Map(); // stateKey -> accessPoints[]
    this.races = [];
  }

  detect() {
    // 1. Encontrar todo el estado compartido
    this.identifySharedState();
    
    // 2. Encontrar accessos concurrentes
    this.findConcurrentAccesses();
    
    // 3. Detectar race conditions
    this.detectRaces();
    
    // 4. Clasificar y puntuar
    return this.classifyRisks();
  }
}
```

### Paso 2: Identificar Estado Compartido

```javascript
identifySharedState() {
  for (const module of this.project.modules) {
    for (const file of module.files) {
      for (const atom of file.atoms) {
        // Buscar variables globales
        this.trackGlobalVariables(atom);
        
        // Buscar propiedades de objetos exportados
        this.trackExportedObjects(atom);
        
        // Buscar accesos a recursos externos
        this.trackExternalResources(atom);
      }
    }
  }
}

trackGlobalVariables(atom) {
  const globalAccesses = atom.dataFlow?.sideEffects?.filter(se => 
    se.type === 'global_access' || 
    se.type === 'global_modification'
  );
  
  for (const access of globalAccesses) {
    const key = `global.${access.variable}`;
    if (!this.sharedState.has(key)) {
      this.sharedState.set(key, []);
    }
    
    this.sharedState.get(key).push({
      atom: atom.id,
      module: atom.module,
      file: atom.file,
      type: access.type,
      line: access.line,
      isAsync: atom.isAsync
    });
  }
}
```

### Paso 3: Detectar Concurrencia

```javascript
findConcurrentAccesses() {
  for (const [stateKey, accesses] of this.sharedState) {
    // Buscar pares de accessos que pueden ocurrir concurrentemente
    for (let i = 0; i < accesses.length; i++) {
      for (let j = i + 1; j < accesses.length; j++) {
        const access1 = accesses[i];
        const access2 = accesses[j];
        
        // Verificar si pueden ejecutarse concurrentemente
        if (this.canRunConcurrently(access1, access2)) {
          this.checkForRace(stateKey, access1, access2);
        }
      }
    }
  }
}

canRunConcurrently(access1, access2) {
  // Diferentes entry points = pueden ser concurrentes
  if (access1.entryPoint !== access2.entryPoint) {
    return true;
  }
  
  // Una es async y la otra no = race potencial
  if (access1.isAsync !== access2.isAsync) {
    return true;
  }
  
  // Ambas son async en diferentes caminos = race
  if (access1.isAsync && access2.isAsync) {
    // Verificar si hay dependencia de datos entre ellas
    return !this.haveDataDependency(access1, access2);
  }
  
  return false;
}
```

### Paso 4: Detectar Races Específicas

```javascript
checkForRace(stateKey, access1, access2) {
  const race = {
    stateKey,
    type: this.determineRaceType(access1, access2),
    accesses: [access1, access2],
    severity: this.calculateSeverity(access1, access2)
  };
  
  // Verificar si hay mitigación
  race.hasMitigation = this.checkMitigations(access1, access2);
  race.mitigationType = race.hasMitigation ? this.getMitigationType() : null;
  
  if (!race.hasMitigation || race.severity === 'critical') {
    this.races.push(race);
  }
}

determineRaceType(access1, access2) {
  const types = [access1.type, access2.type];
  
  if (types.includes('write') && types.includes('write')) {
    return 'WW'; // Write-Write
  }
  
  if (types.includes('write') && types.includes('read')) {
    return 'RW'; // Read-Write
  }
  
  if (types.includes('initialization')) {
    return 'IE'; // Initialization Error
  }
  
  return 'OTHER';
}
```

### Paso 5: Verificar Mitigaciones

```javascript
checkMitigations(access1, access2) {
  // 1. Verificar si usan locks/semaphores
  if (this.usesLock(access1) || this.usesLock(access2)) {
    return true;
  }
  
  // 2. Verificar si usan atomic operations
  if (this.usesAtomicOperation(access1) && this.usesAtomicOperation(access2)) {
    return true;
  }
  
  // 3. Verificar si hay awaits que fuerzan orden
  if (this.hasOrderingConstraint(access1, access2)) {
    return true;
  }
  
  // 4. Verificar transactions DB
  if (this.inTransaction(access1) && this.inTransaction(access2)) {
    // Verificar si es la misma transaction
    return this.sameTransaction(access1, access2);
  }
  
  return false;
}

usesLock(access) {
  // Buscar uso de mutex, semaphore, lock
  const lockPatterns = [
    /mutex\.lock/,
    /semaphore\.acquire/,
    /\.synchronized\(/,
    /withLock\(/,
    /asyncLock\(/
  ];
  
  return lockPatterns.some(pattern => 
    access.atom.code?.match(pattern)
  );
}
```

## Output Format

```javascript
{
  "races": [
    {
      "id": "race_001",
      "type": "WW",
      "severity": "critical",
      "stateKey": "global.config",
      "description": "Two async functions write to global.config without coordination",
      
      "accesses": [
        {
          "atom": "src/auth/config.js::loadConfig",
          "type": "write",
          "line": 45,
          "isAsync": true
        },
        {
          "atom": "src/admin/setup.js::updateConfig", 
          "type": "write",
          "line": 23,
          "isAsync": true
        }
      ],
      
      "impact": {
        "modules": ["auth", "admin"],
        "businessFlows": ["user-login", "admin-setup"],
        "dataIntegrity": "high"
      },
      
      "hasMitigation": false,
      "suggestedFix": "Use configMutex.lock() or atomic config updates",
      
      "trace": {
        "paths": [
          ["entry:api/auth/login", "loadConfig", "write global.config"],
          ["entry:api/admin/setup", "updateConfig", "write global.config"]
        ]
      }
    }
  ],
  
  "summary": {
    "totalRaces": 5,
    "bySeverity": {
      "critical": 1,
      "high": 2,
      "medium": 1,
      "low": 1
    },
    "byType": {
      "WW": 2,
      "RW": 2,
      "IE": 1
    }
  }
}
```

## Integración con el Sistema

```javascript
// En molecular-extractor.js

async function detectRaceConditions(projectData) {
  const { RaceConditionDetector } = await import('../race-detector/index.js');
  
  const detector = new RaceConditionDetector(projectData);
  const races = detector.detect();
  
  // Agregar a projectData
  projectData.raceConditions = races;
  
  return races;
}
```

## Casos de Uso

### 1. **Pre-deployment Audit**
```javascript
// Antes de deploy, verificar que no hay races críticas
const races = await detectRaceConditions(projectData);
const criticalRaces = races.filter(r => r.severity === 'critical');

if (criticalRaces.length > 0) {
  console.error('❌ Cannot deploy: Critical race conditions detected');
  process.exit(1);
}
```

### 2. **Refactoring Safety**
```javascript
// Antes de refactorizar código async
const races = await detectRaceConditions(projectData);

// Mostrar races en las funciones que voy a modificar
const myRaces = races.filter(r => 
  r.accesses.some(a => a.atom.includes('MyModule'))
);
```

### 3. **Code Review Assistant**
```javascript
// En PR, detectar races introducidos
const baseRaces = detectRaceConditions(baseCode);
const headRaces = detectRaceConditions(headCode);

const newRaces = headRaces.filter(r => 
  !baseRaces.some(br => br.id === r.id)
);

if (newRaces.length > 0) {
  github.comment('⚠️ New race conditions detected...');
}
```

## Métricas y KPIs

- **Detection Rate**: % de races reales detectadas vs falsos positivos
- **Time to Detect**: Tiempo promedio de análisis
- **Coverage**: % del codebase analizado
- **False Positive Rate**: % de reportes que no son races reales

## Próximos Pasos

1. Implementar detector básico (estado compartido global)
2. Agregar soporte para DB transactions
3. Detectar patrones de locks/semaphores
4. Machine learning para reducir falsos positivos
5. Integración con tests para validación

## Referencias

- [Race Condition - Wikipedia](https://en.wikipedia.org/wiki/Race_condition)
- [Node.js Async Best Practices](https://nodejs.org/en/docs/guides/async-best-practices/)
- [JavaScript Concurrency Patterns](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
