import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileInfo, FileDependency, AtomInfo, AtomRelation, DbStats, VsCodeMessage } from '../types';

interface OmnyData {
  files: FileInfo[];
  dependencies: FileDependency[];
  stats: DbStats | null;
  activeFileAtoms: AtomInfo[];
  activeFileRelations: AtomRelation[];
  activeFilePath: string | null;
  health: any;
  loading: boolean;
  error: string | null;
}

export function useOmnyData() {
  const [data, setData] = useState<OmnyData>({
    files: [],
    dependencies: [],
    stats: null,
    activeFileAtoms: [],
    activeFileRelations: [],
    activeFilePath: null,
    health: null,
    loading: true,
    error: null
  });

  const handleMessage = useCallback((event: MessageEvent<VsCodeMessage>) => {
    const msg = event.data;

    switch (msg.type) {
      case 'initialData':
        setData(prev => ({
          ...prev,
          files: msg.data?.files || [],
          dependencies: msg.data?.dependencies || [],
          stats: msg.data?.stats || null,
          health: msg.data?.health || prev.health,
          loading: false
        }));
        break;

      case 'fileAtoms':
        setData(prev => ({
          ...prev,
          activeFileAtoms: msg.data?.atoms || [],
          activeFileRelations: msg.data?.relations || [],
          activeFilePath: msg.data?.filePath || prev.activeFilePath
        }));
        break;

      case 'dependencyGraph':
        setData(prev => ({
          ...prev,
          files: msg.data?.files || prev.files,
          dependencies: msg.data?.dependencies || prev.dependencies
        }));
        break;

      case 'healthUpdate':
      case 'healthData':
        setData(prev => ({
          ...prev,
          health: msg.data || prev.health
        }));
        break;

      case 'activeFileChanged':
      case 'navigateToFile':
        setData(prev => ({
          ...prev,
          activeFilePath: msg.filePath || null
        }));
        break;

      case 'error':
        setData(prev => ({
          ...prev,
          error: msg.error || 'Unknown error',
          loading: false
        }));
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return data;
}
