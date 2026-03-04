/**
 * @fileoverview historical-metadata.js
 *
 * Historical Metadata Extractor - Extracts git history information
 * Part of the metadata extraction pipeline
 *
 * NOTE: This extractor is different - it uses git commands instead of regex
 *
 * @module extractors/metadata/historical-metadata
 */

import { execSync } from 'child_process';
import path from 'path';

let gitAvailableCache = null;

function isGitAvailable() {
  if (gitAvailableCache !== null) {
    return gitAvailableCache;
  }

  try {
    execSync('git --version', { stdio: 'ignore', windowsHide: true });
    gitAvailableCache = true;
  } catch {
    gitAvailableCache = false;
  }

  return gitAvailableCache;
}

/**
 * Extracts historical metadata from git
 * @param {string} filePath - Relative file path
 * @returns {Object} Git history information
 */
export function extractHistoricalMetadata(filePath) {
  const defaultResult = {
    commitCount: 0,
    lastModified: null,
    age: null,
    churnRate: 0,
    contributors: [],
    recentChanges: 0,
    bugFixCommits: 0,
    hotspotScore: 0
  };

  if (!isGitAvailable()) {
    return defaultResult;
  }

  try {
    // Single log scan: date|author|subject
    const logOutput = execSync(
      `git log --format=%aI%x1f%an%x1f%s -- "${filePath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true }
    ).trim();

    if (!logOutput) {
      return defaultResult;
    }

    const lines = logOutput.split('\n').filter(Boolean);
    const commitCount = lines.length;

    const contributorsSet = new Set();
    let lastModified = null;
    let firstCommitDate = null;
    let recentChanges = 0;
    let bugFixCommits = 0;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < lines.length; i++) {
      const [dateStr = '', author = '', subject = ''] = lines[i].split('\x1f');
      const ts = Date.parse(dateStr);

      if (i === 0) {
        lastModified = dateStr || null;
      }

      if (!Number.isNaN(ts)) {
        if (ts >= thirtyDaysAgo) {
          recentChanges++;
        }
        if (i === lines.length - 1) {
          firstCommitDate = new Date(ts);
        }
      }

      if (author) {
        contributorsSet.add(author);
      }

      if (/\bfix(es|ed|ing)?\b/i.test(subject)) {
        bugFixCommits++;
      }
    }

    const contributors = Array.from(contributorsSet);

    let age = null;
    if (firstCommitDate) {
      age = Math.floor((Date.now() - firstCommitDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate churn rate (commits per month)
    let churnRate = 0;
    if (age && age > 0) {
      const months = age / 30;
      churnRate = months > 0 ? Math.round((commitCount / months) * 10) / 10 : 0;
    }

    // Calculate hotspot score (simplified: churn * recent changes)
    const hotspotScore = Math.round(churnRate * recentChanges * 10) / 10;

    return {
      commitCount,
      lastModified,
      age,
      churnRate,
      contributors,
      recentChanges,
      bugFixCommits,
      hotspotScore
    };
  } catch (error) {
    // Git command failed, return defaults
    return defaultResult;
  }
}
