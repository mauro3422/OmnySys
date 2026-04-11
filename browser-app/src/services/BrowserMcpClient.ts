/**
 * BrowserMcpClient — HTTP client for OmnySystem MCP daemon (browser-native)
 * Uses fetch API instead of Node.js http module.
 * Proxied through Vite dev server to avoid CORS.
 */

export class BrowserMcpClient {
  private sessionId: string | null = null;
  private initPromise: Promise<void> | null = null;
  private timeout: number;

  constructor(private baseUrl: string = '', timeout: number = 15000) {
    this.timeout = timeout;
  }

  /** Simple REST health check */
  async getHealth(): Promise<any> {
    return this._get('/health');
  }

  /** Initialize MCP session (required before tool calls) */
  private async _ensureSession(): Promise<void> {
    if (this.sessionId) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const result = await this._postMcp({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: {
              name: 'omnysystem-browser-explorer',
              version: '0.1.0'
            }
          }
        });

        if (!this.sessionId) {
          console.warn('[BrowserMcpClient] No session ID returned from initialize');
        }

        // Send initialized notification
        await this._postMcp({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        });

      } catch (err: any) {
        console.error('[BrowserMcpClient] Session init failed:', err.message);
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  /** Call an MCP tool */
  async callTool(toolName: string, params: Record<string, any> = {}): Promise<any> {
    await this._ensureSession();

    const result = await this._postMcp({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: `mcp_omnysystem_${toolName}`,
        arguments: params
      }
    });

    if (result?.result?.content) {
      const textContent = result.result.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try { return JSON.parse(textContent.text); }
        catch { return textContent.text; }
      }
    }
    return result?.result || result;
  }

  /** Execute SQL query via MCP tool */
  async executeSql(query: string): Promise<any> {
    return this.callTool('execute_sql', { query });
  }

  resetSession() {
    this.sessionId = null;
    this.initPromise = null;
  }

  // ── HTTP helpers (fetch-based) ──────────────────────

  private async _get(path: string): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        signal: controller.signal,
      });
      const text = await res.text();
      try { return JSON.parse(text); }
      catch { return text; }
    } finally {
      clearTimeout(timer);
    }
  }

  private async _postMcp(body: any): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (this.sessionId) {
        headers['Mcp-Session-Id'] = this.sessionId;
      }

      const res = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // Capture session ID
      const sid = res.headers.get('mcp-session-id');
      if (sid) this.sessionId = sid;

      const text = await res.text();
      try { return JSON.parse(text); }
      catch { return text; }
    } finally {
      clearTimeout(timer);
    }
  }
}
