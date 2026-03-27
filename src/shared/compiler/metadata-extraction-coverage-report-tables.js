import { buildTableCoverage } from './metadata-extraction-coverage-helpers.js';

const METADATA_SURFACE_TABLES = [
  {
    table: 'atoms',
    label: 'Atom metadata surface',
    sourceOfTruth: 'atoms',
    fieldRules: {
      deprecated_reason: {
        eligibleWhen: 'COALESCE(is_deprecated, 0) = 1'
      }
    },
    excludedColumns: new Set([
      'id',
      'name',
      'atom_type',
      'file_path',
      'line_start',
      'line_end',
      'created_at',
      'updated_at',
      'is_removed',
      'lifecycle_status'
    ])
  },
  {
    table: 'files',
    label: 'File metadata surface',
    sourceOfTruth: 'files',
    excludedColumns: new Set([
      'path',
      'created_at',
      'updated_at',
      'is_removed'
    ])
  },
  {
    table: 'system_files',
    label: 'Mirrored file metadata surface',
    sourceOfTruth: 'system_files',
    excludedColumns: new Set([
      'path',
      'created_at',
      'updated_at',
      'is_removed'
    ])
  }
];

export function collectMetadataCoverageTables(db) {
  return METADATA_SURFACE_TABLES.map((config) => buildTableCoverage(db, config));
}
