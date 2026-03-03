/**
 * @fileoverview import.builder.js
 * 
 * Builder for creating import statements
 * 
 * @module tests/factories/parser-test/import
 */

export class ImportBuilder {
    constructor() {
        this.imports = [];
    }

    withNamed(source, imported, local = null) {
        this.imports.push({
            type: 'named',
            source,
            imported,
            local: local || imported
        });
        return this;
    }

    withDefault(source, local) {
        this.imports.push({
            type: 'default',
            source,
            local
        });
        return this;
    }

    withNamespace(source, local) {
        this.imports.push({
            type: 'namespace',
            source,
            local
        });
        return this;
    }

    withCommonJS(source) {
        this.imports.push({
            type: 'commonjs',
            source
        });
        return this;
    }

    withDynamic(source) {
        this.imports.push({
            type: 'dynamic',
            source
        });
        return this;
    }

    build() {
        return this.imports;
    }
}
