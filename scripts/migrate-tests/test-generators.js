/**
 * @fileoverview Test Generators - Genera tests usando Meta-Factory
 */

export function generateAnalysisTest(moduleName, exportNames, importLines, specificTests) {
  return `import { createAnalysisTestSuite } from '#tests/factories/meta-factory.js';
${importLines.join('\n')}

describe('${moduleName}', () => {
  createAnalysisTestSuite({
    module: '${moduleName}',
    importFn: async () => import('#src/${moduleName}.js'),
    exportNames: ${JSON.stringify(exportNames)},
    specificTests: [
${specificTests.map(t => `      { name: '${t.name}', fn: ${t.fn} }`).join(',\n')}
    ]
  });
});
`;
}

export function generateUtilityTest(moduleName, exportNames, importLines, specificTests) {
  return `import { createUtilityTestSuite } from '#tests/factories/meta-factory.js';
${importLines.join('\n')}

describe('${moduleName}', () => {
  createUtilityTestSuite({
    module: '${moduleName}',
    importFn: async () => import('#src/${moduleName}.js'),
    exportNames: ${JSON.stringify(exportNames)},
    specificTests: [
${specificTests.map(t => `      { name: '${t.name}', fn: ${t.fn} }`).join(',\n')}
    ]
  });
});
`;
}

export function generateDetectorTest(moduleName, exportNames, importLines, specificTests) {
  return `import { createDetectorTestSuite } from '#tests/factories/meta-factory.js';
${importLines.join('\n')}

describe('${moduleName}', () => {
  createDetectorTestSuite({
    module: '${moduleName}',
    importFn: async () => import('#src/${moduleName}.js'),
    exportNames: ${JSON.stringify(exportNames)},
    specificTests: [
${specificTests.map(t => `      { name: '${t.name}', fn: ${t.fn} }`).join(',\n')}
    ]
  });
});
`;
}
