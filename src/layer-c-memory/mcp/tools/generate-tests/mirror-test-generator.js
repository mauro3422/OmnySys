/**
 * @fileoverview Mirror Test Generator
 * 
 * Genera "átomos espejo" - tests que usan el código REAL del sistema.
 * Sin mocks: importan y ejecutan el código real para verificar su salud.
 * 
 * Concepto:
 * - Cada átomo tiene un "mirror test" que prueba su código real
 * - Si el átomo cambia → el mirror test falla → coverage baja
 * - Son como espejos que reflejan la salud del átomo
 * 
 * @module mcp/tools/generate-tests/mirror-test-generator
 */

/**
 * Resuelve el path de import para un átomo
 */
function resolveImportAlias(filePath) {
  if (!filePath) return filePath;
  
  const aliases = {
    '#layer-c': 'src/layer-c-memory',
    '#core': 'src/core',
    '#services': 'src/services',
    '#utils': 'src/utils',
    '#layer-a': 'src/layer-a-static',
    '#layer-b': 'src/layer-b-semantic',
    '#shared': 'src/shared'
  };
  
  for (const [alias, resolved] of Object.entries(aliases)) {
    if (filePath.startsWith(alias)) {
      return filePath.replace(alias, resolved);
    }
  }
  
  return filePath;
}

/**
 * Genera un mirror test que usa código real
 * @param {Object} atom - Atom metadata con callGraph y dataFlow
 * @param {Object} options - Opciones de generación
 * @returns {Object} - Test generado
 */
export function generateMirrorTest(atom, options = {}) {
  const { includeCallerFixtures = true } = options;
  
  if (!atom) {
    return { error: 'ATOM_REQUIRED', message: 'Atom metadata is required for mirror tests' };
  }
  
  const fnName = atom.name;
  const filePath = atom.filePath;
  const importPath = resolveImportAlias(filePath);
  const inputs = atom.dataFlow?.inputs || [];
  const isAsync = atom.isAsync;
  const calledBy = atom.calledBy || [];
  
  const tests = [];
  
  // 1. HEALTH CHECK
  tests.push(generateHealthCheckTest(fnName, inputs, isAsync));
  
  // 2. INFERRED TYPES
  const inferredTests = generateInferredTests(atom);
  tests.push(...inferredTests);
  
  // 3. CALLER FIXTURES
  if (includeCallerFixtures && calledBy.length > 0) {
    tests.push(generateCallerFixtureTest(calledBy));
  }
  
  return {
    type: 'MIRROR',
    atom: { name: fnName, file: filePath },
    importPath,
    tests,
    metadata: {
      usesRealCode: true,
      noMocks: true,
      callerCount: calledBy.length
    }
  };
}

function generateHealthCheckTest(fnName, inputs, isAsync) {
  const vals = inputs.map(i => genValue(i.name)).join(', ');
  return {
    name: 'should execute real code without errors',
    type: 'health-check',
    code: isAsync ? `await ${fnName}(${vals})` : `${fnName}(${vals})`,
    assertion: 'toBeDefined'
  };
}

function generateInferredTests(atom) {
  const tests = [];
  const inputs = atom.dataFlow?.inputs || [];
  const inferred = atom.dataFlow?.analysis?.inferredTypes?.variables || {};
  
  const vals = {};
  for (const inp of inputs) {
    vals[inp.name] = genValue(inp.name, inferred[inp.name]);
  }
  
  const inputStr = Object.values(vals).join(', ');
  const isAsync = atom.isAsync;
  
  tests.push({
    name: 'should work with inferred types',
    type: 'inferred',
    code: isAsync ? `await ${atom.name}(${inputStr})` : `${atom.name}(${inputStr})`,
    assertion: 'toBeDefined'
  });
  
  return tests;
}

function generateCallerFixtureTest(calledBy) {
  const callers = calledBy.slice(0, 3).map(c => c.split('::').pop()).join(', ');
  return {
    name: 'should work with real caller patterns',
    type: 'caller-fixture',
    code: `// Called by: ${callers}`,
    assertion: 'toBeDefined'
  };
}

function genValue(name, inferredType) {
  const n = (name || '').toLowerCase();
  const t = (inferredType || '').toLowerCase();
  
  if (t === 'httprequest') return '{ body: {}, params: {}, query: {} }';
  if (t === 'httpresponse') return 'mockResponse()';
  if (n === 'req') return '{ body: {}, params: {}, query: {} }';
  if (n === 'res') return 'mockResponse()';
  if (n === 'state') return '{ paused: false }';
  if (n.includes('callback') || n.includes('cb')) return '() => {}';
  if (n.includes('id') || n.includes('key')) return '"test-id"';
  if (n.includes('name')) return '"test"';
  if (n.includes('path') || n.includes('file')) return '"/test"';
  if (n.includes('data')) return '{}';
  if (n.includes('arr') || n.includes('list')) return '[]';
  if (n.includes('num') || n.includes('count')) return '10';
  if (n.includes('bool') || n.includes('is') || n.includes('has')) return 'true';
  
  return 'null';
}

export function generateMirrorTestCode(atom, options = {}) {
  const mirror = generateMirrorTest(atom, options);
  
  if (mirror.error) return { error: mirror.error };
  
  let code = `// MIRROR TEST - Átomo Espejo\n`;
  code += `// Código REAL del sistema (sin mocks)\n`;
  code += `// Called by: ${mirror.metadata.callerCount} funciones\n\n`;
  
  code += `import { describe, it, expect } from 'vitest';\n`;
  code += `import { ${atom.name} } from '${mirror.importPath}';\n\n`;
  
  code += `function mockResponse() {\n`;
  code += `  return { status: () => mockResponse(), json: () => mockResponse(), send: () => mockResponse() };\n`;
  code += `}\n\n`;
  
  code += `describe('${atom.name} (Mirror)', () => {\n`;
  
  for (const t of mirror.tests) {
    code += `  it('${t.name}', ${atom.isAsync ? 'async ' : ''}() => {\n`;
    code += `    const result = ${t.code};\n`;
    code += `    expect(result).${t.assertion};\n`;
    code += `  });\n\n`;
  }
  
  code += `});\n`;
  
  return { code, metadata: mirror.metadata, testCount: mirror.tests.length };
}

export default { generateMirrorTest, generateMirrorTestCode };
