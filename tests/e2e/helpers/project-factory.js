import fs from 'fs/promises';
import path from 'path';

export async function createTestProject(baseDir, name, files) {
  const projectDir = path.join(baseDir, name);
  await fs.mkdir(projectDir, { recursive: true });
  
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(projectDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }
  
  return projectDir;
}

export function createReactComponent(name) {
  return `
import React, { useState, useEffect } from 'react';

export function ${name}({ initialValue }) {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    localStorage.setItem('${name.toLowerCase()}', JSON.stringify(value));
  }, [value]);
  
  return (
    <div>
      <input value={value} onChange={e => setValue(e.target.value)} />
    </div>
  );
}
`;
}

export function createServiceModule(name, options = {}) {
  const { hasStorage = false, hasEvents = false, hasFetch = false } = options;
  
  let body = `
export class ${name} {
  constructor() {
    this.data = new Map();
  }
  
  get(id) {
    return this.data.get(id);
  }
  
  set(id, value) {
    this.data.set(id, value);
  }
`;

  if (hasStorage) {
    body += `
  
  persist() {
    localStorage.setItem('${name.toLowerCase()}_data', JSON.stringify([...this.data]));
  }
  
  load() {
    const stored = localStorage.getItem('${name.toLowerCase()}_data');
    if (stored) this.data = new Map(JSON.parse(stored));
  }
`;
  }

  if (hasEvents) {
    body += `
  
  emit(event, data) {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  listen(event, handler) {
    window.addEventListener(event, handler);
  }
`;
  }

  if (hasFetch) {
    body += `
  
  async fetch(id) {
    const response = await fetch('/api/${name.toLowerCase()}/' + id);
    return response.json();
  }
`;
  }

  body += `
}
`;
  return body;
}

export function createEventEmitter(name) {
  return `
import { EventEmitter } from 'events';

export const ${name} = new EventEmitter();

export function broadcast(event, data) {
  ${name}.emit(event, data);
}

export function subscribe(event, handler) {
  ${name}.on(event, handler);
  return () => ${name}.off(event, handler);
}
`;
}

export function createStore(name) {
  return `
let state = {};

const listeners = new Set();

export const ${name} = {
  getState() {
    return state;
  },
  
  setState(newState) {
    state = { ...state, ...newState };
    listeners.forEach(l => l(state));
  },
  
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
`;
}

export function createCircularDependencyA() {
  return `
import { b } from './circular-b.js';

export function a() {
  return b() + 1;
}
`;
}

export function createCircularDependencyB() {
  return `
import { a } from './circular-a.js';

export function b() {
  return a() + 1;
}
`;
}

export async function cleanupTestDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
}

export const SAMPLE_PROJECT = {
  'index.js': `
import { App } from './app.js';
import { Store } from './store.js';

Store.init();

const app = new App();
app.start();
`,
  'app.js': `
import { Store } from './store.js';
import { log } from './utils/logger.js';

export class App {
  start() {
    log('App started');
    Store.subscribe(this.handleChange);
  }
  
  handleChange(state) {
    console.log('State changed:', state);
  }
}
`,
  'store.js': `
import { saveToStorage, loadFromStorage } from './utils/storage.js';

let state = {};

export const Store = {
  init() {
    state = loadFromStorage('app_state') || {};
  },
  
  getState() {
    return state;
  },
  
  setState(newState) {
    state = { ...state, ...newState };
    saveToStorage('app_state', state);
  },
  
  subscribe(listener) {
    window.addEventListener('state:change', e => listener(e.detail));
  }
};
`,
  'utils/logger.js': `
export function log(message) {
  console.log('[LOG]', message);
}

export function error(message) {
  console.error('[ERROR]', message);
}
`,
  'utils/storage.js': `
export function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadFromStorage(key) {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
}

export function removeFromStorage(key) {
  localStorage.removeItem(key);
}
`
};
