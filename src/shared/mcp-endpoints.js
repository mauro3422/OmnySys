function normalizeHost(host) {
    return String(host || '').trim().replace(/^\[(.*)\]$/, '$1');
}

function isWildcardHost(host) {
    return host === '0.0.0.0' || host === '::';
}

function isValidClientHost(host) {
    return Boolean(host) && !isWildcardHost(host);
}

export function resolveMcpClientHost({ env = process.env, platform = process.platform } = {}) {
    const configuredHost = normalizeHost(env.OMNYSYS_MCP_TARGET_HOST || env.OMNYSYS_MCP_HOST);
    if (isValidClientHost(configuredHost)) {
        return configuredHost;
    }

    const explicitWslHost = normalizeHost(
        env.OMNYSYS_WSL_HOST
        || env.OMNYSYS_WINDOWS_HOST
        || env.OMNYSYS_HOST_IP
        || env.WSL_HOST_IP
    );
    if (isValidClientHost(explicitWslHost)) {
        return explicitWslHost;
    }

    return 'localhost';
}

export function buildMcpUrl({ port = 9999, path = '/mcp', env = process.env, platform = process.platform } = {}) {
    const host = resolveMcpClientHost({ env, platform });
    return `http://${host}:${port}${path}`;
}

export function buildHealthUrl({ port = 9999, env = process.env, platform = process.platform } = {}) {
    return buildMcpUrl({ port, path: '/health', env, platform });
}

export function buildHealthProbeUrls({ port = 9999, env = process.env, platform = process.platform } = {}) {
    const hostUrl = buildHealthUrl({ port, env, platform });
    const urls = hostUrl === `http://localhost:${port}/health`
        ? [
            `http://127.0.0.1:${port}/health`,
            `http://localhost:${port}/health`
        ]
        : [
            hostUrl,
            `http://localhost:${port}/health`,
            `http://127.0.0.1:${port}/health`
        ];

    if (!urls.includes(hostUrl)) {
        urls.unshift(hostUrl);
    }

    return urls;
}
