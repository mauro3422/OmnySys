import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAllAtoms: vi.fn(),
  getFieldToolCoverage: vi.fn(),
  getAvailableFields: vi.fn(),
  buildCompilerHistoricalStorageSummary: vi.fn(),
  getDatabase: vi.fn(),
  getRegisteredTables: vi.fn(),
  getTableDefinition: vi.fn(),
  getTableColumns: vi.fn(),
  generateSchemaReport: vi.fn(),
  exportSchemaSQL: vi.fn(),
  buildCompilerControlPlaneFoundations: vi.fn(),
  getDatabaseHealthSummary: vi.fn(),
  summarizeAtomSemanticPurity: vi.fn(),
  summarizeAtomTestability: vi.fn(),
  deriveSchema: vi.fn(),
  fieldEvolution: vi.fn(),
  computeCorrelations: vi.fn()
}));

vi.mock('#layer-c/storage/index.js', () => ({
  getAllAtoms: mocks.getAllAtoms
}));

vi.mock('#layer-a/extractors/metadata/registry.js', () => ({
  getFieldToolCoverage: mocks.getFieldToolCoverage,
  getAvailableFields: mocks.getAvailableFields
}));

vi.mock('../../../../../src/shared/compiler/compiler-persistence-paths.js', () => ({
  buildCompilerHistoricalStorageSummary: mocks.buildCompilerHistoricalStorageSummary
}));

vi.mock('../../../../../src/layer-c-memory/storage/database/connection.js', () => ({
  getDatabase: mocks.getDatabase
}));

vi.mock('../../../../../src/layer-c-memory/storage/database/schema-registry.js', () => ({
  getRegisteredTables: mocks.getRegisteredTables,
  getTableDefinition: mocks.getTableDefinition,
  getTableColumns: mocks.getTableColumns,
  generateSchemaReport: mocks.generateSchemaReport,
  exportSchemaSQL: mocks.exportSchemaSQL
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  buildCompilerControlPlaneFoundations: mocks.buildCompilerControlPlaneFoundations,
  getDatabaseHealthSummary: mocks.getDatabaseHealthSummary,
  summarizeAtomSemanticPurity: mocks.summarizeAtomSemanticPurity,
  summarizeAtomTestability: mocks.summarizeAtomTestability
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/get-schema-stats.js', () => ({
  deriveSchema: mocks.deriveSchema,
  fieldEvolution: mocks.fieldEvolution,
  computeCorrelations: mocks.computeCorrelations
}));

import { buildDatabaseSchemaResult } from '../../../../../src/layer-c-memory/mcp/tools/get-schema-helpers.js';

describe('get-schema-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFieldToolCoverage.mockReturnValue({});
    mocks.getAvailableFields.mockReturnValue([]);
    mocks.buildCompilerHistoricalStorageSummary.mockReturnValue({
      totalStores: 2,
      readyStoreCount: 2,
      missingStoreCount: 0,
      state: 'ready'
    });
    mocks.getRegisteredTables.mockReturnValue(['atoms']);
    mocks.generateSchemaReport.mockReturnValue({
      tables: {
        atoms: {
          status: 'ok',
          registeredColumns: 1,
          existingColumns: 1
        }
      },
      missingColumns: [],
      extraColumns: []
    });
    mocks.getDatabaseHealthSummary.mockReturnValue({
      healthy: true,
      metrics: {
        liveRowSync: {
          summary: {
            staleAtomRows: 0,
            staleFileRows: 0,
            staleRiskRows: 0,
            staleRelationRows: 0,
            staleConnectionRows: 0
          }
        }
      }
    });
    mocks.buildCompilerControlPlaneFoundations.mockReturnValue({
      databaseHealth: { healthy: true },
      fileUniverseGranularity: { healthy: true },
      dataGatewayContract: { summary: { trustworthy: true } },
      liveRowSync: {
        summary: {
          staleAtomRows: 0,
          staleFileRows: 0,
          staleRiskRows: 0,
          staleRelationRows: 0,
          staleConnectionRows: 0
        }
      }
    });
  });

  it('derives database schema live-row sync from canonical control-plane foundations', () => {
    const db = {
      prepare: vi.fn((sql) => {
        if (sql.includes('sqlite_master')) {
          return { all: vi.fn(() => [{ name: 'atoms' }]) };
        }
        if (sql.includes('PRAGMA table_info(atoms)')) {
          return {
            all: vi.fn(() => [{ name: 'id', type: 'TEXT', notnull: 0, dflt_value: null, pk: 1 }])
          };
        }
        return { all: vi.fn(() => []), get: vi.fn(() => null) };
      })
    };

    mocks.getDatabase.mockReturnValue(db);

    const result = buildDatabaseSchemaResult({ projectPath: 'C:/Dev/OmnySystem' });

    expect(mocks.getDatabaseHealthSummary).toHaveBeenCalledWith(db, { liveRowSyncSampleLimit: 5 });
    expect(mocks.buildCompilerControlPlaneFoundations).toHaveBeenCalledWith({
      dbSurfaces: {
        databaseHealth: expect.objectContaining({ healthy: true })
      }
    });
    expect(result.liveRowSync).toEqual(expect.objectContaining({
      summary: expect.objectContaining({ staleAtomRows: 0 })
    }));
    expect(result.controlPlaneFoundations).toEqual(expect.objectContaining({
      dataGatewayContract: expect.any(Object),
      fileUniverseGranularity: expect.any(Object)
    }));
  });
});
