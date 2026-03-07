
import { get_atom_history } from './src/layer-c-memory/mcp/tools/get-atom-history.js';

const mockContext = {
    projectPath: process.cwd(),
    logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.log
    }
};

const args = {
    symbolName: 'extractAndSaveAtoms',
    filePath: 'src/layer-a-static/pipeline/extract.js'
};

get_atom_history(args, mockContext)
    .then(res => console.log(JSON.stringify(res, null, 2)))
    .catch(err => console.error(err));
