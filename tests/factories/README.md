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

## Migration Rule

- Refactor in small batches.
- Run focused suites that consume the factory before commit.
- Do not break existing import paths from tests.
