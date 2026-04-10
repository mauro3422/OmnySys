import fs from 'fs';

import { inferTargetPlatform, normalizeSlashes, toTargetPath } from './utils.js';

const DEFAULT_WINDOWS_NODE_PATH = '/mnt/c/Program Files/nodejs/node.exe';

function getWindowsNodeCandidates(options = {}) {
    const env = options.env || process.env;
    const systemDrive = String(env.SYSTEMDRIVE || env.SystemDrive || 'C:').trim() || 'C:';
    const normalizedSystemDrive = systemDrive.replace(/[\\/]+$/, '');

    return [
        options.windowsNodePath,
        env.OMNYSYS_WINDOWS_NODE_PATH,
        env.OMNYSYS_WINDOWS_NODE,
        process.platform === 'win32' ? process.execPath : '',
        `${normalizedSystemDrive}/Program Files/nodejs/node.exe`,
        DEFAULT_WINDOWS_NODE_PATH
    ].filter(Boolean);
}

function toRuntimeFileSystemPath(filePath) {
    const normalized = normalizeSlashes(filePath);
    const driveMatch = normalized.match(/^([A-Za-z]):\/(.*)$/);
    if (!driveMatch || process.platform === 'win32') {
        return normalized;
    }

    const [, drive, rest] = driveMatch;
    return `/mnt/${drive.toLowerCase()}/${rest}`;
}

export function getNodeCommand(options = {}) {
    const targetPlatform = options.targetPlatform || inferTargetPlatform(options);
    if (targetPlatform !== 'windows') {
        return normalizeSlashes(options.unixNodePath || process.execPath);
    }

    // install.js may run inside WSL, but Windows-facing configs must still
    // launch the Windows node.exe that owns VS Code and the daemon terminals.
    for (const candidate of getWindowsNodeCandidates(options)) {
        if (fs.existsSync(toRuntimeFileSystemPath(candidate))) {
            return toTargetPath(candidate, { targetPlatform });
        }
    }

    return toTargetPath(DEFAULT_WINDOWS_NODE_PATH, { targetPlatform });
}
