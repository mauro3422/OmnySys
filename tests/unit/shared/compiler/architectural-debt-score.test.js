import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };

  const detectArchitecturalPattern = vi.fn(() => ({
    patterns: ['pattern'],
    severity: 'high',
    primaryPattern: 'god_object',
    recommendations: [
      {
        message: 'Split the module',
        suggestedStructure: 'layered'
      }
    ]
  }));

  const analyzeDirectoryStructure = vi.fn(() => ({ roots: [] }));
  const validateFileLocation = vi.fn(() => ({ isCorrect: true }));
  const calculateArchitectureOrganizationScore = vi.fn(() => 0);
  const detectFileType = vi.fn(() => 'other');
  const detectHelperReuseOpportunities = vi.fn(() => []);
  const getRecommendation = vi.fn(() => ({ message: 'Refactor' }));

  return {
    logger,
    detectArchitecturalPattern,
    analyzeDirectoryStructure,
    validateFileLocation,
    calculateArchitectureOrganizationScore,
    detectFileType,
    detectHelperReuseOpportunities,
    getRecommendation
  };
});

vi.mock('#utils/logger.js', () => ({
  createLogger: () => h.logger
}));

vi.mock('../../../../src/shared/compiler/architectural-pattern-detector.js', () => ({
  detectArchitecturalPattern: h.detectArchitecturalPattern,
  ARCHITECTURAL_PATTERNS: {}
}));

vi.mock('../../../../src/shared/compiler/directory-structure-analyzer.js', () => ({
  analyzeDirectoryStructure: h.analyzeDirectoryStructure,
  validateFileLocation: h.validateFileLocation,
  calculateArchitectureOrganizationScore: h.calculateArchitectureOrganizationScore,
  detectFileType: h.detectFileType
}));

vi.mock('../../../../src/shared/compiler/helper-reuse-detector.js', () => ({
  detectHelperReuseOpportunities: h.detectHelperReuseOpportunities
}));

vi.mock('../../../../src/shared/compiler/recommendations/RecommendationEngine.js', () => ({
  getRecommendation: h.getRecommendation
}));

import { calculateArchitecturalDebtScore } from '../../../../src/shared/compiler/architectural-debt/index.js';

function createRepo() {
  return {
    db: {
      prepare: vi.fn((sql) => {
        if (sql.includes('SELECT DISTINCT file_path')) {
          return {
            all: vi.fn(() => ([]))
          };
        }

        if (sql.includes("atom_type IN ('function', 'method', 'arrow', 'class')")) {
          return {
            all: vi.fn(() => ([
              {
                id: 1,
                name: 'alpha',
                file_path: 'src/a.js',
                complexity: 12,
                is_exported: 1,
                fingerprint: 'fp-alpha'
              }
            ]))
          };
        }

        if (sql.includes('GROUP_CONCAT(file_path)')) {
          return {
            all: vi.fn(() => ([
              {
                fingerprint: 'fp-dup',
                instanceCount: 6,
                files: 'src/a.js,src/b.js,src/c.js'
              }
            ]))
          };
        }

        if (sql.includes('SELECT path, module_name, imports_json, exports_json, atom_count, total_lines, updated_at')) {
          return {
            all: vi.fn(() => ([
              {
                path: 'src/core/file-watcher/guards/impact-wave/impact-wave-core.js',
                module_name: 'impact-wave-core',
                imports_json: '[]',
                exports_json: '[]',
                atom_count: 1,
                total_lines: 12,
                updated_at: '2026-03-29T00:00:00.000Z'
              },
              {
                path: 'src/core/file-watcher/guards/impact-wave/impact-wave-summary.js',
                module_name: 'impact-wave-summary',
                imports_json: '[]',
                exports_json: '[]',
                atom_count: 1,
                total_lines: 10,
                updated_at: '2026-03-29T00:00:00.000Z'
              }
            ]))
          };
        }

        return {
          all: vi.fn(() => ([]))
        };
      })
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('calculateArchitecturalDebtScore', () => {
  it('does not crash when top issues include entries without a file path', async () => {
    const repo = createRepo();

    const result = await calculateArchitecturalDebtScore('/tmp/project', repo);

    expect(['low', 'moderate', 'high']).toContain(result.level);
    expect(result.totalIssues).toBeGreaterThan(0);
    expect(result.topIssues[0]).toMatchObject({
      type: 'conceptual_duplicate',
      semanticFingerprint: 'fp-dup'
    });
  });

  it('prefers the DB-backed folderized family when a scope path is provided for duplicate consolidation', async () => {
    const repo = createRepo();

    const result = await calculateArchitecturalDebtScore('/tmp/project', repo, {
      scopePath: 'src/core/file-watcher/guards/impact-wave/impact-wave-core.js',
      focusPath: 'src/core/file-watcher/guards/impact-wave/impact-wave-summary.js'
    });

    const conceptualDuplicate = result.topIssues.find((issue) => issue.type === 'conceptual_duplicate');

    expect(conceptualDuplicate).toBeTruthy();
    expect(conceptualDuplicate.folderizationHint).toMatchObject({
      familyRoot: 'impact-wave',
      recommendedFolder: 'src/core/file-watcher/guards/impact-wave',
      alreadyFolderized: true
    });
  });
});
