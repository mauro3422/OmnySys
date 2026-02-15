# Factories Architecture

## Goals

- Keep factories modular and easy to navigate.
- Avoid monolithic files that are hard to maintain.
- Preserve backward compatibility through stable entrypoints.

## Conventions

- One public entrypoint per factory:
  - Example: `extractor-test.factory.js`
- Internal modules by domain:
  - Example: `extractor-test/core-builders.js`
  - Example: `extractor-test/extraction-suite.js`
  - Example: `extractor-test/communication-suite.js`
- Entry points must only:
  - Re-export named APIs from internal modules.
  - Export a backward-compatible default object.

## Size Guardrail

- Preferred max per file: `<= 350` lines.
- Hard limit before mandatory split: `> 500` lines.

## Current State

- Top-level `*.factory.js` files are now thin entrypoints.
- Internal implementations live in `tests/factories/<factory-name>/`.
- Public imports remain stable (tests keep importing from `tests/factories/*.factory.js`).

## EntryPoint Pattern

- Example:
  - `tests/factories/pipeline-test.factory.js` (entrypoint)
  - `tests/factories/pipeline-test/builders.js`
  - `tests/factories/pipeline-test/helpers.js`

## Domain Map

- `analysis.factory.js` -> `analysis/`
- `comprehensive-extractor-test.factory.js` -> `comprehensive-extractor-test/`
- `css-in-js-test.factory.js` -> `css-in-js-test/`
- `data-flow-test.factory.js` -> `data-flow-test/`
- `detector-test.factory.js` -> `detector-test/`
- `extractor.factory.js` -> `extractor/`
- `extractor-test.factory.js` -> `extractor-test/`
- `graph-test.factory.js` -> `graph-test/`
- `module-system-test.factory.js` -> `module-system-test/`
- `parser-test.factory.js` -> `parser-test/`
- `pattern-detection-test.factory.js` -> `pattern-detection-test/`
- `phases-test.factory.js` -> `phases-test/`
- `pipeline-test.factory.js` -> `pipeline-test/`
- `query-test.factory.js` -> `query-test/`
- `race-detector-test.factory.js` -> `race-detector-test/`
- `root-infrastructure-test.factory.js` -> `root-infrastructure-test/`
- `state-management-test.factory.js` -> `state-management-test/`
- `static-extractor-test.factory.js` -> `static-extractor-test/`
- `tier3-analysis.factory.js` -> `tier3-analysis/`

## Migration Rule

- Refactor in small batches.
- Run focused suites that consume the factory before commit.
- Do not break existing import paths from tests.
