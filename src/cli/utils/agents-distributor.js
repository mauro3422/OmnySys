#!/usr/bin/env node

/**
 * Distributes the official OmnySys AGENTS.md template to a project.
 *
 * Called by install.js during `npm install` or `npm run setup`.
 * Only creates AGENTS.md if it doesn't already exist (preserves user edits).
 */

import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = resolve(__dirname, '..', '..', 'templates');
const AGENTS_TEMPLATE = join(TEMPLATES_DIR, 'AGENTS.md');

/**
 * Copies the official AGENTS.md template to the project root.
 * Skips if AGENTS.md already exists (user may have customized it).
 *
 * @param {string} projectPath - Root of the target project
 * @returns {{ applied: boolean, path: string, error?: string }}
 */
export function distributeAgentsTemplate(projectPath) {
  const targetPath = join(projectPath, 'AGENTS.md');

  if (existsSync(targetPath)) {
    return {
      applied: false,
      path: targetPath,
      skipped: true,
      reason: 'AGENTS.md already exists (preserved)'
    };
  }

  if (!existsSync(AGENTS_TEMPLATE)) {
    return {
      applied: false,
      path: targetPath,
      error: `Template not found at ${AGENTS_TEMPLATE}`
    };
  }

  try {
    copyFileSync(AGENTS_TEMPLATE, targetPath);
    return {
      applied: true,
      path: targetPath
    };
  } catch (error) {
    return {
      applied: false,
      path: targetPath,
      error: error.message
    };
  }
}
