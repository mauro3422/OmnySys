import path from 'path';

function normalizeConnectionList(connections) {
  if (Array.isArray(connections)) return connections;
  if (Array.isArray(connections?.all)) return connections.all;
  return [];
}

export function buildFileResult(filePath, parsed, resolvedImports, staticConnections, advancedConnections, metadata, moleculeAtoms, contentHash) {
  const normalizedStaticConnections = normalizeConnectionList(staticConnections);
  const normalizedAdvancedConnections = normalizeConnectionList(advancedConnections);

  return {
    filePath,
    fileName: path.basename(filePath),
    ext: path.extname(filePath),
    imports: resolvedImports.map((imp) => ({
      source: imp.source,
      resolvedPath: imp.resolved,
      type: imp.type,
      specifiers: imp.specifiers
    })),
    exports: parsed.exports || [],
    definitions: parsed.definitions || [],
    functionRefs: (parsed.functions || []).map((fn) => ({
      id: fn.id,
      name: fn.name,
      line: fn.line,
      isExported: fn.isExported
    })),
    atomIds: moleculeAtoms.map((atom) => atom.id),
    atomCount: moleculeAtoms.length,
    calls: parsed.calls || [],
    semanticConnections: [
      ...normalizedStaticConnections.map((conn) => ({
        target: conn.targetFile,
        type: conn.via,
        key: conn.key || conn.event,
        confidence: conn.confidence,
        detectedBy: 'static-extractor'
      })),
      ...normalizedAdvancedConnections.map((conn) => ({
        target: conn.targetFile,
        type: conn.via,
        channelName: conn.channelName,
        confidence: conn.confidence,
        detectedBy: 'advanced-extractor'
      }))
    ],
    metadata: {
      jsdocContracts: metadata.jsdoc || { all: [] },
      asyncPatterns: metadata.async || { all: [] },
      errorHandling: metadata.errors || { all: [] },
      buildTimeDeps: metadata.build || { envVars: [] },
      sideEffects: metadata.sideEffects || { all: [] },
      callGraph: metadata.callGraph || { all: [] },
      dataFlow: metadata.dataFlow || { all: [] },
      typeInference: metadata.typeInference || { all: [] },
      temporal: metadata.temporal || { all: [] },
      depDepth: metadata.depDepth || {},
      performance: metadata.performance || { all: [] },
      historical: metadata.historical || {}
    },
    contentHash,
    analyzedAt: new Date().toISOString()
  };
}
