/**
 * @fileoverview class-builder.js
 * 
 * Sub-builder for class declarations and members
 * 
 * @module tests/factories/parser-test/builders/class
 */

export class ClassBuilder {
    buildClass(name, methods = [], options = {}) {
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
        return classCode;
    }
}
