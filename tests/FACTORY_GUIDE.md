# Factory Guide

Complete guide to using the OmnySystem test factories.

## Table of Contents

1. [Overview](#overview)
2. [Graph Test Factory](#graph-test-factory)
3. [Analysis Factory](#analysis-factory)
4. [Detector Test Factory](#detector-test-factory)
5. [Pipeline Test Factory](#pipeline-test-factory)
6. [Phases Test Factory](#phases-test-factory)
7. [Race Detector Test Factory](#race-detector-test-factory)
8. [Query Test Factory](#query-test-factory)
9. [Other Factories](#other-factories)
10. [Best Practices](#best-practices)

## Overview

Factories provide a fluent API for creating test data. All factories follow consistent patterns:

- **Static `create()` method** - Entry point
- **Chainable methods** - Return `this` for method chaining
- **`build()` method** - Finalize and return data
- **Predefined scenarios** - Common test cases

## Graph Test Factory

### GraphBuilder

Create graph structures with files, dependencies, and functions.

```javascript
import { GraphBuilder, SystemMapBuilder } from '../factories/graph-test.factory.js';

// Basic graph
const graph = GraphBuilder.create()
  .withFile('src/index.js')
  .withFile('src/utils.js')
  .withDependency('src/index.js', 'src/utils.js')
  .build();

// With functions
const graph = GraphBuilder.create()
  .withFile('src/app.js')
  .withFunction('src/app.js', 'main', { isExported: true, isAsync: true })
  .withFunction('src/app.js', 'helper', { line: 20 })
  .withFunctionLink('src/app.js::main', 'src/app.js::helper')
  .build();

// Dependency chain
const graph = GraphBuilder.create()
  .withDependencyChain(['src/a.js', 'src/b.js', 'src/c.js'])
  .build();

// Circular dependency
const graph = GraphBuilder.create()
  .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
  .build();
```

### SystemMapBuilder

Create complete SystemMap structures with Tier 3 capabilities.

```javascript
import { SystemMapBuilder } from '../factories/graph-test.factory.js';

const systemMap = SystemMapBuilder.create()
  .withFile('src/main.js')
  .withFile('src/types.ts')
  .withTypeDefinitions('src/types.ts', [
    { name: 'User', type: 'interface' }
  ])
  .withEnumDefinitions('src/types.ts', [
    { name: 'Status', values: ['active', 'inactive'] }
  ])
  .withConstantExports('src/constants.js', [
    { name: 'MAX_SIZE', value: 100 }
  ])
  .withMetadata({ projectName: 'Test Project' })
  .build();
```

### NodeBuilder

Build individual file nodes.

```javascript
import { NodeBuilder } from '../factories/graph-test.factory.js';

const node = NodeBuilder.create('src/component.js')
  .withDisplayPath('Component')
  .withExport('Component', 'class')
  .withExport('useHook', 'function')
  .withImport('react', { type: 'package' })
  .withMetadata({ framework: 'react' })
  .build();
```

### EdgeBuilder

Build dependency edges.

```javascript
import { EdgeBuilder } from '../factories/graph-test.factory.js';

const edge = EdgeBuilder.create('src/a.js', 'src/b.js')
  .ofType('import')
  .withSymbols(['func1', 'func2'])
  .asDynamic()
  .withConfidence(0.95)
  .because('Business logic dependency')
  .build();
```

### Graph Scenarios

Predefined graph patterns:

```javascript
import { GraphScenarios, GraphTestFactory } from '../factories/graph-test.factory.js';

// Empty graph
const empty = GraphScenarios.empty();

// Linear chain
const chain = GraphScenarios.linearChain();

// Simple cycle
const cycle = GraphScenarios.simpleCycle();

// Star pattern
const star = GraphScenarios.star();

// Diamond pattern
const diamond = GraphScenarios.diamond();

// Complex graph
const complex = GraphScenarios.complex();

// Using factory
const systemMap = GraphTestFactory.createSystemMapWithFiles(10);
const withCycles = GraphTestFactory.createWithCycles(2, 3);
```

## Analysis Factory

### Mock Data Creators

```javascript
import { 
  createMockSystemMap, 
  createMockFile, 
  createMockFunction,
  createMockFunctionLink,
  ScenarioBuilder 
} from '../factories/analysis.factory.js';

// Create mock system map
const systemMap = createMockSystemMap({
  files: { 'test.js': createMockFile('test.js') }
});

// Create mock function
const func = createMockFunction('src/utils.js', 'formatDate', {
  isExported: true,
  line: 10
});

// Create hotspot scenario
const hotspot = ScenarioBuilder.hotspot(15);

// Create orphan scenario
const orphans = ScenarioBuilder.orphans(3, 1);

// Create function cycle scenario
const cycles = ScenarioBuilder.functionCycles([
  ['a.js::func1', 'b.js::func2', 'c.js::func3']
]);

// Create import cycle scenario
const importCycles = ScenarioBuilder.importCycles([
  ['a.js', 'b.js', 'c.js', 'a.js']
]);
```

### Analysis Test Suites

```javascript
import { 
  createAnalysisStructureSuite,
  createDetectionAnalysisSuite,
  createSeverityClassificationSuite,
  ANALYSIS_TEST_CONSTANTS
} from '../factories/analysis.factory.js';

// Structure contract tests
createAnalysisStructureSuite('My Analysis', analyzeFunction, validInput);

// Detection scenario tests
createDetectionAnalysisSuite('My Detector', detectFunction, {
  'empty input': { input: {}, expected: { total: 0 } },
  'with issues': { input: mockData, expected: { hasResults: true } }
});

// Severity classification tests
createSeverityClassificationSuite('My Classifier', classifyFunction, {
  'critical case': { input: criticalData, expectedSeverity: 'CRITICAL' }
});

// Constants
const { SEVERITY_LEVELS, CYCLE_CATEGORIES, HOTSPOT_THRESHOLDS } = ANALYSIS_TEST_CONSTANTS;
```

## Detector Test Factory

### SystemMapBuilder

```javascript
import { SystemMapBuilder, AdvancedAnalysisBuilder } from '../factories/detector-test.factory.js';

const systemMap = SystemMapBuilder.create()
  .withFile('src/main.js')
  .withFunction('src/main.js', 'init', { isExported: true, isAsync: true })
  .withImport('src/main.js', './utils.js', { type: 'static' })
  .withDynamicImport('src/main.js', './dynamic.js')
  .withUnresolvedImport('src/main.js', './missing.js')
  .build();

const advanced = AdvancedAnalysisBuilder.create()
  .withFile('src/main.js')
  .withWorker('src/main.js', './worker.js', { line: 10 })
  .withNetworkUrl('src/api.js', 'https://api.example.com')
  .withWebSocketUrl('src/realtime.js', 'wss://ws.example.com')
  .build();
```

### Detector Scenarios

```javascript
import { DetectorScenarios, DetectorTestFactory } from '../factories/detector-test.factory.js';

// Predefined scenarios
const deadCode = DetectorScenarios.deadCode();
const deadCodeWithHandlers = DetectorScenarios.deadCodeWithHandlers();
const brokenWorker = DetectorScenarios.brokenWorker();
const brokenDynamicImport = DetectorScenarios.brokenDynamicImport();
const duplicateFunctions = DetectorScenarios.duplicateFunctions();
const suspiciousUrls = DetectorScenarios.suspiciousUrls();
const complex = DetectorScenarios.complex();

// Factory methods
const deadFunctions = DetectorTestFactory.createDeadFunctions(5);
const duplicates = DetectorTestFactory.createDuplicateFunctions('formatDate', 3);
const mixed = DetectorTestFactory.createMixedFunctionTypes();
```

## Pipeline Test Factory

### PipelineBuilder

```javascript
import { PipelineBuilder } from '../factories/pipeline-test.factory.js';

const config = new PipelineBuilder()
  .withRootPath('/test/project')
  .withVerbose(true)
  .withIncremental(false)
  .withBatchSize(50)
  .withPhases(['parse', 'resolve', 'extract'])
  .withOption('maxDepth', 5)
  .addMockFile('src/index.js', 'export const main = () => {}')
  .addMockImport('./utils', 'src/utils.js', 'local')
  .build();
```

### FileProcessingBuilder

```javascript
import { FileProcessingBuilder } from '../factories/pipeline-test.factory.js';

const file = new FileProcessingBuilder()
  .withFilePath('src/utils.js')
  .withJavaScriptFunction('formatDate', ['date'], 'return date.toISOString();')
  .withClass('MyClass', [
    { name: 'method1', params: ['a'], body: 'return a;' },
    { name: 'method2', params: ['b'] }
  ])
  .withImport('./helper.js', ['helper'])
  .withExport('formatDate', 'function')
  .withAtom({ name: 'formatDate', complexity: 2 })
  .withMetadata({ jsdoc: [{ description: 'Formats dates' }] })
  .build();
```

### MolecularChainBuilder

```javascript
import { MolecularChainBuilder } from '../factories/pipeline-test.factory.js';

const molecular = new MolecularChainBuilder()
  .withFilePath('src/module.js')
  .withCode('function a() { b(); } function b() { return 1; }')
  .addAtom({ name: 'a', calls: ['b'] })
  .addAtom({ name: 'b', calledBy: ['a'] })
  .addChain({ name: 'mainChain', steps: ['a', 'b'] })
  .addConnection('a', 'b', 'call')
  .buildMolecularStructure();
```

### EnhancerBuilder

```javascript
import { EnhancerBuilder } from '../factories/pipeline-test.factory.js';

const enhancer = new EnhancerBuilder()
  .addAtom({ name: 'testFunc', complexity: 5 })
  .addFile('src/test.js', { exports: ['testFunc'] })
  .addEnhancedFile('src/test.js', {
    semanticAnalysis: { sharedState: { sharedVariables: [] } }
  })
  .addConnection('sharedState', { sourceFile: 'a.js', targetFile: 'b.js' })
  .addRiskScore('src/test.js', 75)
  .buildEnhancedSystemMap();
```

### Mock Utilities

```javascript
import { 
  createMockFileSystem, 
  createMockLogger, 
  createMockPhase,
  createValidParsedFile,
  createValidSystemMap,
  createValidAtom,
  createValidConnection
} from '../factories/pipeline-test.factory.js';

const fs = createMockFileSystem({
  'src/index.js': 'export const main = () => {}',
  'src/utils.js': 'export const helper = () => {}'
});

const logger = createMockLogger();

const phase = createMockPhase('TestPhase', true);
```

## Phases Test Factory

### PhaseContextBuilder

```javascript
import { PhaseContextBuilder } from '../factories/phases-test.factory.js';

const context = PhaseContextBuilder.create()
  .withFilePath('src/test.js')
  .withCode('function test() { return true; }')
  .withFileInfo({ functions: [] })
  .withFileMetadata({ type: 'module' })
  .withFunction({ name: 'test', line: 1 })
  .withAtoms([{ id: 'atom-1', name: 'test' }])
  .withMolecularChains({ chains: [] })
  .build();
```

### AtomBuilder

```javascript
import { AtomBuilder } from '../factories/phases-test.factory.js';

const atom = AtomBuilder.create('myFunction')
  .withId('src/test.js::myFunction')
  .withFilePath('src/test.js')
  .atLines(10, 25)
  .isExported(true)
  .inClass('MyClass')
  .ofType('method')
  .withComplexity(5)
  .withSideEffects({ networkCalls: [{ url: 'https://api.example.com' }] })
  .withCalls([{ name: 'helper' }])
  .withExternalCalls([{ name: 'fetch' }])
  .hasErrorHandling(true)
  .isAsync(true)
  .withTemporalPatterns([{ type: 'lifecycle' }])
  .withDNA({ type: 'async-worker' })
  .withArchetype({ type: 'fragile-network', severity: 8, confidence: 0.9 })
  .calledBy(['caller1', 'caller2'])
  .build();
```

### FunctionInfoBuilder

```javascript
import { FunctionInfoBuilder } from '../factories/phases-test.factory.js';

const func = FunctionInfoBuilder.create('processData')
  .atLines(5, 30)
  .ofType('async')
  .isExported(true)
  .isAsync(true)
  .inClass('DataProcessor')
  .withCalls(['validate', 'save'])
  .build();
```

### FileMetadataBuilder

```javascript
import { FileMetadataBuilder } from '../factories/phases-test.factory.js';

const metadata = FileMetadataBuilder.create()
  .withJSDoc({ description: 'Module documentation' })
  .withImport({ source: 'react', symbols: ['useState'] })
  .withExport({ name: 'Component', type: 'class' })
  .ofType('module')
  .build();
```

### Predefined Scenarios

```javascript
import { AtomScenarios, PhaseContextScenarios } from '../factories/phases-test.factory.js';

// Atom scenarios
const simple = AtomScenarios.simpleUtility();
const exported = AtomScenarios.exportedFunction();
const dead = AtomScenarios.deadFunction();
const god = AtomScenarios.godFunction();
const async = AtomScenarios.asyncNetworkFunction();
const chain = AtomScenarios.atomChain();

// Context scenarios
const empty = PhaseContextScenarios.empty();
const singleFunc = PhaseContextScenarios.singleFunction();
const multiFunc = PhaseContextScenarios.multipleFunctions();
const classMethods = PhaseContextScenarios.classMethods();
const withAtoms = PhaseContextScenarios.withExtractedAtoms();
```

### Validation Helpers

```javascript
import { PhaseValidator, PhaseContracts } from '../factories/phases-test.factory.js';

PhaseValidator.isValidContext(context);
PhaseValidator.isValidAtom(atom);
PhaseValidator.isValidArchetype(archetype);
PhaseValidator.atomHasFields(atom, ['id', 'name', 'complexity']);
PhaseValidator.areValidAtoms(atoms);
PhaseValidator.isValidPhaseResult(result);

// Constants
const { REQUIRED_ATOM_FIELDS, VALID_ARCHETYPE_TYPES } = PhaseContracts;
```

## Race Detector Test Factory

### RaceScenarioBuilder

```javascript
import { RaceScenarioBuilder } from '../factories/race-detector-test.factory.js';

const scenario = new RaceScenarioBuilder()
  .withAtom('atom-1', 'reader', { isAsync: true, filePath: 'src/api.js' })
  .withAtom('atom-2', 'writer', { isAsync: true, filePath: 'src/worker.js' })
  .withSharedState('userCache', { type: 'cache' })
  .withReadAccess('atom-1', 'userCache', 15)
  .withWriteAccess('atom-2', 'userCache', 25)
  .withConnection('atom-1', 'atom-2', 'data-flow')
  .withModule('api', { path: 'src/api.js' })
  .withMolecule('src/api.js', { atoms: ['atom-1'] })
  .build();

// Get project data
const projectData = scenario.getProjectData();
```

### Race Pattern Factory

```javascript
import { RacePatternFactory } from '../factories/race-detector-test.factory.js';

const readWrite = RacePatternFactory.readWriteRace();
const writeWrite = RacePatternFactory.writeWriteRace();
const singleton = RacePatternFactory.singletonRace();
const counter = RacePatternFactory.counterRace();
const lazyInit = RacePatternFactory.lazyInitializationRace();
const safe = RacePatternFactory.noRaceSafeAccess();
const atomic = RacePatternFactory.atomicOperation();
const locked = RacePatternFactory.lockedAccess();
const globalVar = RacePatternFactory.globalVariableAccess();
const moduleState = RacePatternFactory.moduleStateAccess();
```

### RaceConditionBuilder

```javascript
import { RaceConditionBuilder } from '../factories/race-detector-test.factory.js';

const race = new RaceConditionBuilder()
  .withId('race-1')
  .withType('RW')
  .withStateKey('sharedCounter')
  .withStateType('global')
  .withSeverity('high')
  .withAccess('atom-1', { type: 'read', file: 'src/reader.js', line: 15 })
  .withAccess('atom-2', { type: 'write', file: 'src/writer.js', line: 25 })
  .build();
```

### ProjectDataBuilder

```javascript
import { ProjectDataBuilder } from '../factories/race-detector-test.factory.js';

const project = new ProjectDataBuilder()
  .withModule('api', { path: 'src/api.js' })
  .withMolecule('api', 'src/api.js', [
    { name: 'getUser', isAsync: true },
    { name: 'saveUser', isAsync: true }
  ])
  .withBusinessFlow('user-crud', [
    { function: 'getUser', module: 'api' },
    { function: 'saveUser', module: 'api' }
  ])
  .withEntryPoint('api', 'api', { method: 'GET', path: '/users' })
  .build();
```

### MitigationBuilder

```javascript
import { MitigationBuilder } from '../factories/race-detector-test.factory.js';

const mitigation = new MitigationBuilder()
  .withAccessPair(
    { atom: 'atom-1', type: 'read' },
    { atom: 'atom-2', type: 'write' }
  )
  .withAtom({ id: 'atom-1', code: 'const x = sharedVar;' })
  .withAtom({ id: 'atom-2', code: 'sharedVar = 1;', locks: null })
  .build();
```

### Race Strategy Builder

```javascript
import { RaceStrategyBuilder } from '../factories/race-detector-test.factory.js';

const strategy = new RaceStrategyBuilder()
  .withProject(mockProject)
  .withSharedState('counter', [
    { atom: 'atom-1', type: 'read' },
    { atom: 'atom-2', type: 'write' }
  ])
  .withAccess('counter', { atom: 'atom-3', type: 'write' })
  .withOptions({ maxDepth: 5 })
  .build();

// Create mock project
const mockProject = strategy.createMockProject([
  { id: 'atom-1', name: 'func1', isAsync: true }
]);
```

### Validation & Constants

```javascript
import { 
  RaceDetectorValidator, 
  RaceTestConstants,
  RaceDetectorMocks 
} from '../factories/race-detector-test.factory.js';

// Validation
RaceDetectorValidator.isValidRace(race);
RaceDetectorValidator.isValidAccess(access);
RaceDetectorValidator.isValidMitigation(mitigation);
RaceDetectorValidator.hasReadWritePattern(race);
RaceDetectorValidator.hasWriteWritePattern(race);

// Constants
const { 
  RACE_TYPES, 
  SEVERITY_LEVELS, 
  STATE_TYPES, 
  MITIGATION_TYPES,
  ASYNC_PATTERNS,
  SAMPLE_CODE 
} = RaceTestConstants;

// Mocks
const tracker = RaceDetectorMocks.createMockTracker();
const strategy = RaceDetectorMocks.createMockStrategy([]);
const scorer = RaceDetectorMocks.createMockRiskScorer({ race1: 'high' });
```

## Query Test Factory

### ProjectDataBuilder

```javascript
import { ProjectDataBuilder } from '../factories/query-test.factory.js';

const project = ProjectDataBuilder.create()
  .withVersion('1.0.0')
  .withProjectRoot('/test/project')
  .withAnalyzedAt(new Date())
  .withConfig({ includeTests: true })
  .withFile('src/index.js', { hash: 'abc123', size: 1024 })
  .withFiles(['src/a.js', 'src/b.js', 'src/c.js'])
  .withStats({ totalFiles: 3, totalAtoms: 15 })
  .build();
```

### FileDataBuilder

```javascript
import { FileDataBuilder } from '../factories/query-test.factory.js';

const file = FileDataBuilder.create('src/utils.js')
  .withHash('hash123')
  .withAtom({ name: 'formatDate', type: 'function', complexity: 3 })
  .withAtoms([
    { name: 'parseDate', type: 'function' },
    { name: 'validateDate', type: 'function' }
  ])
  .withImport('./helpers.js', { resolvedPath: 'src/helpers.js', line: 1 })
  .withImports(['react', 'lodash'])
  .withExport('formatDate', { type: 'function', line: 10 })
  .withExports(['parseDate', 'validateDate'])
  .withUsedBy(['src/app.js', 'src/main.js'])
  .withComplexity(10)
  .withLines(150)
  .withMetadata({ framework: 'react' })
  .build();
```

### ConnectionBuilder

```javascript
import { ConnectionBuilder } from '../factories/query-test.factory.js';

const connections = ConnectionBuilder.create()
  .withSharedStateConnection({
    source: 'src/store.js',
    target: 'src/component.js',
    variable: 'appState',
    line: 5
  })
  .withEventListener({
    source: 'src/component.js',
    target: 'src/handler.js',
    event: 'click',
    line: 10
  })
  .withSharedState(3)
  .withEventListeners(2)
  .build();
```

### QueryBuilder

```javascript
import { QueryBuilder } from '../factories/query-test.factory.js';

const query = QueryBuilder.create()
  .atProjectRoot('/test/project')
  .withFile('src/main.js', { complexity: 5 })
  .withFiles({
    'src/utils.js': { complexity: 3 },
    'src/helpers.js': { complexity: 2 }
  })
  .withConnections(connectionBuilder)
  .withRisks({ report: { summary: { criticalCount: 0 } } })
  .withMetadata({ version: '1.0.0' })
  .build();
```

### Query Scenarios

```javascript
import { QueryScenarios } from '../factories/query-test.factory.js';

const empty = QueryScenarios.emptyProject();
const single = QueryScenarios.singleFileProject('src/index.js');
const multi = QueryScenarios.multiFileProject(5);
const withImports = QueryScenarios.projectWithImports();
const withConnections = QueryScenarios.projectWithConnections();
const withRisks = QueryScenarios.projectWithRisks();
const withAtoms = QueryScenarios.projectWithAtoms();
const circular = QueryScenarios.circularDependency();
const deepTree = QueryScenarios.deepDependencyTree(5);
```

### MockFileSystem

```javascript
import { MockFileSystem } from '../factories/query-test.factory.js';

const fs = MockFileSystem.create()
  .withFile('src/index.js', 'console.log("hello")')
  .withJSON('package.json', { name: 'test-project' })
  .withDirectory('src/components')
  .build();

fs.exists('src/index.js'); // true
fs.readFile('src/index.js'); // content
fs.readJSON('package.json'); // parsed object
```

### Validation & Constants

```javascript
import { QueryValidators, QueryTestConstants, ErrorScenarios } from '../factories/query-test.factory.js';

// Validators
QueryValidators.isValidProjectMetadata(metadata);
QueryValidators.isValidFileAnalysis(analysis);
QueryValidators.isValidConnection(connection);
QueryValidators.isValidConnectionsResult(result);
QueryValidators.isValidRiskAssessment(assessment);
QueryValidators.isValidDependencyGraph(graph);

// Constants
const { 
  TEST_PROJECT_ROOT, 
  VALID_FILE_PATHS, 
  ARCHETYPE_TYPES,
  CONNECTION_TYPES,
  SEVERITY_LEVELS 
} = QueryTestConstants;

// Error scenarios
const notFound = ErrorScenarios.fileNotFound('src/missing.js');
const invalidJSON = ErrorScenarios.invalidJSON('config.json');
const noPermission = ErrorScenarios.permissionDenied('secret.js');
const circular = ErrorScenarios.circularDependency('a.js');
```

## Other Factories

### Extractor Factory

```javascript
import { createExtractorSuite, createExtractorContract } from '../factories/extractor.factory.js';

// Create complete test suite for an extractor
createExtractorSuite({
  name: 'JavaScript',
  extensions: ['js', 'mjs'],
  parseFunction: (code, ext) => parseFile(`test.${ext}`, code),
  fixtures: {
    empty: '',
    withImports: 'import { x } from "y";',
    withExports: 'export const foo = 1;',
    withFunctions: 'function test() {}'
  }
});

// Create contract tests
createExtractorContract({
  name: 'TypeScript',
  extensions: ['ts', 'tsx'],
  parseFunction: (code, ext) => parseFile(`test.${ext}`, code)
});
```

## Best Practices

### 1. Prefer Factories Over Manual Mocks

```javascript
// ✅ Good
const systemMap = SystemMapBuilder.create()
  .withFile('src/test.js')
  .build();

// ❌ Avoid
const systemMap = {
  files: { 'src/test.js': { imports: [], exports: [] } },
  metadata: {}
};
```

### 2. Use Scenarios for Common Patterns

```javascript
// ✅ Good
const scenario = GraphScenarios.diamond();

// ❌ Avoid - manual construction
const graph = GraphBuilder.create()
  .withFile('a.js')
  .withFile('b.js')
  .withFile('c.js')
  .withFile('d.js')
  .withDependency('a.js', 'b.js')
  .withDependency('a.js', 'c.js')
  // ... more setup
```

### 3. Chain Methods for Readability

```javascript
// ✅ Good
const atom = AtomBuilder.create('processData')
  .withFilePath('src/api.js')
  .atLines(10, 50)
  .isAsync(true)
  .isExported(true)
  .withComplexity(8)
  .build();

// ❌ Avoid - scattered assignments
const builder = AtomBuilder.create('processData');
builder.withFilePath('src/api.js');
builder.atLines(10, 50);
builder.isAsync(true);
// ... etc
const atom = builder.build();
```

### 4. Validate Complex Structures

```javascript
// ✅ Good
const atoms = [atom1, atom2, atom3];
expect(PhaseValidator.areValidAtoms(atoms)).toBe(true);

// Validate specific fields
expect(PhaseValidator.atomHasFields(atom, ['id', 'complexity'])).toBe(true);
```

### 5. Use Constants for Consistency

```javascript
// ✅ Good
const { SEVERITY_LEVELS } = ANALYSIS_TEST_CONSTANTS;
expect(SEVERITY_LEVELS).toContain(finding.severity);

// ✅ Good
const { RACE_TYPES } = RaceTestConstants;
expect(race.type).toBe(RACE_TYPES.READ_WRITE);
```

### 6. Combine Factories for Complex Scenarios

```javascript
// ✅ Good - combining multiple factories
const systemMap = SystemMapBuilder.create()
  .withFile('src/api.js')
  .withFile('src/worker.js');

const raceScenario = new RaceScenarioBuilder()
  .withAtom('api-1', 'process', { isAsync: true })
  .withAtom('worker-1', 'handle', { isAsync: true });

const graph = GraphBuilder.create()
  .withDependency('src/api.js', 'src/worker.js');

const combined = {
  ...systemMap.build(),
  raceData: raceScenario.build(),
  dependencies: graph.dependencies
};
```

### 7. Clean Up State Between Tests

```javascript
import { beforeEach, afterEach } from 'vitest';

let builder;

beforeEach(() => {
  builder = SystemMapBuilder.create();
});

afterEach(() => {
  builder = null;
});
```
