/**
 * @fileoverview function-builder.js
 * 
 * Sub-builder for function and arrow declarations
 * 
 * @module tests/factories/parser-test/builders/function
 */

export class FunctionBuilder {
    buildFunction(name, params = [], body = 'return null;', options = {}) {
        const async = options.async ? 'async ' : '';
        const generator = options.generator ? '* ' : '';
        const exported = options.exported ? 'export ' : '';
        const paramStr = params.join(', ');
        return exported + async + 'function' + generator + ' ' + name + '(' + paramStr + ') {\n  ' + body + '\n}\n\n';
    }

    buildArrow(name, params = [], body = 'null', options = {}) {
        const exported = options.exported ? 'export ' : '';
        const paramStr = params.join(', ');
        const blockBody = options.block ? '{\n  return ' + body + ';\n}' : body;
        return exported + 'const ' + name + ' = (' + paramStr + ') => ' + blockBody + ';\n\n';
    }

    buildFunctionExpression(name, params = [], body = 'return null;', options = {}) {
        const exported = options.exported ? 'export ' : '';
        const async = options.async ? 'async ' : '';
        const paramStr = params.join(', ');
        return exported + 'const ' + name + ' = ' + async + 'function(' + paramStr + ') {\n  ' + body + '\n};\n\n';
    }
}
