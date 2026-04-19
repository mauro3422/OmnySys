import path from 'path';
import fs from 'fs/promises';
import { extractModuleDependencySourcesFromCode } from '../../layer-c-memory/mcp/tools/atomic-edit/exports.js';

export async function buildFolderizationCircularRiskReport(moveTargets = [], projectPath = '', repo = null) {
  const risks = [];

  if (!repo?.db) {
    return risks;
  }

  const pathMapping = new Map();
  for (const target of moveTargets) {
    pathMapping.set(target.from, target.to);
  }

  for (const target of moveTargets) {
    try {
      const fullPath = path.resolve(projectPath, target.to);
      const code = await fs.readFile(fullPath, 'utf8');
      const imports = extractModuleDependencySourcesFromCode(code);

      for (const imp of imports) {
        const impResolved = path.resolve(path.dirname(fullPath), imp).replace(/\\/g, '/');
        const projectNormalized = path.resolve(projectPath).replace(/\\/g, '/');
        const impRelative = impResolved.replace(projectNormalized + '/', '').replace(/\\/g, '/');

        for (const [oldPath, newPath] of pathMapping) {
          if (newPath === impRelative || impResolved.includes(path.basename(newPath, '.js'))) {
            const targetFullPath = path.resolve(projectPath, newPath);
            try {
              const targetCode = await fs.readFile(targetFullPath, 'utf8');
              const targetImports = extractModuleDependencySourcesFromCode(targetCode);

              for (const targetImp of targetImports) {
                if (targetImp.includes(path.basename(target.to, '.js'))) {
                  risks.push({
                    type: 'circular',
                    fileA: target.to,
                    fileB: newPath,
                    severity: 'medium',
                    message: `Circular import risk: ${path.basename(target.to)} â†” ${path.basename(newPath)}`
                  });
                }
              }
            } catch {
              // File might not exist yet.
            }
          }
        }
      }
    } catch {
      // File might not exist yet.
    }
  }

  return risks;
}
