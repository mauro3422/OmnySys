import { buildTableCoverage } from './helpers.js';

const METADATA_SURFACE_TABLES = [
  {
    table: 'atoms',
    label: 'Atom metadata surface',
    sourceOfTruth: 'atoms',
    fieldRules: {
      test_callback_type: {
        eligibleWhen: 'COALESCE(is_test_callback, 0) = 1'
      },
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
      'lifecycle_status',
      '_meta_json',
      'signature_json',
      'data_flow_json',
      'temporal_json',
      'error_flow_json',
      'performance_json',
      'dna_json',
      'derived_json'
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
