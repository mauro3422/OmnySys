# Validation Engine - Modular Architecture

## Overview

Refactorización del motor de validación siguiendo principios SOLID.

## Structure

```
validation-engine/
├── strategies/              # Strategy Pattern
│   ├── base-strategy.js     # Abstract base (45 lines)
│   ├── syntax-validator.js  # Phase 1 validation (92 lines)
│   ├── semantic-validator.js# Phase 3 validation (127 lines)
│   ├── schema-validator.js  # Phases 2 & 4 (66 lines)
│   ├── execution-strategies.js # Execution helpers (59 lines)
│   ├── validator-helpers.js # Shared helpers (71 lines)
│   └── index.js            # Public exports (9 lines)
├── runners/                # Runner Pattern
│   ├── base-runner.js      # Abstract base (67 lines)
│   ├── sequential-runner.js# Sequential exec (77 lines)
│   ├── parallel-runner.js  # Parallel exec (97 lines)
│   └── index.js            # Public exports (8 lines)
├── reports/                # Report Generation
│   ├── report-builder.js   # Builder pattern (85 lines)
│   ├── report-formatter.js # Format outputs (137 lines)
│   └── index.js            # Public exports (7 lines)
├── ValidationEngine.js     # Main orchestrator (112 lines)
├── context.js              # Validation context (63 lines)
├── file-loader.js          # File I/O (62 lines)
├── engine-helpers.js       # Engine setup (31 lines)
└── index.js                # Public API (46 lines)
```

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
- **ValidationEngine**: Solo orquesta, no sabe cómo validar
- **Strategies**: Cada una valida un tipo específico
- **Runners**: Solo manejan modo de ejecución
- **ReportBuilder**: Solo construye reportes

### Open/Closed Principle (OCP)
- Nuevas estrategias: Extender `BaseValidationStrategy`
- Nuevos runners: Extender `BaseValidationRunner`
- Nuevos formatos: Extender `ReportFormatter`

### Liskov Substitution Principle (LSP)
- `SyntaxValidator`, `SemanticValidator`, `SchemaValidator` son intercambiables
- `SequentialRunner`, `ParallelRunner` son intercambiables

### Interface Segregation Principle (ISP)
- `BaseValidationStrategy` define mínimo contrato necesario
- `BaseValidationRunner` define solo lo necesario para ejecutar

### Dependency Inversion Principle (DIP)
- `ValidationEngine` depende de `BaseValidationStrategy`, no implementaciones
- `ValidationEngine` depende de `BaseValidationRunner`, no implementaciones

## Backward Compatibility

El archivo original `src/validation/core/validation-engine.js` ahora es un proxy:

```javascript
// Old imports still work
import { ValidationEngine, ValidationContext, validate } 
  from 'src/validation/core/validation-engine.js';

// New imports recommended
import { ValidationEngine } from 'src/validation/validation-engine/index.js';
```

## Usage

### Basic Usage
```javascript
import { validate } from 'validation-engine';

const report = await validate('/path/to/project');
console.log(report.toString());
```

### Advanced Usage
```javascript
import { ValidationEngine } from 'validation-engine';

const engine = new ValidationEngine({
  parallel: true,
  maxConcurrency: 10,
  autoFix: true,
  enabledStrategies: ['syntax', 'semantic']
});

const report = await engine.validate(projectPath, omnysysPath);
```

### Custom Strategy
```javascript
import { BaseValidationStrategy } from 'validation-engine';

class CustomValidator extends BaseValidationStrategy {
  constructor() {
    super('custom', 'semantic');
  }
  
  async execute(context, registry, cache) {
    // Custom validation logic
    return results;
  }
}

engine.registerStrategy('custom', new CustomValidator());
```

## Module Line Counts

All modules are within 50-150 lines:

| Module | Lines |
|--------|-------|
| ValidationEngine.js | 112 |
| strategies/syntax-validator.js | 92 |
| strategies/semantic-validator.js | 127 |
| strategies/schema-validator.js | 66 |
| strategies/base-strategy.js | 45 |
| runners/parallel-runner.js | 97 |
| runners/sequential-runner.js | 77 |
| runners/base-runner.js | 67 |
| reports/report-builder.js | 85 |
| reports/report-formatter.js | 137 |
| context.js | 63 |
| file-loader.js | 62 |
| engine-helpers.js | 31 |
