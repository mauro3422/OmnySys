import * as path from 'path';
import * as fs from 'fs';
import {
  FileData,
  GraphData,
  GraphNode,
  GraphEdge,
  ImpactMap,
  HighRiskFile,
  SemanticConnection,
} from '../types';

/**
 * Proveedor principal de datos de CogniSystem
 * Lee los datos generados por el indexer desde la carpeta .aver/
 */
export class CogniSystemProvider {
  private fileCache: Map<string, FileData> = new Map();

  constructor(private projectRoot: string) {}

  getProjectRoot(): string {
    return this.projectRoot;
  }

  private getAverPath(): string {
    return path.join(this.projectRoot, '.aver');
  }

  isAnalyzed(): boolean {
    return fs.existsSync(this.getAverPath());
  }

  async getFileData(filePath: string): Promise<FileData | null> {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }

    try {
      const relativePath = path.relative(this.projectRoot, filePath).replace(/\\/g, '/');
      const fileName = path.basename(relativePath);
      const dirName = path.dirname(relativePath);
      const fileDataPath = path.join(this.getAverPath(), 'files', dirName, `${fileName}.json`);

      if (!fs.existsSync(fileDataPath)) {
        return null;
      }

      const content = fs.readFileSync(fileDataPath, 'utf-8');
      const data: FileData = JSON.parse(content);
      this.fileCache.set(filePath, data);
      return data;
    } catch (error) {
      console.error('Error reading file data:', error);
      return null;
    }
  }

  async getAllConnections(): Promise<GraphData> {
    try {
      const sharedState = this.readConnectionsFile('shared-state.json');
      const eventListeners = this.readConnectionsFile('event-listeners.json');
      const index = this.readIndexFile();

      const files = index.files?.index || {};

      const nodes = this.buildNodes(files);
      const edges = this.buildEdges(files, sharedState, eventListeners);

      return { nodes, edges };
    } catch (error) {
      console.error('Error getting connections:', error);
      return { nodes: [], edges: [] };
    }
  }

  private readConnectionsFile(filename: string): any[] {
    try {
      const filePath = path.join(this.getAverPath(), 'connections', filename);
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data.connections || [];
    } catch {
      return [];
    }
  }

  private readIndexFile(): any {
    try {
      const indexPath = path.join(this.getAverPath(), 'index.json');
      return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {
      return { files: { index: {} } };
    }
  }

  private buildNodes(files: Record<string, any>): GraphNode[] {
    return Object.entries(files).map(([filePath, fileInfo]) => ({
      id: filePath,
      label: path.basename(filePath),
      risk: fileInfo.riskScore?.total || 0,
      severity: fileInfo.riskScore?.severity || 'low',
      connections:
        (fileInfo.usedBy?.length || 0) + (fileInfo.semanticConnections?.length || 0),
    }));
  }

  private buildEdges(
    files: Record<string, any>,
    sharedState: any[],
    eventListeners: any[]
  ): GraphEdge[] {
    const edges: GraphEdge[] = [];

    // Edges de imports
    Object.entries(files).forEach(([filePath, fileInfo]) => {
      if (fileInfo.usedBy) {
        fileInfo.usedBy.forEach((dependent: string) => {
          edges.push({
            source: dependent,
            target: filePath,
            type: 'import',
          });
        });
      }
    });

    // Edges semánticas
    [...sharedState, ...eventListeners].forEach((conn: any) => {
      edges.push({
        source: conn.sourceFile,
        target: conn.targetFile,
        type: 'semantic',
      });
    });

    return edges;
  }

  async getImpactMap(filePath: string): Promise<ImpactMap | null> {
    const data = await this.getFileData(filePath);
    if (!data) return null;

    return {
      file: path.relative(this.projectRoot, filePath),
      directlyAffects: data.usedBy || [],
      semanticConnections: data.semanticConnections || [],
      riskLevel: data.riskScore?.severity || 'unknown',
    };
  }

  getHighRiskFiles(): HighRiskFile[] {
    try {
      const index = this.readIndexFile();
      const files = index.files?.index || {};

      return Object.entries(files)
        .filter(([, info]: [string, any]) => info.riskScore?.total > 5)
        .map(([filePath, info]: [string, any]) => ({
          path: filePath,
          score: info.riskScore.total,
          severity: info.riskScore.severity,
        }))
        .sort((a, b) => b.score - a.score);
    } catch (error) {
      return [];
    }
  }

  clearCache(): void {
    this.fileCache.clear();
  }
}
