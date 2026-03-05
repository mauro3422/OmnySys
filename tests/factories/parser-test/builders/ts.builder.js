/**
 * @fileoverview ts-builder.js
 * 
 * Sub-builder for TypeScript-specific syntax (Interfaces, Types, Enums)
 * 
 * @module tests/factories/parser-test/builders/ts
 */

export class TSBuilder {
    buildInterface(name, properties = {}, options = {}) {
        const exported = options.exported ? 'export ' : '';
        let interfaceCode = exported + 'interface ' + name + ' {\n';
        for (const [propName, propType] of Object.entries(properties)) {
            interfaceCode += '  ' + propName + ': ' + propType + ';\n';
        }
        interfaceCode += '}\n\n';
        return interfaceCode;
    }

    buildTypeAlias(name, definition, options = {}) {
        const exported = options.exported ? 'export ' : '';
        return exported + 'type ' + name + ' = ' + definition + ';\n\n';
    }

    buildEnum(name, members = {}, options = {}) {
        const exported = options.exported ? 'export ' : '';
        let enumCode = exported + 'enum ' + name + ' {\n';
        for (const [memberName, memberValue] of Object.entries(members)) {
            enumCode += '  ' + memberName + (memberValue !== undefined ? ' = ' + memberValue : '') + ',\n';
        }
        enumCode += '}\n\n';
        return enumCode;
    }
}
