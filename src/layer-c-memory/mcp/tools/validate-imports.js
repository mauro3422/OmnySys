import { GraphQueryTool } from '../core/shared/base-tools/graph-query-tool.js';
import { getFileAnalysis } from '../../query/apis/file-api.js';

export class ValidateImportsTool extends GraphQueryTool {
    constructor() {
        super('validate:imports');
    }

    async performAction(args) {
        const { filePath, checkBroken = true, checkUnused = true } = args;

        if (!filePath) {
            return this.formatError('MISSING_PARAMS', 'filePath is required');
        }

        const fileData = await getFileAnalysis(this.projectPath, filePath);

        if (!fileData) {
            return this.formatError('NOT_FOUND', `File ${filePath} not found in the index. Run 'omny up' or analysis.`);
        }

        const imports = fileData.imports || [];
        const broken = [];
        const unused = []; // The static analyzer usually tags unused imports if supported

        // Fast minimal check based on SQLite Graph data (since the actual paths are stored)
        for (const imp of imports) {
            if (checkBroken && !imp.resolved && imp.type === 'local') {
                broken.push(imp);
            }
            if (checkUnused && imp.unused === true) {
                unused.push(imp);
            }
        }

        return this.formatSuccess({
            file: filePath,
            totalImports: imports.length,
            brokenPaths: broken.map(b => b.source),
            unusedImports: unused.map(u => u.name),
            status: broken.length === 0 && unused.length === 0 ? 'CLEAN' : 'HAS_ISSUES'
        });
    }
}

export const validate_imports = async (args, context) => {
    const tool = new ValidateImportsTool();
    return tool.execute(args, context);
};

export default { validate_imports };
