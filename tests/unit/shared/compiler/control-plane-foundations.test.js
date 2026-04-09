import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFileUniverseGranularity: vi.fn(),
  buildDataGatewayContract: vi.fn(),
  getLiveFileTotal: vi.fn()
}));

vi.mock('../../../../src/shared/compiler/file-universe-granularity.js', () => ({
  getFileUniverseGranularity: mocks.getFileUniverseGranularity
}));

vi.mock('../../../../src/shared/compiler/contract.js', () => ({
  buildDataGatewayContract: mocks.buildDataGatewayContract
}));

vi.mock('../../../../src/shared/compiler/live-row-utils.js', () => ({
  getLiveFileTotal: mocks.getLiveFileTotal
}));

import { buildCompilerControlPlaneFoundations } from '../../../../src/shared/compiler/control-plane-foundations.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getFileUniverseGranularity.mockReturnValue({ healthy: true, summary: 'universe' });
  mocks.buildDataGatewayContract.mockReturnValue({ healthy: true, summary: 'gateway' });
  mocks.getLiveFileTotal.mockReturnValue(7);
});

describe('control-plane-foundations', () => {
  it('builds foundations from canonical runtime inputs', () => {
    const result = buildCompilerControlPlaneFoundations({
      persistedFileCoverage: {
        scannedFileTotal: 10,
        manifestFileTotal: 9,
        liveIndexedFiles: 8
      },
      dbSurfaces: {
        fileImportEvidenceCoverage: { healthy: true },
        systemMapPersistenceCoverage: { healthy: true },
        metadataSurfaceParity: { healthy: true },
        metadataExtractionCoverage: { healthy: true },
        semanticSurfaceGranularity: { healthy: true },
        databaseHealth: {
          healthy: true,
          metrics: {
            liveRowSync: { summary: { staleAtomRows: 0 } }
          }
        }
      },
      db: {},
      analysisGeneration: { generationId: 'g1' }
    });

    expect(mocks.getLiveFileTotal).toHaveBeenCalledWith({});
    expect(mocks.getFileUniverseGranularity).toHaveBeenCalledWith({
      scannedFileTotal: 10,
      manifestFileTotal: 9,
      liveFileCount: 7
    });
    expect(mocks.buildDataGatewayContract).toHaveBeenCalledWith(expect.objectContaining({
      analysisGeneration: { generationId: 'g1' },
      persistedFileCoverage: expect.objectContaining({ scannedFileTotal: 10 }),
      fileUniverseGranularity: { healthy: true, summary: 'universe' },
      databaseHealth: expect.objectContaining({ healthy: true })
    }));
    expect(result.databaseHealth).toEqual(expect.objectContaining({ healthy: true }));
    expect(result.liveRowSync).toEqual({ summary: { staleAtomRows: 0 } });
  });

  it('falls back to persisted live indexed files when the db is unavailable', () => {
    buildCompilerControlPlaneFoundations({
      persistedFileCoverage: {
        scannedFileTotal: 5,
        manifestFileTotal: 5,
        liveIndexedFiles: 4
      },
      dbSurfaces: {}
    });

    expect(mocks.getLiveFileTotal).not.toHaveBeenCalled();
    expect(mocks.getFileUniverseGranularity).toHaveBeenCalledWith({
      scannedFileTotal: 5,
      manifestFileTotal: 5,
      liveFileCount: 4
    });
  });
});
