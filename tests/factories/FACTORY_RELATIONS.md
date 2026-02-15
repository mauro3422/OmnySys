# Factory Relations

## Purpose

This map explains how factory modules relate to Layer A test suites.

## How It Works

- Test files import from stable entrypoints in `tests/factories/*.factory.js`.
- Each entrypoint re-exports builders/scenarios/helpers from `tests/factories/<name>/`.
- Builders generate realistic structures (system maps, atoms, connections, project files).
- Scenarios compose builders for reusable test arrangements.
- Validators/contracts standardize assertions across suites.

## Factory -> Test Areas

- `graph-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/graph/**`
  - Provides: graph/system-map builders and graph scenarios
- `phases-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/pipeline/phases/**`
  - Provides: phase contexts, atom metadata, phase contracts
- `pipeline-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/pipeline/**`
  - Provides: pipeline/file/molecular-chain/enhancer builders
- `comprehensive-extractor-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/extractors/comprehensive-extractor/**`
  - Provides: extraction configs, class/function/import-export scenarios
- `static-extractor-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/extractors/static/**`
  - Provides: routes/env/events/storage/globals builders
- `css-in-js-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/extractors/css-in-js-extractor/**`
  - Provides: styled/theme/global style fixtures
- `data-flow-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/extractors/data-flow/**`
  - Provides: AST/output/transformation/type fixtures
- `module-system-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/module-system/**`
  - Provides: modules/projects/dependencies/entry points
- `query-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/query/**`
  - Provides: project/file/connection/query builders
- `race-detector-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/race-detector/**`
  - Provides: race scenarios/strategies/mitigation fixtures
- `root-infrastructure-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/analyses/root/**`, root analyzer/indexer/scanner/resolver tests
  - Provides: infrastructure system-map/project builders and integration scenarios
- `tier3-analysis.factory.js` and `detector-test.factory.js`
  - Used by: `tests/unit/layer-a-analysis/tier3/**`
  - Provides: detector and advanced analysis fixtures
- `analysis.factory.js` and `extractor.factory.js`
  - Used by: shared contract/structure suites across analyses and extractors
  - Provides: reusable suite generators and constants

## Why This Helps

- Smaller files reduce context load and editing risk.
- Consistent entrypoints keep old tests stable.
- New systems can be added by creating a new `<domain>/` folder and re-exporting via one entrypoint.
