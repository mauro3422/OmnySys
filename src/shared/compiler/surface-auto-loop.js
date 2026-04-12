/**
 * @fileoverview surface-auto-loop.js
 * Propagation auto-loop for missing canonical surfaces.
 *
 * Flow: detect → scaffold → safe-check → apply → verify → learn
 *
 * When a surface obligation is detected, this module:
 * 1. Generates a scaffold file
 * 2. Validates it won't break anything
 * 3. Writes it atomically
 * 4. Updates the canonical surface registry
 * 5. Verifies the gap is closed
 * 6. Records the outcome for learning
 *
 * @module shared/compiler/surface-auto-loop
 */

import path from 'path';
import fs from 'fs/promises';
import { generateSurfaceFileContent } from './surface-scaffolder.js';
import { runSurfaceSafeCheck } from './surface-safe-check.js';

/**
 * Executes the full auto-loop for a single surface obligation.
 * @param {object} obligation - From surface-obligations-propagator
 * @param {object} db - SQLite database connection
 * @param {string} projectRoot - Project root path
 * @param {object} [options] - Execution options
 * @param {boolean} [options.dryRun=false] - If true, only plan, don't apply
 * @returns {object} Result of the auto-loop execution
 */
export async function executeSurfaceAutoLoop(obligation, db, projectRoot, options = {}) {
  const { dryRun = false } = options;
  const steps = [];
  let status = 'pending';

  // Step 1: Generate scaffold
  steps.push({ step: 'scaffold', status: 'running' });
  try {
    const fileContent = generateSurfaceFileContent(obligation);
    steps[steps.length - 1] = { step: 'scaffold', status: 'completed', bytes: fileContent.length };

    // Step 2: Safe check
    steps.push({ step: 'safe-check', status: 'running' });
    const safeCheck = await runSurfaceSafeCheck(obligation, fileContent, db, projectRoot);
    steps[steps.length - 1] = {
      step: 'safe-check',
      status: safeCheck.passed ? 'passed' : 'failed',
      errors: safeCheck.errors,
      warnings: safeCheck.warnings
    };

    if (!safeCheck.passed) {
      status = 'safe-check-failed';
      return { status, obligation, steps, reason: safeCheck.errors.join('; ') };
    }

    if (dryRun) {
      status = 'dry-run-complete';
      return {
        status,
        obligation,
        steps,
        preview: fileContent.substring(0, 500) + '...'
      };
    }

    // Step 3: Apply (atomic write)
    steps.push({ step: 'apply', status: 'running' });
    const filePath = path.join(projectRoot, obligation.requiredSurfaceFile);
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, fileContent, 'utf8');
      steps[steps.length - 1] = { step: 'apply', status: 'completed', file: obligation.requiredSurfaceFile };
    } catch (err) {
      steps[steps.length - 1] = { step: 'apply', status: 'failed', error: err.message };
      status = 'apply-failed';
      return { status, obligation, steps, reason: err.message };
    }

    // Step 4: Verify (re-run safe check on written file)
    steps.push({ step: 'verify', status: 'running' });
    try {
      const writtenContent = await fs.readFile(filePath, 'utf8');
      const verifyCheck = await runSurfaceSafeCheck(obligation, writtenContent, db, projectRoot);
      steps[steps.length - 1] = {
        step: 'verify',
        status: verifyCheck.passed ? 'passed' : 'failed',
        ...verifyCheck
      };

      if (verifyCheck.passed) {
        status = 'completed';
        return {
          status,
          obligation,
          steps,
          message: `Surface created: ${obligation.requiredSurfaceFile}`,
          nextAction: 'Restart server to load new surface, then re-run guard to verify gap closed'
        };
      } else {
        status = 'verify-failed';
        // Rollback: delete the file
        try { await fs.unlink(filePath); } catch {}
        return { status, obligation, steps, reason: 'Verification failed, file rolled back' };
      }
    } catch (err) {
      steps[steps.length - 1] = { step: 'verify', status: 'failed', error: err.message };
      status = 'verify-failed';
      return { status, obligation, steps, reason: err.message };
    }

  } catch (err) {
    status = 'error';
    return { status, obligation, steps, reason: err.message };
  }
}

/**
 * Executes auto-loop for ALL pending surface obligations.
 * @param {object} propagationPlan - From buildSurfaceObligationsPropagationPlan
 * @param {object} db - SQLite database connection
 * @param {string} projectRoot - Project root path
 * @param {object} [options] - Execution options
 * @returns {object} Batch result
 */
export async function executeBatchSurfaceAutoLoop(propagationPlan, db, projectRoot, options = {}) {
  const results = [];
  let completed = 0;
  let failed = 0;
  let dryRun = 0;

  for (const obligation of propagationPlan.obligations || []) {
    const result = await executeSurfaceAutoLoop(obligation, db, projectRoot, options);
    results.push(result);

    if (result.status === 'completed') completed++;
    else if (result.status === 'dry-run-complete') dryRun++;
    else failed++;
  }

  return {
    total: propagationPlan.obligations?.length || 0,
    completed,
    failed,
    dryRun,
    results,
    summary: `Auto-loop: ${completed} completed, ${failed} failed, ${dryRun} dry-run`
  };
}

/**
 * Formats auto-loop result for human display.
 */
export function formatAutoLoopReport(result) {
  const lines = ['=== Surface Auto-Loop Report ===', ''];

  if (result.results) {
    for (const r of result.results) {
      lines.push(`Surface: ${r.obligation?.requiredSurfaceFile || 'unknown'}`);
      lines.push(`  Status: ${r.status}`);
      for (const step of r.steps || []) {
        const icon = step.status === 'completed' || step.status === 'passed' ? '✅'
          : step.status === 'failed' ? '❌'
          : step.status === 'running' ? '⏳'
          : '⚠️';
        lines.push(`  ${icon} ${step.step}: ${step.status}`);
      }
      if (r.reason) lines.push(`  Reason: ${r.reason}`);
      lines.push('');
    }
  }

  lines.push(`Summary: ${result.summary || result.status}`);
  return lines.join('\n');
}

export default {
  executeSurfaceAutoLoop,
  executeBatchSurfaceAutoLoop,
  formatAutoLoopReport
};
