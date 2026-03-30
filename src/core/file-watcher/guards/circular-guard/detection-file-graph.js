import { safeArray } from '../../../../shared/compiler/index.js';

export function buildCircularFileGraph(allFiles = []) {
    const fileGraph = {};

    for (const file of allFiles) {
        if (!file.imports_json) continue;

        try {
            const parsed = JSON.parse(file.imports_json);
            const targets = safeArray(parsed)
                .filter((entry) => entry && entry.type === 'local' && entry.resolved)
                .map((entry) => entry.resolved);
            fileGraph[file.path] = { dependsOn: targets };
        } catch {
            // Ignore malformed cached payloads in incremental mode.
        }
    }

    return fileGraph;
}
