#!/usr/bin/env node

/**
 * Distributes the official OmnySys tools workflow documentation to a project.
 *
 * Behavior:
 * - If AGENTS.md does NOT exist → creates it from templates/AGENTS.md
 * - If AGENTS.md EXISTS → prepends the tools workflow section
 *   (preserves all user content below)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = resolve(__dirname, '..', '..', 'templates');
const AGENTS_TEMPLATE = join(TEMPLATES_DIR, 'AGENTS.md');
const WORKFLOW_INJECT = join(TEMPLATES_DIR, 'tools-workflow-inject.md');

/**
 * Distributes AGENTS.md and/or injects tools workflow into existing file.
 *
 * @param {string} projectPath - Root of the target project
 * @returns {{ applied: boolean, path: string, action: string, error?: string }}
 */
export function distributeAgentsTemplate(projectPath) {
  const targetPath = join(projectPath, 'AGENTS.md');

  // Read workflow injection content
  let workflowContent = '';
  if (existsSync(WORKFLOW_INJECT)) {
    workflowContent = readFileSync(WORKFLOW_INJECT, 'utf-8');
  }

  if (!existsSync(targetPath)) {
    // No AGENTS.md exists → create full template
    if (!existsSync(AGENTS_TEMPLATE)) {
      return {
        applied: false,
        path: targetPath,
        action: 'skipped',
        error: `Template not found at ${AGENTS_TEMPLATE}`
      };
    }

    const templateContent = readFileSync(AGENTS_TEMPLATE, 'utf-8');
    writeFileSync(targetPath, workflowContent + '\n' + templateContent);
    return {
      applied: true,
      path: targetPath,
      action: 'created_full'
    };
  }

  // AGENTS.md exists → inject workflow at the top
  const existingContent = readFileSync(targetPath, 'utf-8');

  // Check if workflow was already injected
  if (existingContent.includes('OMNYSYS TOOLS WORKFLOW')) {
    return {
      applied: false,
      path: targetPath,
      action: 'skipped',
      reason: 'Tools workflow already injected'
    };
  }

  writeFileSync(targetPath, workflowContent + '\n' + existingContent);
  return {
    applied: true,
    path: targetPath,
    action: 'injected_workflow'
  };
}
