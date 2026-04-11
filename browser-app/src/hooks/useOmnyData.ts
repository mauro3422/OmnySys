/**
 * useOmnyData — Fetches data from the DB API server on-demand
 * Tries /api endpoints first, falls back to demo data if server unavailable
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileInfo, FileDependency, AtomInfo, AtomRelation, DbStats } from '../types';
import { DEMO_FILES as demoFiles, DEMO_DEPENDENCIES as demoDependencies, DEMO_ATOMS as demoAtoms, DEMO_RELATIONS as demoRelations, DEMO_STATS as demoStats } from '../services/demoData';

const API_BASE = '/api';

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return fallback;
  }
}

export interface OmnyDataState {
  loading: boolean;
  dataSource: 'live' | 'demo';
  stats: DbStats | null;
  files: FileInfo[];
  dependencies: FileDependency[];
  activeFilePath: string | null;
  activeFileAtoms: AtomInfo[];
  activeFileRelations: AtomRelation[];
  health: any;
  selectFile: (path: string) => void;
  refresh: () => void;
}

export function useOmnyData(): OmnyDataState {
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo');
  const [stats, setStats] = useState<DbStats | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [dependencies, setDependencies] = useState<FileDependency[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [activeSymbolName, setActiveSymbolName] = useState<string | null>(null);
  const [activeFileAtoms, setActiveFileAtoms] = useState<AtomInfo[]>([]);
  const [activeFileRelations, setActiveFileRelations] = useState<AtomRelation[]>([]);
  const [health, setHealth] = useState<any>(null);
  const isLive = useRef(false);

  // ── Initial load: stats + files + dependencies ───────────────
  const loadSystem = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Try live API first
      const testRes = await fetch(`${API_BASE}/stats`);
      if (testRes.ok) {
        const liveStats = await testRes.json();
        isLive.current = true;
        setDataSource('live');
        setStats(liveStats);
        setHealth({ ready: true, status: 'healthy', transport: 'better-sqlite3' });

        // Fetch files & deps in parallel
        const [liveFiles, liveDeps] = await Promise.all([
          fetchJson<FileInfo[]>('/files', []),
          fetchJson<FileDependency[]>('/dependencies', []),
        ]);
        setFiles(liveFiles);
        setDependencies(liveDeps);
      } else {
        throw new Error('API not available');
      }
    } catch {
      if (!isSilent) {
        // Fallback to demo
        isLive.current = false;
        setDataSource('demo');
        setStats(demoStats);
        setFiles(demoFiles);
        setDependencies(demoDependencies);
        setHealth({ ready: true, status: 'demo', transport: 'demo-data' });
      }
    }
    if (!isSilent) setLoading(false);
  }, []);

  useEffect(() => { 
    loadSystem(); 

    // Heartbeat: Polling every 10 seconds (SILENT)
    const interval = setInterval(() => {
      loadSystem(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadSystem]);

  // ── Select file: lazy-load atoms + relations ─────────────────
  const selectFile = useCallback(async (filePath: string) => {
    setActiveFilePath(filePath);

    if (isLive.current) {
      const encodedPath = encodeURIComponent(filePath);
      const [atoms, relations] = await Promise.all([
        fetchJson<AtomInfo[]>(`/atoms/${encodedPath}`, []),
        fetchJson<AtomRelation[]>(`/relations/${encodedPath}`, []),
      ]);
      setActiveFileAtoms(atoms);
      setActiveFileRelations(relations);
      console.log(`[useOmnyData] File ${filePath}: ${atoms.length} atoms, ${relations.length} relations`);
    } else {
      // Demo fallback
      const fileAtoms = demoAtoms.filter(a => a.filePath === filePath);
      const atomIds = new Set(fileAtoms.map(a => a.id));
      const fileRelations = demoRelations.filter(r => atomIds.has(r.sourceId));
      setActiveFileAtoms(fileAtoms);
      setActiveFileRelations(fileRelations);
    }
  }, []);

  const refresh = useCallback(() => { loadSystem(); }, [loadSystem]);

  return {
    loading, dataSource, stats, files, dependencies,
    activeFilePath, activeFileAtoms, activeFileRelations,
    health, selectFile, refresh,
  };
}
