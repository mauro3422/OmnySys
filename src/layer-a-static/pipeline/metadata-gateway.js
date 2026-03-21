/**
 * @fileoverview metadata-gateway.js
 *
 * Canonical gateway for metadata surfaces in Layer A.
 * Unifies file-level and atom-level extraction entrypoints so callers do not
 * need to know whether the data is file-scoped, batch-scoped, or atom-scoped.
 */

import { extractAllMetadata } from '../extractors/metadata/index.js';
import { extractAtomMetadata as extractAtomMetadataImpl } from './phases/atom-extraction/extraction/atom-extractor.js';

export const METADATA_SURFACE_MODE = {
  FILE: 'file',
  BATCH: 'batch',
  ATOM: 'atom'
};

function buildMetadataEnvelope(metadata, surfaceKind, options = {}) {
  return {
    ...metadata,
    surfaceKind,
    metadataSurface: {
      kind: surfaceKind,
      analysisTier: options.analysisTier || surfaceKind,
      source: options.source || 'pipeline',
      providers: options.providers || [],
      batchSize: options.batchSize || null
    }
  };
}

function resolveMetadataSurfaceMode(input = {}) {
  if (input?.mode === METADATA_SURFACE_MODE.BATCH || input?.fileSourceCode) {
    return METADATA_SURFACE_MODE.BATCH;
  }

  if (
    input?.mode === METADATA_SURFACE_MODE.ATOM ||
    input?.functionInfo ||
    input?.atomInfo
  ) {
    return METADATA_SURFACE_MODE.ATOM;
  }

  return METADATA_SURFACE_MODE.FILE;
}

function dispatchMetadataSurface(mode, input, options) {
  switch (mode) {
    case METADATA_SURFACE_MODE.BATCH:
      return extractFileMetadataMap(input.fileSourceCode || {}, options);
    case METADATA_SURFACE_MODE.ATOM:
      return extractAtomMetadataSurface(
        input.atomInfo || input.functionInfo,
        input.functionCode || '',
        input.fileMetadata || {},
        input.filePath || '',
        input.imports || [],
        input.fullFileCode || null,
        input.extractionDepth || 'deep',
        options
      );
    default:
      return extractFileMetadataSurface(input.filePath || '', input.code || '', options);
  }
}

export function extractFileMetadataSurface(filePath, code, options = {}) {
  const safeFilePath = typeof filePath === 'string' ? filePath : '';
  const safeCode = typeof code === 'string' ? code : '';
  const metadata = extractAllMetadata(safeFilePath, safeCode);

  return buildMetadataEnvelope(metadata, METADATA_SURFACE_MODE.FILE, {
    ...options,
    source: 'extractAllMetadata',
    providers: ['layer-a-static/extractors/metadata/index.js']
  });
}

export function extractFileMetadataMap(fileSourceCode = {}, options = {}) {
  const results = {};

  for (const [filePath, code] of Object.entries(fileSourceCode || {})) {
    results[filePath] = extractFileMetadataSurface(filePath, code, options);
  }

  return results;
}

export async function extractAtomMetadataSurface(
  atomInfo,
  functionCode,
  fileMetadata,
  filePath,
  imports = [],
  fullFileCode = null,
  extractionDepth = 'deep',
  options = {}
) {
  const metadata = await extractAtomMetadataImpl(
    atomInfo,
    functionCode,
    fileMetadata,
    filePath,
    imports,
    fullFileCode,
    extractionDepth
  );

  return buildMetadataEnvelope(metadata, METADATA_SURFACE_MODE.ATOM, {
    ...options,
    analysisTier: extractionDepth === 'structural' ? 'atom-structural' : 'atom-deep',
    source: 'extractAtomMetadata',
    providers: ['layer-a-static/pipeline/phases/atom-extraction/extraction/atom-extractor.js']
  });
}

export async function extractMetadataSurface(input = {}, options = {}) {
  return dispatchMetadataSurface(resolveMetadataSurfaceMode(input), input, options);
}

export default {
  METADATA_SURFACE_MODE,
  extractMetadataSurface,
  extractFileMetadataSurface,
  extractFileMetadataMap,
  extractAtomMetadataSurface
};
