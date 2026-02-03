/**
 * CogniSystem API Client
 *
 * Cliente HTTP para comunicarse con el Unified Server.
 */

import * as http from 'http';

export class CogniSystemAPI {
  private orchestratorPort: number;
  private bridgePort: number;

  constructor(orchestratorPort: number = 9999, bridgePort: number = 9998) {
    this.orchestratorPort = orchestratorPort;
    this.bridgePort = bridgePort;
  }

  /**
   * Queue file for analysis
   */
  async prioritize(filePath: string, priority: 'critical' | 'high' | 'medium' | 'low' = 'high') {
    return this.post(this.orchestratorPort, '/command', {
      action: 'prioritize',
      filePath,
      priority,
      requestId: Date.now().toString()
    });
  }

  /**
   * Get impact map for file
   */
  async getImpact(filePath: string) {
    return this.get(this.bridgePort, `/api/impact/${filePath}`);
  }

  /**
   * Get full system status
   */
  async getStatus() {
    return this.get(this.orchestratorPort, '/status');
  }

  /**
   * Get bridge status (richer data)
   */
  async getBridgeStatus() {
    return this.get(this.bridgePort, '/api/status');
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return await this.get(this.orchestratorPort, '/health');
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }

  /**
   * Get all files
   */
  async getFiles() {
    return this.get(this.bridgePort, '/api/files');
  }

  /**
   * Search files
   */
  async search(pattern: string) {
    return this.get(this.bridgePort, `/api/search?q=${encodeURIComponent(pattern)}`);
  }

  /**
   * HTTP GET helper
   */
  private get(port: number, path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port,
        path,
        method: 'GET',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * HTTP POST helper
   */
  private post(port: number, path: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(body);

      const options = {
        hostname: 'localhost',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }
}
