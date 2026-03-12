import { getAtomSemantics } from '../atom-semantic-analyzer/index.js';
import { generateInputCall } from './fallback-values.js';

export function generateTestCase(atom, test, useSandbox, indent = '  ') {
  let code = '';
  const inputs = atom.dataFlow?.inputs || [];
  const isAsync = atom.isAsync;
  const inner = indent + '  ';
  const semantics = getAtomSemantics(atom);
  const isVoid = !semantics.hasReturnValue;
  const isVoidMutation = semantics.isVoidSideEffect && semantics.mutatedParams.length > 0;
  const fnName = atom._exportAlternatives?.[0] || atom.name;
  const needsAsync = isAsync || useSandbox;

  code += `${indent}it('${test.name}', ${needsAsync ? 'async ' : ''}() => {\n`;

  if (test.setup?.length > 0) {
    for (const line of test.setup) {
      code += `${inner}${line}\n`;
    }
  }

  const inputCall = generateInputCall(inputs, test.inputs, atom);
  const isThrowTest = test.type === 'error-throw' || test.assertion?.includes('toThrow');

  if (isVoidMutation && !isThrowTest) {
    const mutatedParam = semantics.mutatedParams[0];
    const paramHint = semantics.paramHints.find(param => param.name === mutatedParam);
    const spyMethod = paramHint?.methods?.[0] || 'push';
    code += `${inner}const ${mutatedParam} = { ${spyMethod}: vi.fn() };\n`;
    code += `${inner}${isAsync ? 'await ' : ''}${fnName}(${mutatedParam});\n`;
    code += `${inner}expect(${mutatedParam}.${spyMethod}).toHaveBeenCalled();\n`;
    code += `${indent}});\n\n`;
    return code;
  }

  if (useSandbox) {
    code += `${inner}await withSandbox({}, async (sandbox) => {\n`;
    if (isThrowTest && isAsync) {
      code += `${inner}  await expect(${fnName}(${inputCall})).rejects.toThrow();\n`;
    } else if (isThrowTest) {
      code += `${inner}  expect(() => ${fnName}(${inputCall})).toThrow();\n`;
    } else if (isVoid) {
      code += `${inner}  ${isAsync ? 'await ' : ''}${fnName}(${inputCall});\n`;
      code += `${inner}  ${test.assertion || 'expect(true).toBe(true)'};\n`;
    } else {
      code += `${inner}  const result = ${isAsync ? 'await ' : ''}${fnName}(${inputCall});\n`;
      code += `${inner}  ${test.assertion};\n`;
    }
    code += `${inner}});\n`;
  } else if (isThrowTest && isAsync) {
    code += `${inner}await expect(${fnName}(${inputCall})).rejects.toThrow();\n`;
  } else if (isThrowTest) {
    code += `${inner}expect(() => ${fnName}(${inputCall})).toThrow();\n`;
  } else if (isVoid) {
    code += `${inner}${isAsync ? 'await ' : ''}${fnName}(${inputCall});\n`;
    code += `${inner}  ${test.assertion || 'expect(true).toBe(true)'};\n`;
  } else {
    code += `${inner}const result = ${isAsync ? 'await ' : ''}${fnName}(${inputCall});\n`;
    code += `${inner}  ${test.assertion};\n`;
  }

  code += `${indent}});\n\n`;
  return code;
}
