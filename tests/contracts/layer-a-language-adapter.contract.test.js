import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_ADAPTER_CONTRACT,
  assertLanguageAdapterContract
} from '../../src/shared/compiler/language-contract.js';

describe('Layer A Language Adapter Contract', () => {
  it('exposes the canonical onboarding sections', () => {
    expect(LANGUAGE_ADAPTER_CONTRACT.version).toBe(1);
    expect(LANGUAGE_ADAPTER_CONTRACT).toHaveProperty('parserAdapter');
    expect(LANGUAGE_ADAPTER_CONTRACT).toHaveProperty('extractorContract');
    expect(LANGUAGE_ADAPTER_CONTRACT).toHaveProperty('metadataAtomMapping');
    expect(LANGUAGE_ADAPTER_CONTRACT).toHaveProperty('canonicalSurfaces');
  });

  it('requires language-agnostic canonical surfaces', () => {
    expect(LANGUAGE_ADAPTER_CONTRACT.canonicalSurfaces.required).toEqual([
      'files',
      'atoms',
      'atom_relations',
      'compiler_scanned_files'
    ]);
    expect(LANGUAGE_ADAPTER_CONTRACT.canonicalSurfaces.mustNotDependOnJsTsSemantics).toBe(true);
  });

  it('validates adapters against the required parser/extractor methods', () => {
    const valid = assertLanguageAdapterContract({
      parse: async () => ({}),
      extractFile: async () => ({}),
      extractAtoms: async () => ([]),
      mapMetadata: () => ({}),
      getSupportedExtensions: () => ['.py']
    });

    expect(valid.valid).toBe(true);
    expect(valid.missingMethods).toEqual([]);
  });

  it('reports missing adapter methods clearly', () => {
    const invalid = assertLanguageAdapterContract({
      parse: async () => ({})
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.missingMethods.length).toBeGreaterThan(0);
  });
});
