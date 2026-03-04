export class MetadataBuilder {
    constructor() {
        this.data = {
            filePath: 'test/file.js',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    withFilePath(path) {
        this.data.filePath = path;
        return this;
    }

    withDataFlow(inputs = [], transformations = [], outputs = []) {
        this.data.dataFlow = {
            inputs: inputs.map(i => typeof i === 'string' ? { type: i, usages: [] } : i),
            transformations: transformations.map(t => typeof t === 'string' ? { operation: t } : t),
            outputs: outputs.map(o => typeof o === 'string' ? { type: o } : o)
        };
        return this;
    }

    withSemantic(verb, domain, entity) {
        this.data.semantic = { verb, domain, entity };
        return this;
    }

    withStandardized(patternHash) {
        this.data.standardized = { patternHash };
        return this;
    }

    build() {
        return { ...this.data };
    }

    static simpleFunction() {
        return new MetadataBuilder()
            .withDataFlow(['param'], ['transform'], ['return'])
            .withSemantic('transform', 'generic', 'data');
    }

    static asyncFunction() {
        return new MetadataBuilder()
            .withDataFlow(['param'], ['fetch', 'transform'], ['return'])
            .withSemantic('fetch', 'api', 'data');
    }

    static sideEffectFunction() {
        return new MetadataBuilder()
            .withDataFlow(['param'], ['transform'], ['side_effect'])
            .withSemantic('update', 'database', 'record');
    }
}
