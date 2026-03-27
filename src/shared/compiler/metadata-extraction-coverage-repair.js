/**
 * @fileoverview Repair helpers for metadata extraction coverage.
 *
 * Backfills canonical metadata fields from already-persisted support tables so
 * the runtime can self-heal when a new field was added but old rows were never
 * materialized.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair
 */

import {
  backfillAtomTestCallbackTypes,
  backfillFileHashes
} from './metadata-extraction-coverage-repair-local.js';
import {
  backfillSystemFileCalls,
  backfillSystemFileDefinitionsAndCulture,
  backfillSystemFileIdentifierRefs
} from './metadata-extraction-coverage-repair-system-files.js';
import {
  backfillSystemFileSemanticAnalysis,
  backfillSystemFileTransitiveDependents,
  backfillSystemFileTransitiveDepends
} from './metadata-extraction-coverage-repair-system-file-links.js';

export function repairMetadataExtractionCoverage(db) {
  if (!db?.prepare) {
    return {
      repaired: false,
      atomsUpdated: 0,
      fileHashesUpdated: 0,
      systemFilesUpdated: 0,
      systemFilesCallsUpdated: 0,
      rebuiltFrom: 'metadata_extraction_coverage'
    };
  }

  const nowIso = new Date().toISOString();
  const atomsUpdated = backfillAtomTestCallbackTypes(db, nowIso);
  const fileHashesUpdated = backfillFileHashes(db, nowIso);
  const systemFilesCallsUpdated = backfillSystemFileCalls(db, nowIso);
  const systemFilesMetadataUpdated = backfillSystemFileDefinitionsAndCulture(db, nowIso);
  const systemFilesIdentifiersUpdated = backfillSystemFileIdentifierRefs(db, nowIso);
  const systemFilesSemanticUpdated = backfillSystemFileSemanticAnalysis(db, nowIso);
  const systemFilesTransitiveUpdated = backfillSystemFileTransitiveDependents(db, nowIso);
  const systemFilesTransitiveDependsUpdated = backfillSystemFileTransitiveDepends(db, nowIso);

  return {
    repaired:
      atomsUpdated > 0 ||
      fileHashesUpdated > 0 ||
      systemFilesCallsUpdated > 0 ||
      systemFilesMetadataUpdated > 0 ||
      systemFilesIdentifiersUpdated > 0 ||
      systemFilesSemanticUpdated > 0 ||
      systemFilesTransitiveUpdated > 0 ||
      systemFilesTransitiveDependsUpdated > 0,
    atomsUpdated,
    fileHashesUpdated,
    systemFilesUpdated: systemFilesCallsUpdated,
    systemFilesCallsUpdated,
    systemFilesMetadataUpdated,
    systemFilesIdentifiersUpdated,
    systemFilesSemanticUpdated,
    systemFilesTransitiveUpdated,
    systemFilesTransitiveDependsUpdated,
    rebuiltFrom: 'metadata_extraction_coverage'
  };
}

export default repairMetadataExtractionCoverage;
