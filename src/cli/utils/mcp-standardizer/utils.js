import fs from 'fs/promises';
import path from 'path';
import { PORTS } from '../port-checker.js';
import { buildHealthUrl, buildMcpUrl } from '../mcp-endpoints.js';
import { SERVER_KEY, LEGACY_SERVER_KEYS } from './constants.js';

export function getMcpUrl() {
    return buildMcpUrl({ port: PORTS.mcp });
}

export function getHealthUrl() {
    return buildHealthUrl({ port: PORTS.mcp });
}

export function normalizeSlashes(filePath) {
    return String(filePath || '').replace(/\\/g, '/');
}

export function isWindowsPath(filePath) {
    return /^[A-Za-z]:\//.test(normalizeSlashes(filePath).trim());
}

export function isMountedWindowsPath(filePath) {
    return /^\/mnt\/[A-Za-z](\/|$)/.test(normalizeSlashes(filePath).trim());
}

export function toWindowsPath(filePath) {
    const normalized = normalizeSlashes(filePath).trim();
    if (isWindowsPath(normalized)) {
        return normalized.replace(/^([a-z]):\//, (_, drive) => `${drive.toUpperCase()}:/`);
    }

    const match = normalized.match(/^\/mnt\/([A-Za-z])\/(.*)$/);
    if (!match) {
        return normalized;
    }

    const [, drive, rest] = match;
    return `${drive.toUpperCase()}:/${rest}`;
}

export function inferTargetPlatform({ filePath = '', projectPath = '', defaultPlatform = process.platform } = {}) {
    const normalizedFilePath = normalizeSlashes(filePath).trim();
    if (normalizedFilePath) {
        return isWindowsPath(normalizedFilePath) || isMountedWindowsPath(normalizedFilePath)
            ? 'windows'
            : 'unix';
    }

    if (isWindowsPath(projectPath) || isMountedWindowsPath(projectPath)) {
        return 'windows';
    }

    return defaultPlatform === 'win32' ? 'windows' : 'unix';
}

export function toTargetPath(filePath, options = {}) {
    const targetPlatform = options.targetPlatform || inferTargetPlatform({
        filePath,
        projectPath: options.projectPath || ''
    });

    if (targetPlatform === 'windows') {
        return toWindowsPath(filePath);
    }

    return normalizeSlashes(filePath);
}

export function stripBom(text) {
    if (typeof text !== 'string') return '';
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

export function cloneObject(value) {
    return JSON.parse(JSON.stringify(value));
}

export async function readJsonSafe(filePath, fallback = {}) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const cleaned = stripBom(raw).trim();
        if (!cleaned) return cloneObject(fallback);
        return JSON.parse(cleaned);
    } catch {
        return cloneObject(fallback);
    }
}

export async function writeJsonNoBom(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function ensureMcpServersContainer(config) {
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        config.mcpServers = {};
    }
    return config.mcpServers;
}

export function getPrimaryWithLegacyFallback(mcpServers) {
    if (!mcpServers || typeof mcpServers !== 'object') return {};

    const primary = mcpServers[SERVER_KEY];
    if (primary && typeof primary === 'object') return primary;

    for (const legacyKey of LEGACY_SERVER_KEYS) {
        const legacy = mcpServers[legacyKey];
        if (legacy && typeof legacy === 'object') return legacy;
    }

    return {};
}

export function clearLegacyAliases(mcpServers) {
    for (const legacyKey of LEGACY_SERVER_KEYS) {
        delete mcpServers[legacyKey];
    }
}

export function upsertTomlTable(content, tableName, tableBody) {
    const lines = content.split(/\r?\n/);
    const header = `[${tableName}]`;

    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === header) {
            start = i;
            break;
        }
    }

    const bodyLines = [header, ...tableBody];

    if (start === -1) {
        const trimmed = content.trim();
        const separator = trimmed.length > 0 ? '\n\n' : '';
        return `${trimmed}${separator}${bodyLines.join('\n')}\n`;
    }

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith('[') && lines[i].trim().endsWith(']')) {
            end = i;
            break;
        }
    }

    const next = [...lines.slice(0, start), ...bodyLines, ...lines.slice(end)];
    return `${next.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
