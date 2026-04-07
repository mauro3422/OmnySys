import { useCallback } from 'react';

interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeApi: VsCodeApi | null = null;

function getVsCodeApi(): VsCodeApi | null {
  if (vscodeApi) return vscodeApi;
  try {
    vscodeApi = acquireVsCodeApi();
    return vscodeApi;
  } catch {
    // Running outside VS Code (dev mode)
    return null;
  }
}

export function useVsCode() {
  const api = getVsCodeApi();

  const postMessage = useCallback((message: any) => {
    if (api) {
      api.postMessage(message);
    } else {
      console.log('[dev] postMessage:', message);
    }
  }, [api]);

  const requestFileAtoms = useCallback((filePath: string) => {
    postMessage({ type: 'requestFileAtoms', filePath, requestId: `atoms-${Date.now()}` });
  }, [postMessage]);

  const requestDependencies = useCallback(() => {
    postMessage({ type: 'requestDependencies', requestId: `deps-${Date.now()}` });
  }, [postMessage]);

  const requestHealth = useCallback(() => {
    postMessage({ type: 'requestHealth', requestId: `health-${Date.now()}` });
  }, [postMessage]);

  const openFile = useCallback((filePath: string) => {
    postMessage({ type: 'openFile', filePath });
  }, [postMessage]);

  return {
    postMessage,
    requestFileAtoms,
    requestDependencies,
    requestHealth,
    openFile,
    isVsCode: !!api
  };
}
