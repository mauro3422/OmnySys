/**
 * @fileoverview Canonical semantic surface derivation helpers.
 *
 * Builds file-level semantic connections from atom semantic metadata stored in
 * SQLite. This keeps the semantic summary surface DB-first and avoids relying
 * on legacy atom_relations buckets that may not exist for a given reindex.
 *
 * @module shared/compiler/semantic-surface-derivation
 */

export {
  loadAtomSemanticSurface,
  summarizeAtomSemanticSurface
} from './semantic-surface-derivation-surface.js';

export {
  deriveSemanticConnectionsFromAtomSurface
} from './semantic-surface-derivation-connections.js';
