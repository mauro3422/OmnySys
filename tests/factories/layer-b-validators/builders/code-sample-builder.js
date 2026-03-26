/**
 * Builder para cÃ³digo fuente de test
 */
export class LayerBCodeSampleBuilder {
  constructor() {
    this.code = '';
    this.localStorageKeys = [];
    this.eventNames = [];
    this.globalVars = [];
  }

  withLocalStorageKey(key, operation = 'setItem') {
    this.localStorageKeys.push(key);
    const lines = {
      setItem: `localStorage.setItem('${key}', value);`,
      getItem: `const data = localStorage.getItem('${key}');`,
      removeItem: `localStorage.removeItem('${key}');`,
      bracket: `localStorage['${key}'] = value;`,
      dot: `localStorage.${key} = value;`
    };
    this.code += lines[operation] || lines.setItem;
    this.code += '\n';
    return this;
  }

  withEventListener(eventName, pattern = 'standard') {
    this.eventNames.push(eventName);
    const lines = {
      standard: `element.addEventListener('${eventName}', handler);`,
      remove: `element.removeEventListener('${eventName}', handler);`,
      emit: `eventBus.emit('${eventName}', data);`,
      on: `eventBus.on('${eventName}', handler);`,
      once: `eventBus.once('${eventName}', handler);`
    };
    this.code += lines[pattern] || lines.standard;
    this.code += '\n';
    return this;
  }

  withGlobalVariable(name, object = 'window') {
    this.globalVars.push({ name, object });
    this.code += `${object}.${name} = value;\n`;
    return this;
  }

  withMultipleLocalStorageKeys(count, prefix = 'key') {
    for (let i = 0; i < count; i++) {
      this.withLocalStorageKey(`${prefix}${i}`);
    }
    return this;
  }

  withMultipleEventNames(count, prefix = 'event') {
    for (let i = 0; i < count; i++) {
      this.withEventListener(`${prefix}-${i}`);
    }
    return this;
  }

  build() {
    return {
      code: this.code,
      localStorageKeys: new Set(this.localStorageKeys),
      eventNames: new Set(this.eventNames),
      globalVars: [...this.globalVars]
    };
  }

  static create() {
    return new LayerBCodeSampleBuilder();
  }
}
