/**
 * @fileoverview metadata-gateway.js
 *
 * Canonical gateway for metadata surfaces in Layer A.
 * Unifies file-level and atom-level extraction entrypoints so callers do not
 * need to know whether the data is file-scoped, batch-scoped, or atom-scoped.
 */

import { extractAllMetadata } from '../extractors/metadata/index.js';
import { extractAtomMetadata as extractAtomMetadataImpl } from './phases/atom-extraction/extraction/atom-extractor.js';
import crypto from 'crypto';

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

const metadataSurfaceCache = new Map();
const METADATA_SURFACE_CACHE_LIMIT = 250;

function buildMetadataCacheKey(input = {}) {
  const filePath = typeof input.filePath === 'string' ? input.filePath : '';
  const code = typeof input.code === 'string' ? input.code : '';
  const functionCode = typeof input.functionCode === 'string' ? input.functionCode : '';
  const fullFileCode = typeof input.fullFileCode === 'string' ? input.fullFileCode : '';
  const atomInfo = input?.atomInfo ? JSON.stringify(input.atomInfo) : '';
  const functionInfo = input?.functionInfo ? JSON.stringify(input.functionInfo) : '';
  const mode = input?.mode || resolveMetadataSurfaceMode(input);

  const digest = crypto
    .createHash('sha1')
    .update([filePath, code, functionCode, fullFileCode, atomInfo, functionInfo, mode].join('\u0000'))
    .digest('hex');

  return `${mode}:${digest}`;
}

function rememberMetadataCache(key, value) {
  if (metadataSurfaceCache.has(key)) {
    metadataSurfaceCache.delete(key);
  }

  metadataSurfaceCache.set(key, value);

  if (metadataSurfaceCache.size > METADATA_SURFACE_CACHE_LIMIT) {
    const oldestKey = metadataSurfaceCache.keys().next().value;
    if (oldestKey !== undefined) {
      metadataSurfaceCache.delete(oldestKey);
    }
  }
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
  const cacheKey = buildMetadataCacheKey(input);
  const cached = metadataSurfaceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await dispatchMetadataSurface(resolveMetadataSurfaceMode(input), input, options);
  rememberMetadataCache(cacheKey, result);
  return result;
}

export default {
  METADATA_SURFACE_MODE,
  extractMetadataSurface,
  extractFileMetadataSurface,
  extractFileMetadataMap,
  extractAtomMetadataSurface
};
