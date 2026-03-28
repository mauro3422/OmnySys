export function emitPipelineOrphanFinding(EventEmitterContext, filePath, severity, fileImporterCount, disconnected) {
    EventEmitterContext.emit('arch:pipeline-orphan', {
        filePath,
        severity,
        fileImporterCount,
        disconnectedAtoms: disconnected.map((atom) => atom.name)
    });
}
