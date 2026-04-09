# Unreleased Changes - 2026-02-15

## Test Factories Modularization

**Split 17 monolithic factory files** (800+ lines each) into domain-specific submodules with stable entrypoints.

### Architecture
- **Entry:** `tests/factories/<name>.factory.js` (thin facades)
- **Internals:** `tests/factories/<name>/{builders,scenarios,helpers,validators,constants,...}.js`

### Factories Refactored
- `graph-test` - Graph and system map builders
- `phases-test` - Phase contexts and atom metadata
- `static-extractor-test` - Routes/env/events/storage/globals builders
- `comprehensive-extractor-test` - Extraction configs and scenarios
- `state-management-test` - Redux/context/state fixtures
- `race-detector-test` - Race scenarios and strategies
- `tier3-analysis` - Tier3 analysis fixtures
- `pipeline-test` - Pipeline and molecular chain builders
- `module-system-test` - Module and dependency builders
- `data-flow-test` - AST and transformation fixtures
- `query-test` - Project/file/query builders
- `parser-test` - Code sample and AST builders
- `root-infrastructure-test` - Infrastructure builders
- `detector-test` - Detector test fixtures
- `analysis` - Analysis mocks and suites
- `extractor` - Extractor contracts
- `pattern-detection-test` - Pattern detection fixtures

### Benefits
- ✅ Top-level factories reduced from **800+ to <70 lines**
- ✅ **100% backward compatible** imports
- ✅ Better maintainability and separation of concerns
- ✅ All factory entrypoints pass import smoke-tests

### Documentation Added
- `tests/factories/README.md` - Architecture guide
- `tests/factories/FACTORY_RELATIONS.md` - Factory-to-suite relationship map
- `tests/LAYER_A_PROGRESS_LOG.md` - Updated with refactor details

---

## Layer A Test Suite Stabilization

Macro summary (~406 accumulated changes across recent multi-agent passes):
- Layer A stabilized systems: pipeline, extractors (comprehensive/data-flow/metadata/static/css-in-js), analyses (tier1-3 + root), graph, parser, query, race-detector, pattern-detection
- Test architecture stabilized around Factory + Contract patterns
- Loader/runtime blockers reduced by normalizing aliases, fixing broken relative imports, and removing duplicate export collisions

### Changes
- Added aliases `#molecular-chains/*` and `#test-factories/*` in `package.json` for more maintainable imports
- Fixed multiple Layer A loader blockers (broken relative imports, duplicate exports, missing compatibility exports)
- Added `tests/LAYER_A_AUDIT_2026-02-15.md` with current status, risks, and next execution order
- Added `tests/LAYER_A_PROGRESS_LOG.md` to preserve baseline-to-current traceability

### Coverage Batches Added
- **Tier3 structural coverage**: 8 new test files, 23 tests passing
- **Pipeline batch #1**: 13 new test files, 24 tests passing
- **Pipeline batch #2**: 19 new no-mock test files, 31 tests passing
- **Pipeline batch #3**: 10 new no-mock test files, 16 tests passing
- **Pipeline batch #4**: 22 new no-mock test files, 74 tests passing
- **Race Detector batch #1**: 8 new no-mock test files, 13 tests passing
- **Race Detector batch #2**: 8 new no-mock test files, 15 tests passing
- **Race Detector batch #3**: 14 new no-mock test files, 22 tests passing
- **Race Detector batch #4**: 19 new no-mock test files, 23 tests passing
- **Extractors Metadata batch #1**: 20 new no-mock test files, 27 tests passing
- **Extractors Metadata batch #2**: 29 new no-mock test files, 58 tests passing
- **Analyses Tier1 batch #1**: 15 new no-mock tests, 30/30 passing
- **Analyses batch #2**: 33 new no-mock tests, 44/44 passing
- **Storage batch #1**: 16 new no-mock tests, 16/16 passing
- **Module-System + Pattern-Detection**: 30 new no-mock tests, 73/73 passing
- **Extractors batch #3**: 120 new tests, 360/360 passing

### Final State
- **684 test files** with **0 direct gaps** (1:1 source-test mapping complete for `src/layer-a-static`)
