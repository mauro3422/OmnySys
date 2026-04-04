import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRepository: vi.fn(),
  buildFolderizationNormalizationPlanFromRepo: vi.fn(),
  renameFolderizedFamily: vi.fn()
}));

vi.mock('#layer-c/storage/repository/index.js', () => ({
  getRepository: mocks.getRepository
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  buildFolderizationNormalizationPlanFromRepo: mocks.buildFolderizationNormalizationPlanFromRepo
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/rename-folderized-family.js', () => ({
  rename_folderized_family: mocks.renameFolderizedFamily
}));

import { normalize_folderized_family_names } from '../../../../../src/layer-c-memory/mcp/tools/normalize-folderized-family.js';

describe('normalize-folderized-family tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRepository.mockReturnValue({ db: { prepare: vi.fn() } });
    mocks.buildFolderizationNormalizationPlanFromRepo.mockReturnValue({
      success: true,
      mode: 'plan',
      candidatePath: 'src/shared/compiler/compiler-health-dashboard.js',
      summary: {
        candidatePath: 'src/shared/compiler/compiler-health-dashboard.js',
        familyRoot: 'compiler-health-dashboard',
        directory: 'src/shared/compiler',
        familyCount: 4,
        renameTargetCount: 2,
        renameTargetDensity: 0.5,
        safetyLevel: 'safe',
        recommendedAction: 'execute',
        topFamilyRenameTargetCount: 2,
        patternSummary: {}
      }
    });
    mocks.renameFolderizedFamily.mockResolvedValue({
      success: true,
      mode: 'applied',
      plan: { familyRoot: 'compiler-health-dashboard' }
    });
  });

  it('returns a preview plan without mutating when execute is false', async () => {
    const result = await normalize_folderized_family_names(
      { candidatePath: 'src/shared/compiler/compiler-health-dashboard.js', mode: 'plan' },
      { projectPath: 'C:/Dev/OmnySystem' }
    );

    expect(result.success).toBe(true);
    expect(result.mode).toBe('preview');
    expect(mocks.renameFolderizedFamily).not.toHaveBeenCalled();
    expect(mocks.buildFolderizationNormalizationPlanFromRepo).toHaveBeenCalled();
  });

  it('delegates to rename_folderized_family when execute is requested and the plan is safe', async () => {
    const result = await normalize_folderized_family_names(
      { candidatePath: 'src/shared/compiler/compiler-health-dashboard.js', mode: 'execute', validateAfterMove: true },
      { projectPath: 'C:/Dev/OmnySystem' }
    );

    expect(result.success).toBe(true);
    expect(result.mode).toBe('applied');
    expect(mocks.renameFolderizedFamily).toHaveBeenCalledWith(
      {
        candidatePath: 'src/shared/compiler/compiler-health-dashboard.js',
        execute: true,
        validateAfterMove: true
      },
      { projectPath: 'C:/Dev/OmnySystem' }
    );
  });
});
