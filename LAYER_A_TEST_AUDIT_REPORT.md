# Layer A Comprehensive Test Audit Report

**Generated:** 2026-02-14  
**Scope:** src/layer-a-static/**/*.js  
**Current Status:** 159 test files, ~4,045 tests passing

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Source Files | 606 |
| Total Test Files | 159 |
| Overall Coverage | 26.2% |
| Missing Tests | 447 |
| Index.js Files (Total) | 131 |
| Index.js Files with Tests | 16 (12%) |
| Untested Directories | 109 |
| Contract Tests | 10 |

---

## Coverage by Directory

| Directory | Source Files | Test Files | Coverage | Missing |
|-----------|-------------|------------|----------|---------|
| parser | 8 | 9 | 112.5% | -1 (extra tests) |
| graph | 11 | 12 | 109.1% | -1 (extra tests) |
| query | 25 | 26 | 104.0% | -1 (extra tests) |
| pattern-detection | 25 | 20 | 80.0% | 5 |
| module-system | 29 | 16 | 55.2% | 13 |
| analyses | 73 | 26 | 35.6% | 47 |
| race-detector | 92 | 21 | 22.8% | 71 |
| extractors | 236 | 29 | 12.3% | 207 |
| pipeline | 91 | 0 | 0% | 91 |
| storage | 16 | 0 | 0% | 16 |

---

## Critical Missing Tests (Root Level)

| File | Priority |
|------|----------|
| src/layer-a-static/analyzer.js | **CRITICAL** |
| src/layer-a-static/indexer.js | **CRITICAL** |
| src/layer-a-static/scanner.js | **CRITICAL** |
| src/layer-a-static/resolver.js | **CRITICAL** |

---

## Untested Index.js Files (115 of 131)

### Analyses (11 missing)
- `src/layer-a-static/analyses/tier1/index.js`
- `src/layer-a-static/analyses/tier1/function-cycle-classifier/index.js`
- `src/layer-a-static/analyses/tier1/function-cycle-classifier/rules/index.js`
- `src/layer-a-static/analyses/tier2/index.js`
- `src/layer-a-static/analyses/tier3/index.js`
- `src/layer-a-static/analyses/tier3/calculators/index.js`
- `src/layer-a-static/analyses/tier3/detectors/index.js`
- `src/layer-a-static/analyses/tier3/event-detector/index.js`
- `src/layer-a-static/analyses/tier3/factors/index.js`
- `src/layer-a-static/analyses/tier3/utils/index.js`
- `src/layer-a-static/analyses/tier3/validators/index.js`

### Extractors (50 missing)
- `src/layer-a-static/extractors/comprehensive-extractor/index.js` ⭐
- `src/layer-a-static/extractors/comprehensive-extractor/completeness/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/config/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/extractors/class-extractor/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/extractors/export-extractor/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/metadata/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/metrics/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/parsers/classes/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/parsers/functions/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/parsers/modules/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/parsers/utils/index.js`
- `src/layer-a-static/extractors/comprehensive-extractor/patterns/index.js`
- `src/layer-a-static/extractors/css-in-js-extractor/index.js`
- `src/layer-a-static/extractors/data-flow/index.js` ⭐
- `src/layer-a-static/extractors/data-flow/analyzers/type-inferrer/index.js`
- `src/layer-a-static/extractors/data-flow/core/data-flow-analyzer/index.js`
- `src/layer-a-static/extractors/data-flow/utils/index.js`
- `src/layer-a-static/extractors/data-flow/utils/indexers/index.js`
- `src/layer-a-static/extractors/data-flow/utils/managers/index.js`
- `src/layer-a-static/extractors/data-flow/utils/utils/index.js`
- `src/layer-a-static/extractors/data-flow/visitors/input-extractor/index.js`
- `src/layer-a-static/extractors/data-flow/visitors/output-extractor/index.js`
- `src/layer-a-static/extractors/data-flow/visitors/transformation-extractor/index.js`
- `src/layer-a-static/extractors/data-flow/visitors/transformation-extractor/handlers/index.js`
- `src/layer-a-static/extractors/data-flow/visitors/transformation-extractor/processors/index.js`
- `src/layer-a-static/extractors/data-flow/visitors/transformation-extractor/utils/index.js`
- `src/layer-a-static/extractors/metadata/index.js` ⭐
- `src/layer-a-static/extractors/metadata/error-flow/index.js`
- `src/layer-a-static/extractors/metadata/performance-impact/index.js`
- `src/layer-a-static/extractors/metadata/temporal-connections/index.js`
- `src/layer-a-static/extractors/metadata/temporal-connections/crossfile/index.js`
- `src/layer-a-static/extractors/metadata/temporal-connections/execution/index.js`
- `src/layer-a-static/extractors/metadata/temporal-connections/lifecycle/index.js`
- `src/layer-a-static/extractors/metadata/temporal-connections/utils/index.js`
- `src/layer-a-static/extractors/metadata/type-contracts/index.js`
- `src/layer-a-static/extractors/metadata/type-contracts/types/index.js`
- `src/layer-a-static/extractors/static/index.js`
- `src/layer-a-static/extractors/typescript/index.js`
- `src/layer-a-static/extractors/typescript/connections/index.js`
- `src/layer-a-static/extractors/typescript/extractors/index.js`
- `src/layer-a-static/extractors/typescript/parsers/index.js`
- `src/layer-a-static/extractors/typescript/utils/index.js`

### Pipeline (24 missing)
- `src/layer-a-static/pipeline/phases/index.js`
- `src/layer-a-static/pipeline/phases/atom-extraction/index.js`
- `src/layer-a-static/pipeline/phases/atom-extraction/builders/index.js`
- `src/layer-a-static/pipeline/phases/atom-extraction/extraction/index.js`
- `src/layer-a-static/pipeline/phases/atom-extraction/graph/index.js`
- `src/layer-a-static/pipeline/phases/atom-extraction/metadata/index.js`
- `src/layer-a-static/pipeline/enhance/analyzers/index.js`
- `src/layer-a-static/pipeline/enhance/builders/index.js`
- `src/layer-a-static/pipeline/enhance/extractors/index.js`
- `src/layer-a-static/pipeline/enhancers/index.js`
- `src/layer-a-static/pipeline/enhancers/analyzers/index.js`
- `src/layer-a-static/pipeline/enhancers/builders/index.js`
- `src/layer-a-static/pipeline/enhancers/orchestrators/index.js`
- `src/layer-a-static/pipeline/enhancers/legacy/index.js`
- `src/layer-a-static/pipeline/enhancers/connections/ancestry/index.js`
- `src/layer-a-static/pipeline/enhancers/connections/conflicts/index.js`
- `src/layer-a-static/pipeline/enhancers/connections/dataflow/index.js`
- `src/layer-a-static/pipeline/enhancers/connections/weights/index.js`
- `src/layer-a-static/pipeline/molecular-chains/index.js`
- `src/layer-a-static/pipeline/molecular-chains/argument-mapper/index.js`
- `src/layer-a-static/pipeline/molecular-chains/argument-mapper/analysis/index.js`
- `src/layer-a-static/pipeline/molecular-chains/argument-mapper/extractors/index.js`
- `src/layer-a-static/pipeline/molecular-chains/argument-mapper/transforms/index.js`
- `src/layer-a-static/pipeline/molecular-chains/argument-mapper/utils/index.js`
- `src/layer-a-static/pipeline/molecular-chains/graph-builder/index.js`
- `src/layer-a-static/pipeline/molecular-chains/graph-builder/edges/index.js`
- `src/layer-a-static/pipeline/molecular-chains/graph-builder/metrics/index.js`
- `src/layer-a-static/pipeline/molecular-chains/graph-builder/nodes/index.js`
- `src/layer-a-static/pipeline/molecular-chains/graph-builder/paths/index.js`
- `src/layer-a-static/pipeline/molecular-chains/utils/index.js`
- `src/layer-a-static/pipeline/molecular-chains/validators/index.js`

### Race Detector (23 missing)
- `src/layer-a-static/race-detector/index.js` ⭐
- `src/layer-a-static/race-detector/closure-analysis/index.js`
- `src/layer-a-static/race-detector/mitigation/index.js`
- `src/layer-a-static/race-detector/patterns/index.js`
- `src/layer-a-static/race-detector/phases/index.js`
- `src/layer-a-static/race-detector/scorers/index.js`
- `src/layer-a-static/race-detector/strategies/index.js`
- `src/layer-a-static/race-detector/trackers/index.js`
- `src/layer-a-static/race-detector/utils/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/analyzers/lock/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/patterns/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/analyzers/lock/utils/index.js`
- `src/layer-a-static/race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/index.js`

### Storage (6 missing)
- `src/layer-a-static/storage/storage-manager/index.js`
- `src/layer-a-static/storage/storage-manager/atoms/index.js`
- `src/layer-a-static/storage/storage-manager/files/index.js`
- `src/layer-a-static/storage/storage-manager/molecules/index.js`
- `src/layer-a-static/storage/storage-manager/setup/index.js`
- `src/layer-a-static/storage/storage-manager/utils/index.js`

### Module System (4 missing)
- `src/layer-a-static/module-system/index.js` ⭐
- `src/layer-a-static/module-system/enrichers/index.js`
- `src/layer-a-static/module-system/groupers/index.js`
- `src/layer-a-static/module-system/module-analyzer/index.js`
- `src/layer-a-static/module-system/queries/index.js`

### Pattern Detection (3 missing)
- `src/layer-a-static/pattern-detection/detectors/index.js`
- `src/layer-a-static/pattern-detection/detectors/shared-objects-detector/index.js`
- `src/layer-a-static/pattern-detection/runners/index.js`

---

## Top 20 Untested Critical Files

| # | File | Directory | Priority |
|---|------|-----------|----------|
| 1 | `analyzer.js` | root | CRITICAL |
| 2 | `indexer.js` | root | CRITICAL |
| 3 | `scanner.js` | root | CRITICAL |
| 4 | `resolver.js` | root | CRITICAL |
| 5 | `ComprehensiveExtractor.js` | extractors/comprehensive-extractor | CRITICAL |
| 6 | `single-file.js` | pipeline | CRITICAL |
| 7 | `molecular-extractor.js` | pipeline | CRITICAL |
| 8 | `normalize.js` | pipeline | CRITICAL |
| 9 | `parse.js` | pipeline | CRITICAL |
| 10 | `resolve.js` | pipeline | CRITICAL |
| 11 | `scan.js` | pipeline | CRITICAL |
| 12 | `save.js` | pipeline | CRITICAL |
| 13 | `graph.js` | pipeline | CRITICAL |
| 14 | `storage-manager.js` | storage/storage-manager | HIGH |
| 15 | `race-pattern-matcher.js` | race-detector | HIGH |
| 16 | `shared-state-tracker.js` | race-detector | HIGH |
| 17 | `risk-scorer.js` | race-detector | HIGH |
| 18 | `integration.js` | race-detector | HIGH |
| 19 | `data-flow.js` | extractors/metadata | HIGH |
| 20 | `temporal-connections.js` | extractors/metadata | HIGH |

---

## Contract Tests Status (10 total)

| Contract Test | System |
|--------------|--------|
| atomic-contract.test.js | extractors/atomic |
| communication-contract.test.js | extractors/communication |
| graph-contract.test.js | graph |
| module-contract.test.js | module-system |
| parser-contract.test.js | parser |
| pattern-detection-contract.test.js | pattern-detection |
| query-contract.test.js | query |
| race-detector-contract.test.js | race-detector |
| state-management-contract.test.js | extractors/state-management |
| tier3-contract.test.js | analyses/tier3 |

### Missing Contract Tests
- ❌ analyses (general)
- ❌ analyses/tier1
- ❌ analyses/tier2
- ❌ extractors/comprehensive-extractor
- ❌ extractors/css-in-js-extractor
- ❌ extractors/data-flow
- ❌ extractors/metadata
- ❌ extractors/static
- ❌ extractors/typescript
- ❌ pipeline
- ❌ storage

---

## Priority Matrix for New Tests

### CRITICAL (Foundation Layer) - ~100 tests needed
1. **Root Infrastructure** (4 files)
   - analyzer.js, indexer.js, scanner.js, resolver.js
   
2. **Pipeline Core** (20 files)
   - All phase files, enhancement orchestrators
   
3. **Comprehensive Extractor** (45 files)
   - Main extractor and all sub-components

### HIGH (Core Functionality) - ~150 tests needed
4. **Race Detector** (71 files)
   - All core detection strategies and trackers
   
5. **Analyses Tiers** (47 files)
   - Tier1, Tier2, Tier3 analyses
   
6. **Storage Manager** (16 files)
   - All storage abstractions

### MEDIUM (Supporting Features) - ~120 tests needed
7. **Metadata Extractors** (50 files)
   - Type contracts, temporal connections, error flow
   
8. **Data Flow** (40 files)
   - Visitors, analyzers, transformers
   
9. **Module System Enhancers** (13 files)
   - Enrichers, groupers, queries

### LOW (Edge Cases) - ~77 tests needed
10. **Static Extractors** (13 files)
    - Environment, routes, events
    
11. **TypeScript Extractors** (25 files)
    - Type definitions, connections
    
12. **CSS-in-JS Extractor** (6 files)
    - Styled components, themes

---

## Untested Directories (109 total)

### Completely Untested (0% coverage)

**Pipeline (100% untested - 91 files)**
```
pipeline/enhance/*
pipeline/enhancers/*
pipeline/molecular-chains/*
pipeline/phases/*
```

**Storage (100% untested - 16 files)**
```
storage/storage-manager/*
storage/storage-manager/atoms/*
storage/storage-manager/files/*
storage/storage-manager/molecules/*
storage/storage-manager/setup/*
storage/storage-manager/utils/*
```

**Comprehensive Extractor (100% untested - 45 files)**
```
extractors/comprehensive-extractor/*
```

**Data Flow (100% untested - 47 files)**
```
extractors/data-flow/*
extractors/data-flow/analyzers/*
extractors/data-flow/core/*
extractors/data-flow/utils/*
extractors/data-flow/visitors/*
```

**Metadata Extractors (100% untested - 50 files)**
```
extractors/metadata/* (except index files)
extractors/metadata/error-flow/*
extractors/metadata/performance-impact/*
extractors/metadata/temporal-connections/*
extractors/metadata/type-contracts/*
```

**TypeScript Extractors (100% untested - 25 files)**
```
extractors/typescript/*
```

**Static Extractors (100% untested - 13 files)**
```
extractors/static/*
```

**CSS-in-JS Extractor (100% untested - 6 files)**
```
extractors/css-in-js-extractor/*
```

---

## Recommended Test Implementation Order

### Phase 1: Foundation (Weeks 1-2) - 44 tests
1. Root infrastructure files (analyzer, indexer, scanner, resolver)
2. Pipeline core orchestration (normalize, parse, resolve, scan, save, graph)
3. Index.js files for core modules

### Phase 2: Pipeline & Storage (Weeks 3-4) - 107 tests
1. All pipeline phases and molecular chains
2. Storage manager and all sub-components
3. Contract tests for pipeline and storage

### Phase 3: Extractors (Weeks 5-7) - 207 tests
1. Comprehensive Extractor (main entry point)
2. Data Flow extractors
3. Metadata extractors (core functionality)

### Phase 4: Analysis & Race Detection (Weeks 8-10) - 118 tests
1. Tier 1, 2, 3 analyses
2. Race detector core functionality
3. Integration tests

### Phase 5: Edge Cases & Polish (Weeks 11-12) - 77 tests
1. TypeScript extractors
2. CSS-in-JS extractor
3. Static extractors
4. Remaining index.js files

**Total Estimated New Tests: ~553**

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Source files in Layer A | 606 |
| Existing test files | 159 |
| Existing contract tests | 10 |
| Untested source files | 447 |
| Untested index.js files | 115 |
| Untested directories | 109 |
| Estimated tests needed for 100% | ~553 |
| Tests needed for 80% coverage | ~326 |
| Tests needed for 60% coverage | ~205 |

---

## Quick Wins (High Impact, Low Effort)

1. **Root Infrastructure** - 4 tests for core orchestration
2. **Index.js Tests** - 115 simple integration tests
3. **Contract Tests** - 11 additional contract tests
4. **Pipeline Core** - 8 tests for main pipeline phases

**Quick Win Total: ~138 tests → Coverage jumps to ~49%**
