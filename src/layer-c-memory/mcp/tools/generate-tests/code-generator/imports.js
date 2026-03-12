/**
 * @fileoverview Import builders for generated tests.
 */

import { resolveFactory, resolveFactoryImportPath } from '../factory-catalog.js';

function findCorrectExportName(atom) {
  const atomName = atom.name;

  const commonSuffixes = ['Optimized', 'Async', 'V2', 'New', 'Internal', 'Helper'];
  for (const suffix of commonSuffixes) {
    if (atomName.endsWith(suffix)) {
      const baseName = atomName.slice(0, -suffix.length);
      return { primary: baseName, alternatives: [atomName, `${baseName}Async`, `validate${baseName}`] };
    }
  }

  if (atomName.startsWith('validate')) {
    return { primary: atomName, alternatives: [atomName + 'Optimized', atomName.replace('validate', 'validatePost')] };
  }

  if (atomName.startsWith('get') || atomName.startsWith('set') || atomName.startsWith('is')) {
    return { primary: atomName, alternatives: [atomName + 'Sync', atomName + 'Async', atomName] };
  }

  return { primary: atomName, alternatives: [atomName] };
}

function generateFunctionImport(atom, outputPath) {
  const importPath = resolveImportAlias(atom.filePath, outputPath);
  const { primary, alternatives } = findCorrectExportName(atom);

  return { importPath, exportName: primary, alternatives };
}

function getFileBasename(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

function resolveBranchImportSource(source, outputPath) {
  const resolvedSource = resolveImportAlias(source, outputPath);
  if (resolvedSource && resolvedSource !== source) {
    return resolvedSource;
  }

  return source.replace(/\/\.\//g, '/').replace(/^\.\//, './');
}

function buildFactoryImports(atom, outputPath) {
  const factoryEntry = resolveFactory(atom.filePath);
  if (!factoryEntry) {
    return '';
  }

  const importPath = resolveFactoryImportPath(factoryEntry.factoryPath, outputPath);
  const builderNames = Object.values(factoryEntry.builders || {})
    .filter(builder => builder?.name)
    .map(builder => builder.name);
  const uniqueBuilders = [...new Set(builderNames)];

  if (uniqueBuilders.length === 0) {
    return '';
  }

  return `import { ${uniqueBuilders.join(', ')} } from '${importPath}';\n`;
}

function buildBranchImports(branchImports, outputPath) {
  let code = '';

  for (const [source, names] of branchImports.entries()) {
    const resolvedSource = resolveBranchImportSource(source, outputPath);
    code += `import { ${[...names].join(', ')} } from '${resolvedSource}';\n`;
  }

  return code;
}

function buildSourceImports(atom, outputPath) {
  if (!atom.imports || atom.imports.length === 0) {
    return '';
  }

  const testedFileName = getFileBasename(atom.filePath).replace('.js', '');
  let code = '// Source imports\n';

  for (const imp of atom.imports) {
    if (imp.source.includes('vitest') || imp.source.includes('sandbox.js')) continue;
    if (imp.source.includes(testedFileName)) continue;

    const resolvedSource = resolveImportAlias(imp.source, outputPath);
    if (imp.specifiers && imp.specifiers.length > 0) {
      const specs = imp.specifiers
        .map(specifier => specifier.name === specifier.local ? specifier.name : `${specifier.name} as ${specifier.local}`)
        .join(', ');
      code += `import { ${specs} } from '${resolvedSource}';\n`;
      continue;
    }

    code += `import '${resolvedSource}';\n`;
  }

  return code;
}

export function collectBranchImports(tests) {
  const imports = new Map();

  for (const test of tests) {
    if (test.type !== 'branch' || !test.neededImports) {
      continue;
    }

    for (const [source, names] of Object.entries(test.neededImports)) {
      if (!imports.has(source)) {
        imports.set(source, new Set());
      }

      for (const name of names) {
        imports.get(source).add(name);
      }
    }
  }

  return imports;
}

export function generateImports(atom, useRealFactories, needSandbox, branchImports = new Map(), outputPath = 'tests/generated') {
  let code = "import { describe, it, expect, vi } from 'vitest';\n";

  if (needSandbox) {
    code += "import { withSandbox } from '#layer-c/test-utils/sandbox.js';\n";
  }

  if (useRealFactories && atom) {
    code += buildFactoryImports(atom, outputPath);
  }

  code += buildBranchImports(branchImports, outputPath);
  code += buildSourceImports(atom, outputPath);

  const { importPath, exportName, alternatives } = generateFunctionImport(atom, outputPath);
  code += `import { ${exportName} } from '${importPath}';\n\n`;

  atom._exportAlternatives = alternatives;
  return code;
}

export function resolveImportAlias(filePath, outputPath) {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (normalizedPath.startsWith('src/ai/')) return normalizedPath.replace('src/ai/', '#ai/');
  if (normalizedPath.startsWith('src/core/')) return normalizedPath.replace('src/core/', '#core/');
  if (normalizedPath.startsWith('src/layer-a-static/')) return normalizedPath.replace('src/layer-a-static/', '#layer-a/');
  if (normalizedPath.startsWith('src/layer-b-semantic/')) return normalizedPath.replace('src/layer-b-semantic/', '#layer-b/');
  if (normalizedPath.startsWith('src/layer-c-memory/')) return normalizedPath.replace('src/layer-c-memory/', '#layer-c/');
  if (normalizedPath.startsWith('src/layer-graph/')) return normalizedPath.replace('src/layer-graph/', '#layer-graph/');
  if (normalizedPath.startsWith('src/config/')) return normalizedPath.replace('src/config/', '#config/');

  if (outputPath) {
    const depth = outputPath.replace(/\\/g, '/').split('/').filter(Boolean).length;
    return `${'../'.repeat(depth)}${normalizedPath}`;
  }

  return `../../${normalizedPath}`;
}
