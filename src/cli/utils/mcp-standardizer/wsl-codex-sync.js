import fs from 'fs/promises';
import path from 'path';

import { stripBom, upsertTomlTable } from './utils.js';
import {
    OMNYSYSTEM_TABLE,
    getTableHeaders,
    extractTomlTable,
    isMcpTable,
    buildWslOmnysystemTableBody,
    isLegacyWslNodeBridgeTable,
    isWindowsOnlyOmnysystemTable,
    isWrapperBackedWslOmnysystemTable,
    shouldRefreshWrapperBackedWslOmnysystemTable
} from './wsl-codex-sync-helpers.js';

function isWslEnvironment(runtime = {}) {
    const platform = runtime.platform || process.platform;
    const env = runtime.env || process.env;
    return platform === 'linux' && Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP);
}

function getWindowsCodexConfigPath(runtime = {}) {
    if (runtime.windowsConfigPath) {
        return runtime.windowsConfigPath;
    }

    const env = runtime.env || process.env;
    const userProfile = String(env.USERPROFILE || '').trim();
    if (userProfile) {
        return path.join(userProfile, '.codex', 'config.toml');
    }

    const username = String(env.USERNAME || '').trim();
    if (username) {
        return path.join('/mnt/c/Users', username, '.codex', 'config.toml');
    }

    return '';
}

function getWslCodexConfigPath(runtime = {}) {
    if (runtime.wslConfigPath) {
        return runtime.wslConfigPath;
    }

    const env = runtime.env || process.env;
    return path.join(env.HOME || '', '.codex', 'config.toml');
}

export async function syncWindowsCodexMcpToWsl(options = {}) {
    const runtime = {
        platform: options.platform || process.platform,
        env: options.env || process.env,
        windowsConfigPath: options.windowsConfigPath || '',
        wslConfigPath: options.wslConfigPath || ''
    };

    if (!isWslEnvironment(runtime)) {
        return {
            applied: false,
            reason: 'not_wsl'
        };
    }

    const windowsConfigPath = getWindowsCodexConfigPath(runtime);
    const wslConfigPath = getWslCodexConfigPath(runtime);

    if (!windowsConfigPath || !wslConfigPath) {
        return {
            applied: false,
            reason: 'missing_paths'
        };
    }

    let windowsContent = '';
    try {
        windowsContent = stripBom(await fs.readFile(windowsConfigPath, 'utf8'));
    } catch {
        return {
            applied: false,
            reason: 'windows_config_missing',
            windowsConfigPath,
            wslConfigPath
        };
    }

    const mcpTables = getTableHeaders(windowsContent).filter(isMcpTable);
    if (mcpTables.length === 0) {
        return {
            applied: false,
            reason: 'no_windows_mcp_tables',
            windowsConfigPath,
            wslConfigPath
        };
    }

    let wslContent = '';
    try {
        wslContent = stripBom(await fs.readFile(wslConfigPath, 'utf8'));
    } catch {
        wslContent = '';
    }

    const existingWslTables = new Set(getTableHeaders(wslContent).filter(isMcpTable));
    let updated = wslContent;
    const syncedTables = [];
    const skippedExistingTables = [];
    const adaptedTables = [];

    for (const tableName of mcpTables) {
        const tableBody = extractTomlTable(windowsContent, tableName);
        if (!tableBody) {
            continue;
        }

        if (!existingWslTables.has(tableName)) {
            const nextTableBody = tableName === OMNYSYSTEM_TABLE
                ? buildWslOmnysystemTableBody(tableBody)
                : tableBody;
            updated = upsertTomlTable(updated, tableName, nextTableBody);
            syncedTables.push(tableName);
            if (tableName === OMNYSYSTEM_TABLE) {
                adaptedTables.push(tableName);
            }
            continue;
        }

        if (tableName !== OMNYSYSTEM_TABLE) {
            skippedExistingTables.push(tableName);
            continue;
        }

        const existingBody = extractTomlTable(updated, tableName);
        if (
            !existingBody ||
            (!isWindowsOnlyOmnysystemTable(existingBody) &&
                !isLegacyWslNodeBridgeTable(existingBody) &&
                !shouldRefreshWrapperBackedWslOmnysystemTable(existingBody)) ||
            (isWrapperBackedWslOmnysystemTable(existingBody) &&
                !shouldRefreshWrapperBackedWslOmnysystemTable(existingBody))
        ) {
            skippedExistingTables.push(tableName);
            continue;
        }

        updated = upsertTomlTable(updated, tableName, buildWslOmnysystemTableBody(tableBody));
        adaptedTables.push(tableName);
    }

    if (updated === wslContent) {
        return {
            applied: false,
            reason: syncedTables.length === 0 && adaptedTables.length === 0 ? 'no_missing_wsl_mcp_tables' : 'already_synced',
            windowsConfigPath,
            wslConfigPath,
            tableCount: syncedTables.length + adaptedTables.length,
            syncedTables,
            adaptedTables,
            skippedExistingTables
        };
    }

    await fs.mkdir(path.dirname(wslConfigPath), { recursive: true });
    await fs.writeFile(wslConfigPath, updated, 'utf8');

    return {
        applied: true,
        reason: 'synced',
        windowsConfigPath,
        wslConfigPath,
        tableCount: syncedTables.length + adaptedTables.length,
        syncedTables,
        adaptedTables,
        skippedExistingTables
    };
}

export default {
    syncWindowsCodexMcpToWsl
};
