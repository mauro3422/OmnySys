/**
 * @fileoverview Canonical contract for onboarding a new Layer A language.
 *
 * The contract is intentionally language-agnostic at the output boundary:
 * parsers/extractors can vary internally, but canonical surfaces must still
 * project into the same file/atom/connection shapes consumed by the rest of
 * the pipeline.
 *
 * @module shared/compiler/language-contract
 */

const REQUIRED_CANONICAL_SURFACES = Object.freeze([
  'files',
  'atoms',
  'atom_relations',
  'compiler_scanned_files'
]);

const REQUIRED_ADAPTER_METHODS = Object.freeze([
  'parse',
  'extractFile',
  'extractAtoms',
  'mapMetadata',
  'getSupportedExtensions'
]);

const REQUIRED_ATOM_FIELDS = Object.freeze([
  'id',
  'name',
  'atom_type',
  'file_path'
]);

export const LANGUAGE_ADAPTER_CONTRACT = Object.freeze({
  version: 1,
  parserAdapter: Object.freeze({
    requiredMethods: REQUIRED_ADAPTER_METHODS,
    input: Object.freeze({
      filePath: 'string',
      source: 'string'
    }),
    output: Object.freeze({
      language: 'string',
      ast: 'object|null',
      parseErrors: 'array',
      diagnostics: 'array'
    })
  }),
  extractorContract: Object.freeze({
    requiredFileFields: Object.freeze([
      'filePath',
      'fileName',
      'ext',
      'imports',
      'exports',
      'definitions',
      'functions',
      'calls'
    ]),
    requiredAtomFields: REQUIRED_ATOM_FIELDS,
    optionalLanguageFields: Object.freeze([
      'typeDefinitions',
      'enumDefinitions',
      'objectExports',
      'identifierRefs'
    ])
  }),
  metadataAtomMapping: Object.freeze({
    requiredFileMetadata: Object.freeze([
      'language',
      'parserVersion'
    ]),
    requiredAtomMetadata: Object.freeze([
      'line_start',
      'line_end',
      'complexity'
    ]),
    canonicalRelations: Object.freeze([
      'calls',
      'imports',
      'exports'
    ])
  }),
  canonicalSurfaces: Object.freeze({
    required: REQUIRED_CANONICAL_SURFACES,
    languageSpecificInternalsAllowed: true,
    mustNotDependOnJsTsSemantics: true
  })
});

export function createLanguageAdapterContract(overrides = {}) {
  return {
    ...LANGUAGE_ADAPTER_CONTRACT,
    ...overrides
  };
}

export function assertLanguageAdapterContract(adapter = {}) {
  const missingMethods = REQUIRED_ADAPTER_METHODS.filter(
    (methodName) => typeof adapter[methodName] !== 'function'
  );

  const supportedExtensions = typeof adapter.getSupportedExtensions === 'function'
    ? adapter.getSupportedExtensions()
    : [];

  return {
    valid: missingMethods.length === 0 && Array.isArray(supportedExtensions) && supportedExtensions.length > 0,
    missingMethods,
    supportedExtensions,
    requiredCanonicalSurfaces: REQUIRED_CANONICAL_SURFACES,
    requiredAtomFields: REQUIRED_ATOM_FIELDS
  };
}
