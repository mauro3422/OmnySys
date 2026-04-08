import { builtinModules } from 'node:module';

export function normalizeCompilerPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

export function isTestFactorySurface(filePath = '') {
  const normalized = normalizeCompilerPath(filePath);
  return normalized.startsWith('tests/factories/');
}

export function isBuiltinModuleSpecifier(modulePath = '') {
  const normalized = String(modulePath || '').replace(/^node:/, '');
  return builtinModules.includes(normalized);
}

export function isExternalNonCanonicalModule(modulePath = '') {
  const normalized = String(modulePath || '');
  return !normalized.startsWith('.') &&
    !normalized.startsWith('#') &&
    !isBuiltinModuleSpecifier(normalized);
}

export function buildMissingDatabaseResult(filePath) {
  return {
    valid: false,
    totalImports: 0,
    invalidCount: 1,
    invalid: [{
      importName: '*',
      fromModule: filePath,
      line: 0,
      valid: false,
      error: 'DB_MISSING: file is not indexed in the canonical compiler DB',
      chain: []
    }],
    results: [],
    validationMode: 'database_only',
    compilerIndexed: false
  };
}

export function buildSkippedTestFactoryResult(filePath) {
  return {
    valid: true,
    totalImports: 0,
    invalidCount: 0,
    invalid: [],
    results: [],
    validationMode: 'database_only',
    compilerIndexed: false,
    skipped: true,
    reason: 'test_factory_surface',
    filePath
  };
}

export function buildSkippedImportResult(imp, fromModule) {
  if (!fromModule) return null;

  if (!isBuiltinModuleSpecifier(fromModule) && !isExternalNonCanonicalModule(fromModule)) {
    return null;
  }

  const builtin = isBuiltinModuleSpecifier(fromModule);

  return {
    importName: fromModule,
    exportName: fromModule,
    fromModule,
    line: imp.line || imp.loc?.start?.line || 0,
    valid: true,
    skipped: true,
    reason: builtin ? 'builtin_module' : 'external_module',
    chain: []
  };
}

export function buildSkippedNamespaceImportResult(imp, fromModule) {
  return {
    importName: fromModule || '*',
    exportName: '* as namespace',
    fromModule,
    line: imp.line || imp.loc?.start?.line || 0,
    valid: true,
    skipped: true,
    reason: 'namespace_import',
    chain: []
  };
}
