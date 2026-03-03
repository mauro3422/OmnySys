/**
 * @fileoverview code.builder.js
 * 
 * Builder for generating JavaScript source code combinations
 * 
 * @module tests/factories/parser-test/code
 */

export class CodeSampleBuilder {
    constructor() {
        this.code = '';
        this.filePath = 'test.js';
    }

    withFunction(name, params = [], body = 'return null;', options = {}) {
        const async = options.async ? 'async ' : '';
        const generator = options.generator ? '* ' : '';
        const exported = options.exported ? 'export ' : '';
        const paramStr = params.join(', ');
        const funcCode = exported + async + 'function' + generator + ' ' + name + '(' + paramStr + ') {\n  ' + body + '\n}\n\n';
        this.code += funcCode;
        return this;
    }

    withArrow(name, params = [], body = 'null', options = {}) {
        const exported = options.exported ? 'export ' : '';
        const paramStr = params.join(', ');
        const blockBody = options.block ? '{\n  return ' + body + ';\n}' : body;
        const arrowCode = exported + 'const ' + name + ' = (' + paramStr + ') => ' + blockBody + ';\n\n';
        this.code += arrowCode;
        return this;
    }

    withFunctionExpression(name, params = [], body = 'return null;', options = {}) {
        const exported = options.exported ? 'export ' : '';
        const async = options.async ? 'async ' : '';
        const paramStr = params.join(', ');
        const exprCode = exported + 'const ' + name + ' = ' + async + 'function(' + paramStr + ') {\n  ' + body + '\n};\n\n';
        this.code += exprCode;
        return this;
    }

    withClass(name, methods = [], options = {}) {
        const exported = options.exported ? 'export ' : '';
        const extendsClause = options.extends ? ' extends ' + options.extends : '';
        let classCode = exported + 'class ' + name + extendsClause + ' {\n';
        for (const method of methods) {
            const staticKeyword = method.static ? 'static ' : '';
            const async = method.async ? 'async ' : '';
            const params = method.params?.join(', ') || '';
            const methodBody = method.body || '';
            classCode += '  ' + staticKeyword + async + method.name + '(' + params + ') {\n    ' + methodBody + '\n  }\n\n';
        }
        classCode += '}\n\n';
        this.code += classCode;
        return this;
    }

    withImport(source, specifiers = [], options = {}) {
        let importCode = '';
        if (options.default && specifiers.length > 0) {
            importCode = "import " + specifiers[0] + " from '" + source + "';\n";
        } else if (options.namespace && specifiers.length > 0) {
            importCode = "import * as " + specifiers[0] + " from '" + source + "';\n";
        } else if (specifiers.length > 0) {
            const specStr = specifiers.join(', ');
            importCode = "import { " + specStr + " } from '" + source + "';\n";
        } else {
            importCode = "import '" + source + "';\n";
        }
        this.code += importCode + '\n';
        return this;
    }

    withExport(name, options = {}) {
        if (options.default) {
            this.code += 'export default ' + name + ';\n\n';
        } else if (options.kind) {
            this.code += 'export ' + options.kind + ' ' + name + ' = ...;\n\n';
        } else {
            this.code += 'export { ' + name + ' };\n\n';
        }
        return this;
    }

    withExportDeclaration(kind, name, value) {
        if (kind === 'function') {
            this.code += 'export function ' + name + '() {\n  ' + (value || 'return null;') + '\n}\n\n';
        } else if (kind === 'class') {
            this.code += 'export class ' + name + ' {\n  ' + (value || '') + '\n}\n\n';
        } else {
            this.code += 'export ' + kind + ' ' + name + ' = ' + (value || 'null') + ';\n\n';
        }
        return this;
    }

    withRequire(variable, source) {
        if (variable) {
            this.code += "const " + variable + " = require('" + source + "');\n\n";
        } else {
            this.code += "require('" + source + "');\n\n";
        }
        return this;
    }

    withDynamicImport(source, variable = null) {
        if (variable) {
            this.code += 'const ' + variable + ' = await import(\'' + source + '\');\n\n';
        } else {
            this.code += 'import(\'' + source + '\');\n\n';
        }
        return this;
    }

    withCall(name, args = []) {
        const argStr = args.join(', ');
        this.code += name + '(' + argStr + ');\n\n';
        return this;
    }

    withMemberCall(object, method, args = []) {
        const argStr = args.join(', ');
        this.code += object + '.' + method + '(' + argStr + ');\n\n';
        return this;
    }

    withTSInterface(name, properties = {}, options = {}) {
        const exported = options.exported ? 'export ' : '';
        let interfaceCode = exported + 'interface ' + name + ' {\n';
        for (const [propName, propType] of Object.entries(properties)) {
            interfaceCode += '  ' + propName + ': ' + propType + ';\n';
        }
        interfaceCode += '}\n\n';
        this.code += interfaceCode;
        return this;
    }

    withTSTypeAlias(name, definition, options = {}) {
        const exported = options.exported ? 'export ' : '';
        this.code += exported + 'type ' + name + ' = ' + definition + ';\n\n';
        return this;
    }

    withTSEnum(name, members = {}, options = {}) {
        const exported = options.exported ? 'export ' : '';
        let enumCode = exported + 'enum ' + name + ' {\n';
        for (const [memberName, memberValue] of Object.entries(members)) {
            enumCode += '  ' + memberName + (memberValue !== undefined ? ' = ' + memberValue : '') + ',\n';
        }
        enumCode += '}\n\n';
        this.code += enumCode;
        return this;
    }

    withVariable(kind, name, value, options = {}) {
        const exported = options.exported ? 'export ' : '';
        this.code += exported + kind + ' ' + name + ' = ' + value + ';\n\n';
        return this;
    }

    withObject(name, properties = {}, options = {}) {
        const exported = options.exported ? 'export ' : '';
        const props = Object.entries(properties).map(([key, val]) => {
            if (typeof val === 'function') {
                return '  ' + key + val();
            } else if (typeof val === 'object' && val !== null) {
                return '  ' + key + ': ' + JSON.stringify(val);
            } else {
                return '  ' + key + ': ' + val;
            }
        }).join(',\n');
        this.code += exported + 'const ' + name + ' = {\n' + props + '\n};\n\n';
        return this;
    }

    atFilePath(filePath) {
        this.filePath = filePath;
        return this;
    }

    withRaw(code) {
        this.code += code + '\n';
        return this;
    }

    build() {
        return {
            code: this.code,
            filePath: this.filePath
        };
    }
}
