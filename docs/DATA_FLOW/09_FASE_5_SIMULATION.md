# Fase 5: Motor de Simulación

## Objetivo

Simular la ejecución del sistema completo para detectar problemas antes de correr el código. Ejecutar "what-if" scenarios para validar cambios y predecir comportamiento.

## Conceptos Clave

### ¿Qué es la Simulación?

Ejecutar el código **virtualmente** para:
1. Predecir el flujo de datos en diferentes escenarios
2. Detectar errores sin ejecutar el sistema real
3. Validar cambios antes de implementarlos
4. Generar casos de prueba automáticamente

### Tipos de Simulación

#### 1. **Simulación Estática** (Fase 5a)
- Analiza caminos posibles sin ejecutar
- Detecta dead code, infinite loops
- Valida tipos y estructuras

#### 2. **Simulación Simbólica** (Fase 5b)
- Usa valores simbólicos en lugar de reales
- Ejecuta todas las branches posibles
- Genera constraints (x > 0, y !== null)

#### 3. **Simulación Concreta** (Fase 5c)
- Usa valores reales de ejemplo
- Simula ejecución real con mocks
- Detecta comportamiento específico

#### 4. **Simulación Probabilística** (Fase 5d)
- Introduce aleatoriedad en timing
- Simula carga y concurrencia
- Predice performance y races

## Arquitectura del Motor

### Componentes

```
SimulationEngine
├── PathExplorer          # Explora caminos de ejecución
├── SymbolicExecutor      # Ejecuta con valores simbólicos
├── ConstraintSolver      # Resuelve constraints lógicos
├── StateManager          # Maneja estado de la simulación
├── MockProvider          # Provee mocks para external calls
├── EventScheduler        # Maneja timing y async operations
└── ResultAnalyzer        # Analiza resultados de simulación
```

### Tipos de Nodos de Simulación

```javascript
const NODE_TYPES = {
  // Control Flow
  ENTRY: 'entry',           // Punto de entrada
  BRANCH: 'branch',         // if/else, switch
  LOOP: 'loop',             // for, while
  RETURN: 'return',         // Salida de función
  
  // Data Transform
  ASSIGN: 'assign',         // Asignación de variable
  TRANSFORM: 'transform',   // Operación (a + b, etc.)
  ACCESS: 'access',         // Lectura de variable
  
  // Side Effects
  CALL: 'call',             // Llamada a función
  ASYNC_CALL: 'async_call', // Llamada async
  EVENT: 'event',           // Emisión de evento
  ERROR: 'error',           // Throw error
  
  // State
  STATE_READ: 'state_read',   // Leer estado compartido
  STATE_WRITE: 'state_write'  // Escribir estado compartido
};
```

## Implementación

### Paso 1: Compilación a IR (Intermediate Representation)

```javascript
// src/layer-a-static/simulation/compiler.js

export class SimulationCompiler {
  compile(atom) {
    // Convertir atom a formato ejecutable
    const ir = {
      id: atom.id,
      params: this.compileParams(atom),
      locals: new Map(),
      blocks: this.compileBlocks(atom),
      entry: 'block_0'
    };
    
    return ir;
  }
  
  compileParams(atom) {
    return atom.dataFlow?.inputs?.map((input, index) => ({
      name: input.name,
      index,
      type: input.type,
      symbolic: true // Empezar como simbólico
    })) || [];
  }
  
  compileBlocks(atom) {
    const blocks = new Map();
    
    // Crear bloques básicos basados en dataFlow
    const transforms = atom.dataFlow?.transformations || [];
    let currentBlock = { id: 'block_0', instructions: [] };
    
    for (const transform of transforms) {
      const instruction = this.compileTransform(transform);
      
      // Si es branch, crear nuevo bloque
      if (instruction.type === 'BRANCH') {
        blocks.set(currentBlock.id, currentBlock);
        
        // Bloque then
        const thenBlock = { 
          id: `block_${blocks.size}`, 
          instructions: [] 
        };
        
        // Bloque else
        const elseBlock = { 
          id: `block_${blocks.size + 1}`, 
          instructions: [] 
        };
        
        instruction.thenBlock = thenBlock.id;
        instruction.elseBlock = elseBlock.id;
        
        currentBlock.instructions.push(instruction);
        blocks.set(currentBlock.id, currentBlock);
        
        // Continuar con then block
        currentBlock = thenBlock;
      } else {
        currentBlock.instructions.push(instruction);
      }
    }
    
    // Agregar return al final
    currentBlock.instructions.push({
      type: 'RETURN',
      value: this.getReturnValue(atom)
    });
    
    blocks.set(currentBlock.id, currentBlock);
    
    return blocks;
  }
  
  compileTransform(transform) {
    return {
      type: transform.type,
      operation: transform.operation,
      inputs: transform.inputs,
      output: transform.output,
      line: transform.line
    };
  }
}
```

### Paso 2: Ejecución Simbólica

```javascript
// src/layer-a-static/simulation/symbolic-executor.js

export class SymbolicExecutor {
  execute(ir, initialState = {}) {
    const paths = [];
    const context = {
      state: { ...initialState },
      constraints: [],
      path: [],
      depth: 0
    };
    
    this.executeBlock(ir, ir.blocks.get(ir.entry), context, paths);
    
    return {
      paths,
      totalPaths: paths.length,
      coverage: this.calculateCoverage(ir, paths)
    };
  }
  
  executeBlock(ir, block, context, paths) {
    if (context.depth > 100) {
      // Límite de profundidad para evitar loops infinitos
      paths.push({ ...context, status: 'DEPTH_LIMIT' });
      return;
    }
    
    for (const instruction of block.instructions) {
      context.path.push({
        block: block.id,
        instruction: instruction.type,
        line: instruction.line
      });
      
      switch (instruction.type) {
        case 'BRANCH':
          this.executeBranch(ir, instruction, context, paths);
          return; // Branch termina este camino
          
        case 'ASSIGN':
          this.executeAssign(instruction, context);
          break;
          
        case 'TRANSFORM':
          this.executeTransform(instruction, context);
          break;
          
        case 'CALL':
          this.executeCall(instruction, context);
          break;
          
        case 'ASYNC_CALL':
          this.executeAsyncCall(instruction, context);
          break;
          
        case 'RETURN':
          paths.push({
            ...context,
            status: 'COMPLETED',
            returnValue: instruction.value
          });
          return;
          
        case 'STATE_READ':
        case 'STATE_WRITE':
          this.trackStateAccess(instruction, context);
          break;
      }
    }
  }
  
  executeBranch(ir, instruction, context, paths) {
    // Path 1: Condición verdadera
    const thenContext = this.cloneContext(context);
    thenContext.constraints.push({
      type: 'ASSUME_TRUE',
      condition: instruction.condition
    });
    thenContext.depth++;
    
    const thenBlock = ir.blocks.get(instruction.thenBlock);
    this.executeBlock(ir, thenBlock, thenContext, paths);
    
    // Path 2: Condición falsa
    const elseContext = this.cloneContext(context);
    elseContext.constraints.push({
      type: 'ASSUME_FALSE',
      condition: instruction.condition
    });
    elseContext.depth++;
    
    const elseBlock = ir.blocks.get(instruction.elseBlock);
    this.executeBlock(ir, elseBlock, elseContext, paths);
  }
  
  executeAssign(instruction, context) {
    const value = this.evaluateSymbolic(instruction.value, context);
    context.state[instruction.target] = value;
  }
  
  executeTransform(instruction, context) {
    // Crear valor simbólico resultante
    const inputs = instruction.inputs.map(i => 
      this.resolveValue(i, context)
    );
    
    const output = {
      type: 'SYMBOLIC',
      operation: instruction.operation,
      inputs,
      constraints: this.inferConstraints(instruction.operation, inputs)
    };
    
    context.state[instruction.output.name] = output;
  }
}
```

### Paso 3: Sistema de Constraints

```javascript
// src/layer-a-static/simulation/constraint-solver.js

export class ConstraintSolver {
  constructor() {
    this.constraints = [];
  }
  
  addConstraint(constraint) {
    this.constraints.push(constraint);
  }
  
  // Verificar si un conjunto de constraints es satisfacible
  isSatisfiable() {
    // Simplificación: usar librería Z3 o similar
    // Por ahora, implementación básica
    
    for (const constraint of this.constraints) {
      if (!this.checkConstraint(constraint)) {
        return false;
      }
    }
    
    return true;
  }
  
  checkConstraint(constraint) {
    switch (constraint.type) {
      case 'EQUALS':
        return this.valuesEqual(constraint.left, constraint.right);
        
      case 'NOT_EQUALS':
        return !this.valuesEqual(constraint.left, constraint.right);
        
      case 'GREATER_THAN':
        return this.greaterThan(constraint.left, constraint.right);
        
      case 'LESS_THAN':
        return this.lessThan(constraint.left, constraint.right);
        
      case 'TYPE_CHECK':
        return this.checkType(constraint.value, constraint.expectedType);
        
      case 'NOT_NULL':
        return constraint.value !== null && constraint.value !== undefined;
        
      default:
        return true; // Optimistic
    }
  }
  
  // Encontrar valores concretos que satisfagan constraints
  findSolution() {
    const solution = {};
    
    for (const constraint of this.constraints) {
      if (constraint.type === 'EQUALS' && constraint.left.type === 'VARIABLE') {
        solution[constraint.left.name] = this.concretize(constraint.right);
      }
    }
    
    return solution;
  }
}
```

### Paso 4: Generación de Casos de Prueba

```javascript
// src/layer-a-static/simulation/test-generator.js

export class TestCaseGenerator {
  generateTests(simulationResult, atom) {
    const tests = [];
    
    for (const path of simulationResult.paths) {
      if (path.status === 'COMPLETED') {
        const test = this.generateTestFromPath(path, atom);
        tests.push(test);
      }
    }
    
    return tests;
  }
  
  generateTestFromPath(path, atom) {
    // Resolver constraints para obtener inputs concretos
    const solver = new ConstraintSolver();
    
    for (const constraint of path.constraints) {
      solver.addConstraint(constraint);
    }
    
    const inputs = solver.findSolution();
    
    return {
      name: `test_${atom.name}_${path.path.length}_steps`,
      description: this.generateDescription(path),
      function: atom.name,
      inputs,
      expectedOutput: this.concretize(path.returnValue),
      path: path.path.map(p => p.line),
      constraints: path.constraints,
      
      // Código del test
      code: this.generateTestCode(atom, inputs, path.returnValue)
    };
  }
  
  generateTestCode(atom, inputs, expectedOutput) {
    const inputStr = Object.entries(inputs)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    
    const expectedStr = JSON.stringify(this.concretize(expectedOutput));
    
    return `
      test('${atom.name} with ${inputStr}', async () => {
        const result = await ${atom.name}(${Object.keys(inputs).join(', ')});
        expect(result).toEqual(${expectedStr});
      });
    `;
  }
}
```

## Scenarios de Simulación

### 1. **What-If Analysis**

```javascript
// ¿Qué pasa si cambio esta función?
const simulation = await simulator.whatIf({
  target: 'src/auth/login.js::validatePassword',
  change: {
    type: 'MODIFY',
    addCheck: 'password.length >= 8'
  }
});

console.log(simulation.impact);
// {
//   affectedFunctions: 5,
//   brokenPaths: 2,
//   newConstraints: ['password.length >= 8'],
//   testCases: [...]
// }
```

### 2. **Path Coverage Analysis**

```javascript
// Qué caminos no están cubiertos por tests
const coverage = await simulator.analyzeCoverage({
  function: 'src/orders/process.js::processOrder',
  existingTests: [...]
});

console.log(coverage.uncoveredPaths);
// [
//   { path: [...], condition: 'order.total < 0' },
//   { path: [...], condition: 'user == null' }
// ]
```

### 3. **Dead Code Detection**

```javascript
// Qué código nunca se ejecuta
const deadCode = await simulator.findDeadCode({
  entryPoints: ['src/api/server.js']
});

console.log(deadCode);
// [
//   { function: 'unusedHelper', reason: 'No reachable path' },
//   { line: 45, reason: 'Condition always false' }
// ]
```

### 4. **Performance Prediction**

```javascript
// Predecir performance bajo carga
const performance = await simulator.predictPerformance({
  scenario: '100_concurrent_requests',
  entryPoint: 'src/api/users.js::getUsers'
});

console.log(performance);
// {
//   estimatedTime: '120ms',
//   bottlenecks: ['db.query', 'json.stringify'],
//   raceConditions: [...]
// }
```

## Integración con el Sistema

```javascript
// En molecular-extractor.js

async function simulateProject(projectData) {
  const { SimulationEngine } = await import('../simulation/index.js');
  
  const engine = new SimulationEngine(projectData);
  
  // Simular todos los entry points
  const results = await engine.simulateAllEntryPoints();
  
  // Generar casos de prueba
  const testCases = engine.generateTestCases();
  
  // Detectar código muerto
  const deadCode = engine.findDeadCode();
  
  projectData.simulation = {
    results,
    testCases,
    deadCode,
    coverage: engine.calculateCoverage()
  };
  
  return projectData;
}
```

## Output Format

```javascript
{
  "simulation": {
    "executedAt": "2026-02-09T12:00:00Z",
    "duration": "2.5s",
    
    "paths": {
      "total": 47,
      "completed": 42,
      "failed": 3,
      "timeout": 2
    },
    
    "coverage": {
      "functions": 85,
      "branches": 72,
      "lines": 91
    },
    
    "issues": [
      {
        "type": "DEAD_CODE",
        "severity": "medium",
        "location": "src/utils/helpers.js:45",
        "message": "This branch is never taken"
      },
      {
        "type": "UNREACHABLE",
        "severity": "low", 
        "location": "src/auth/legacy.js::oldAuth",
        "message": "Function is never called"
      }
    ],
    
    "generatedTests": [
      {
        "function": "src/auth/login.js::validatePassword",
        "name": "test_validatePassword_3_steps",
        "inputs": {
          "password": "strongPass123",
          "hash": "$2b$10$..."
        },
        "expectedOutput": true,
        "path": [12, 15, 18, 20],
        "code": "..."
      }
    ],
    
    "whatIfScenarios": [
      {
        "name": "Add password length check",
        "impact": {
          "affectedFunctions": 5,
          "brokenPaths": 0,
          "newConstraints": ["password.length >= 8"]
        }
      }
    ]
  }
}
```

## Roadmap de Implementación

### Fase 5a: Simulación Estática (2 semanas)
- [ ] Compilador IR básico
- [ ] Path explorer simple
- [ ] Dead code detection
- [ ] Branch coverage analysis

### Fase 5b: Simulación Simbólica (3 semanas)
- [ ] Constraint system básico
- [ ] Symbolic values
- [ ] Branch exploration
- [ ] Constraint solver simple

### Fase 5c: Simulación Concreta (2 semanas)
- [ ] Mock provider
- [ ] Concrete execution
- [ ] Test case generation
- [ ] Snapshot testing

### Fase 5d: Simulación Probabilística (3 semanas)
- [ ] Event scheduler
- [ ] Async timing simulation
- [ ] Race condition prediction
- [ ] Performance modeling

## Casos de Uso

### 1. **Validación de Refactors**
```javascript
// Antes de refactorizar
const before = await simulate({ entryPoint: 'api/users' });

// Después de refactorizar  
const after = await simulate({ entryPoint: 'api/users' });

// Comparar
const diff = compareSimulations(before, after);
if (diff.brokenPaths.length > 0) {
  console.error('Refactor breaks functionality!');
}
```

### 2. **Generación Automática de Tests**
```javascript
// Generar tests para funciones sin coverage
const uncovered = projectData.simulation.uncoveredFunctions;

for (const func of uncovered) {
  const tests = await simulator.generateTests(func);
  await writeTestsToFile(func.file, tests);
}
```

### 3. **Análisis de Impacto**
```javascript
// Qué se rompe si cambio esta función?
const impact = await simulator.whatIf({
  target: 'auth/validateToken',
  change: { type: 'STRICTER_VALIDATION' }
});

console.log(impact.affectedBusinessFlows);
```

## Referencias

- [Symbolic Execution](https://en.wikipedia.org/wiki/Symbolic_execution)
- [Concolic Testing](https://en.wikipedia.org/wiki/Concolic_testing)
- [Z3 Solver](https://github.com/Z3Prover/z3)
- [KLEE](https://klee.github.io/)

## Notas

- La simulación simbólica puede ser computacionalmente costosa
- Usar límites de profundidad y timeout
- Cachear resultados de simulación
- Priorizar paths basado en criticidad del código
