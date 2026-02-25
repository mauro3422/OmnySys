import * as utils from './src/layer-a-static/extractors/data-flow/utils/ts-ast-utils.js';
console.log('Exports found:', Object.keys(utils));
if (utils.getAssignmentTarget) {
    console.log('✅ getAssignmentTarget is exported');
} else {
    console.error('❌ getAssignmentTarget is MISSING');
    process.exit(1);
}
