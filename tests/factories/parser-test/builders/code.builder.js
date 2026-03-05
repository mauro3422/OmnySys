/**
 * @fileoverview code.builder.js
 * 
 * Builder for generating JavaScript source code combinations
 * 
 * @module tests/factories/parser-test/code
 */

import { FunctionBuilder } from './function.builder.js';
import { ClassBuilder } from './class-generator.builder.js';
import { TSBuilder } from './ts.builder.js';

export class CodeSampleBuilder {
    constructor() {
        this.code = '';
        this.filePath = 'test.js';

        // Specialized sub-builders
        this.fnBuilder = new FunctionBuilder();
        this.classBuilder = new ClassBuilder();
        this.tsBuilder = new TSBuilder();
    }

    withFunction(name, params = [], body = 'return null;', options = {}) {
        this.code += this.fnBuilder.buildFunction(name, params, body, options);
        return this;
    }

    withArrow(name, params = [], body = 'null', options = {}) {
        this.code += this.fnBuilder.buildArrow(name, params, body, options);
        return this;
    }

    withFunctionExpression(name, params = [], body = 'return null;', options = {}) {
        this.code += this.fnBuilder.buildFunctionExpression(name, params, body, options);
        return this;
    }

    withClass(name, methods = [], options = {}) {
        this.code += this.classBuilder.buildClass(name, methods, options);
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
        this.code += this.tsBuilder.buildInterface(name, properties, options);
        return this;
    }

    withTSTypeAlias(name, definition, options = {}) {
        this.code += this.tsBuilder.buildTypeAlias(name, definition, options);
        return this;
    }

    withTSEnum(name, members = {}, options = {}) {
        this.code += this.tsBuilder.buildEnum(name, members, options);
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
