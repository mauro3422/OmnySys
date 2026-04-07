/**
 * McpClient — HTTP client for OmnySystem MCP daemon
 * 
 * Connects to the MCP HTTP server at localhost:9999.
 * Uses both simple REST (/health) and full MCP protocol (/mcp)
 * with automatic session initialization for tool calls.
 */

import * as http from 'http';

export class McpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private sessionId: string | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(baseUrl: string = 'http://127.0.0.1:9999', timeout: number = 15000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /** Simple REST health check — no MCP protocol needed */
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
              name: 'omnysystem-explorer-vscode',
              version: '0.1.0'
            }
          }
        });

        // Session ID comes from response header (captured in _postMcp)
        if (!this.sessionId) {
          console.warn('[McpClient] No session ID returned from initialize');
        }

        // Send initialized notification
        await this._postMcp({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        });

      } catch (err: any) {
        console.error('[McpClient] Session init failed:', err.message);
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  /** Call an MCP tool with proper session */
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

    // Parse tool result
    if (result?.result?.content) {
      const textContent = result.result.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          return JSON.parse(textContent.text);
        } catch {
          return textContent.text;
        }
      }
    }
    return result?.result || result;
  }

  /** Execute SQL query via MCP tool */
  async executeSql(query: string): Promise<any> {
    return this.callTool('execute_sql', { query });
  }



  /** Reset session (e.g., after daemon restart) */
  resetSession() {
    this.sessionId = null;
    this.initPromise = null;
  }

  // ── HTTP helpers ──────────────────────────────────────

  private _get(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const req = http.get(url.toString(), { timeout: this.timeout }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  /** POST to /mcp with session header handling */
  private _postMcp(body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL('/mcp', this.baseUrl);
      const payload = JSON.stringify(body);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload)),
        'Accept': 'application/json'
      };

      if (this.sessionId) {
        headers['Mcp-Session-Id'] = this.sessionId;
      }

      const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        timeout: this.timeout,
        headers
      };

      const req = http.request(options, (res) => {
        // Capture session ID from response
        const sid = res.headers['mcp-session-id'];
        if (sid && typeof sid === 'string') {
          this.sessionId = sid;
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(payload);
      req.end();
    });
  }
}
