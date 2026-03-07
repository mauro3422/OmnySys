
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { normalizePath } from './path-utils.js';


const execAsync = promisify(exec);

/**
 * GitTerminalBridge
 * 
 * Canonical service for all Git and Shell interactions.
 * Provides unified error handling, logging, and high-level Git operations.
 */
export class GitTerminalBridge {
    constructor(projectPath, logger = console) {
        this.projectPath = projectPath || process.cwd();
        this.logger = logger;
    }

    /**
     * Executes a shell command with consistent reporting.
     */
    async run(command, options = {}) {
        const {
            timeout = 30000,
            maxBuffer = 1024 * 1024 * 10, // 10MB
            silent = false
        } = options;

        try {
            if (!silent) {
                this.logger.debug(`[Shell] Executing: ${command}`);
            }

            const { stdout, stderr } = await execAsync(command, {
                cwd: this.projectPath,
                timeout,
                maxBuffer
            });

            if (stderr && !stdout) {
                this.logger.warn(`[Shell] Stderr: ${stderr}`);
            }

            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            };
        } catch (error) {
            this.logger.error(`[Shell] Failed: ${command}`, { error: error.message });
            return {
                success: false,
                error: error.message,
                stdout: error.stdout?.trim(),
                stderr: error.stderr?.trim()
            };
        }
    }

    /**
     * Traces the history of a specific symbol in a file using git log -L.
     */
    async getSymbolHistory(symbolName, filePath, limit = 10, lineRange = null) {
        const relativePath = this.getRelativePath(filePath);

        let cmd;
        if (lineRange && lineRange.start && lineRange.end) {
            // Priority 1: Exact line range (most robust)
            cmd = `git log -L ${lineRange.start},${lineRange.end}:${relativePath} -n ${limit} --format="COMMIT|%H|%at|%an|%s"`;
        } else {
            // Priority 2: Symbol name tracking
            cmd = `git log -L :${symbolName}:${relativePath} -n ${limit} --format="COMMIT|%H|%at|%an|%s"`;
        }

        let result = await this.run(cmd);

        // Fallback: If symbol tracking fails, try to find the symbol in current version to get a range
        if (!result.success && !lineRange) {
            this.logger.warn(`[GitBridge] Symbol tracking failed for ${symbolName} in ${relativePath}, attempting range fallback...`);
            const fallbackRange = await this._guessSymbolRange(symbolName, filePath);
            if (fallbackRange) {
                return this.getSymbolHistory(symbolName, filePath, limit, fallbackRange);
            }
        }

        if (!result.success) {
            throw new Error(`Git history failed for ${symbolName}: ${result.error}`);
        }

        return this.parseGitLogL(result.stdout, symbolName);
    }

    /**
     * Attempts to find the current line range of a symbol using file content.
     * Used as a fallback when git log -L :name: fails.
     */
    async _guessSymbolRange(symbolName, filePath) {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split('\n');

            // Basic heuristic for JS methods/functions
            const startIdx = lines.findIndex(l => l.includes(`${symbolName}(`) || l.includes(`${symbolName} =`) || l.includes(`async ${symbolName}`));
            if (startIdx === -1) return null;

            // Find end of block (very loose heuristic: next method or end of file)
            let endIdx = lines.slice(startIdx + 1).findIndex(l =>
                l.match(/^\s*(async\s+)?(get|set|static\s+)?\w+\s*\(/) || // Next method
                l.match(/^\s*export\s+/) || // Next export
                l.startsWith('}') // Closing bracket at column 0
            );

            if (endIdx === -1) endIdx = lines.length - startIdx;

            return {
                start: startIdx + 1,
                end: startIdx + endIdx + 1
            };
        } catch (e) {
            return null;
        }
    }


    /**
     * Standard Git log for a file.
     */
    async getFileHistory(filePath, limit = 10) {
        const relativePath = this.getRelativePath(filePath);
        const cmd = `git log -n ${limit} --format="%H|%at|%an|%s" -- "${relativePath}"`;

        const result = await this.run(cmd);
        if (!result.success) {
            throw new Error(`File history failed for ${relativePath}: ${result.error}`);
        }

        return result.stdout.split('\n').filter(Boolean).map(line => {
            const [hash, timestamp, author, subject] = line.split('|');
            return {
                hash,
                timestamp: parseInt(timestamp, 10),
                date: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
                author,
                subject
            };
        });
    }

    /**
     * Helper to ensure relative path for Git commands.
     * Consolidates structural duplicate by using shared path-utils.
     */
    getRelativePath(filePath) {
        return normalizePath(filePath, this.projectPath);
    }


    /**
     * Parses git log -L output.
     * Output format has chunks of: 
     * COMMIT|<hash>|<ts>|<author>|<subject>
     * diff --git ...
     * --- a/...
     * +++ b/...
     * @@ ... @@
     * <CODE>
     */
    parseGitLogL(output, symbolName) {
        const versions = [];
        // Splitting by the custom COMMIT header we injected in the format
        const blocks = output.split(/^COMMIT\|/m).filter(Boolean);

        for (const block of blocks) {
            const lines = block.split('\n');
            const metaLine = lines[0];
            const [hash, timestamp, author, subject] = metaLine.split('|');

            // The code/diff follows after the header. 
            // git log -L provides the code after the diff headers.
            const codeLines = lines.filter(line => {
                // Filter out diff relative headers but keep the actual content
                return !line.startsWith('diff --git') &&
                    !line.startsWith('--- ') &&
                    !line.startsWith('+++ ') &&
                    !line.startsWith('index ');
            }).slice(1); // skip the metaLine

            versions.push({
                hash,
                timestamp: parseInt(timestamp, 10),
                date: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
                author,
                subject,
                codeSnippet: codeLines.join('\n').trim()
            });
        }

        return versions;
    }

    /**
     * Executes a bulk git log to retrieve file age and change frequency.
     */
    async getBulkStats() {
        const cmd = 'git --no-pager log --name-only --root --format="COMMIT|%at"';
        const result = await this.run(cmd, { maxBuffer: 1024 * 1024 * 50 });

        if (!result.success) {
            throw new Error(`Bulk Git stats failed: ${result.error}`);
        }

        const stats = {};
        const lines = result.stdout.split('\n');
        let currentTimestamp = 0;
        const nowTimestamp = Math.floor(Date.now() / 1000);

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('COMMIT|')) {
                currentTimestamp = parseInt(trimmed.split('|')[1], 10);
            } else {
                const filePath = trimmed;
                if (!stats[filePath]) {
                    stats[filePath] = {
                        commits: 0,
                        firstCommitTs: currentTimestamp,
                        lastCommitTs: currentTimestamp
                    };
                }
                stats[filePath].commits += 1;
                if (currentTimestamp < stats[filePath].firstCommitTs) stats[filePath].firstCommitTs = currentTimestamp;
                if (currentTimestamp > stats[filePath].lastCommitTs) stats[filePath].lastCommitTs = currentTimestamp;
            }
        }

        for (const [file, data] of Object.entries(stats)) {
            data.ageDays = Math.max(0, Math.floor((nowTimestamp - data.firstCommitTs) / 86400));
            data.changeFrequency = Number((data.commits / Math.max(1, data.ageDays)).toFixed(4));
        }

        return stats;
    }
}

export default GitTerminalBridge;
