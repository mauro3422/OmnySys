/**
 * @fileoverview Import analyzer helpers
 *
 * Cohesive helpers for collecting external module usage from molecules.
 */

export function createImportPatterns() {
  return [
    { prefix: /^db\./, module: 'database' },
    { prefix: /^redis\./, module: 'redis' },
    { prefix: /^cache\./, module: 'cache' },
    { prefix: /^logger\./, module: 'logger' },
    { prefix: /^config\./, module: 'config' }
  ];
}

export function collectModuleImports(molecules, moduleName, patterns) {
  const imports = new Map();

  for (const molecule of molecules) {
    for (const atom of molecule.atoms || []) {
      collectAstImports(atom, imports, moduleName);
      collectExternalCalls(atom, imports, moduleName, patterns);
    }
  }

  return Array.from(imports.entries()).map(([module, functions]) => ({
    module,
    functions: Array.from(functions),
    count: functions.size
  }));
}

export function inferModuleFromSource(source) {
  if (!source) return null;

  if (!source.startsWith('.') && !source.startsWith('#') && !source.startsWith('/')) {
    return source.split('/')[0];
  }

  const aliasMatch = source.match(/^#([\w-]+)/);
  if (aliasMatch) return aliasMatch[1];

  const parts = source.replace(/^[./]+/, '').split('/');
  const srcIndex = parts.indexOf('src');
  if (srcIndex !== -1 && parts[srcIndex + 1]) return parts[srcIndex + 1];

  return parts[0] || null;
}

export function inferModuleFromCallName(functionName, patterns) {
  for (const { prefix, module } of patterns) {
    if (prefix.test(functionName)) return module;
  }

  return 'external';
}

function collectAstImports(atom, imports, moduleName) {
  for (const importEntry of atom.imports || []) {
    const source = importEntry.source || '';
    const targetModule = inferModuleFromSource(source);
    if (!targetModule || targetModule === moduleName) continue;

    const targetImports = ensureTargetImports(imports, targetModule);
    const specifiers = importEntry.specifiers || [];

    for (const specifier of specifiers) {
      const name = specifier.imported || specifier.local || specifier.name || source;
      targetImports.add(name);
    }

    if (specifiers.length === 0) {
      targetImports.add(source);
    }
  }
}

function collectExternalCalls(atom, imports, moduleName, patterns) {
  for (const call of atom.calls || []) {
    if (call.type !== 'external') continue;

    const inferredModule = inferModuleFromCallName(call.name, patterns);
    if (!inferredModule || inferredModule === moduleName || inferredModule === 'external') continue;

    ensureTargetImports(imports, inferredModule).add(call.name);
  }
}

function ensureTargetImports(imports, targetModule) {
  if (!imports.has(targetModule)) {
    imports.set(targetModule, new Set());
  }

  return imports.get(targetModule);
}
