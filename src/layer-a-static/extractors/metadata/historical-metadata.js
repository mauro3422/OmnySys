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

  try {
    // Check if git is available
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    // Git not available
    return defaultResult;
  }

  try {
    // Get commit count for file
    const commitCountStr = execSync(
      `git log --oneline -- "${filePath}" | wc -l`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    const commitCount = parseInt(commitCountStr, 10) || 0;

    // Get last modified date
    let lastModified = null;
    try {
      const lastModifiedStr = execSync(
        `git log -1 --format=%aI -- "${filePath}"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
      lastModified = lastModifiedStr || null;
    } catch {
      // File not in git yet
    }

    // Get creation date (first commit)
    let age = null;
    try {
      const firstCommitStr = execSync(
        `git log --reverse --format=%aI -- "${filePath}" | head -1`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (firstCommitStr) {
        const firstCommitDate = new Date(firstCommitStr);
        const now = new Date();
        age = Math.floor((now - firstCommitDate) / (1000 * 60 * 60 * 24)); // days
      }
    } catch {
      // Can't determine age
    }

    // Get contributors
    let contributors = [];
    try {
      const contributorsStr = execSync(
        `git log --format=%an -- "${filePath}" | sort -u`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
      contributors = contributorsStr ? contributorsStr.split('\n').filter(Boolean) : [];
    } catch {
      // Can't get contributors
    }

    // Get recent changes (last 30 days)
    let recentChanges = 0;
    try {
      const recentStr = execSync(
        `git log --since="30 days ago" --oneline -- "${filePath}" | wc -l`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
      recentChanges = parseInt(recentStr, 10) || 0;
    } catch {
      // Can't get recent changes
    }

    // Get bug fix commits (commits with "fix" in message)
    let bugFixCommits = 0;
    try {
      const bugFixStr = execSync(
        `git log --grep="fix" -i --oneline -- "${filePath}" | wc -l`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
      bugFixCommits = parseInt(bugFixStr, 10) || 0;
    } catch {
      // Can't get bug fix commits
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
