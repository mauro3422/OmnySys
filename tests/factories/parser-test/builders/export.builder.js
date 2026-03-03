/**
 * @fileoverview export.builder.js
 * 
 * Builder for creating export statements
 * 
 * @module tests/factories/parser-test/export
 */

export class ExportBuilder {
    constructor() {
        this.exports = [];
    }

    withNamed(name, local = null, source = null) {
        this.exports.push({
            type: source ? 'reexport' : 'named',
            name,
            local: local || name,
            ...(source && { source })
        });
        return this;
    }

    withDefault(kind = 'FunctionDeclaration') {
        this.exports.push({
            type: 'default',
            kind
        });
        return this;
    }

    withDeclaration(kind, name) {
        this.exports.push({
            type: 'declaration',
            kind,
            name
        });
        return this;
    }

    build() {
        return this.exports;
    }
}
