/**
 * @fileoverview Storage Builder - Builder for creating storage-related test code
 */

export class StorageBuilder {
  constructor() {
    this.code = '';
    this.storage = { reads: [], writes: [], all: [] };
  }

  /**
   * Add localStorage.setItem
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  withLocalStorageWrite(key = 'token', value = '"abc123"') {
    this.code += `
localStorage.setItem('${key}', ${value});
`;
    const line = this.code.split('\n').length - 1;
    this.storage.writes.push({ key, line, type: 'write' });
    this.storage.all.push({ key, line, type: 'write' });
    return this;
  }

  /**
   * Add localStorage.getItem
   * @param {string} key - Storage key
   * @param {string} variableName - Variable to assign to
   */
  withLocalStorageRead(key = 'token', variableName = 'token') {
    this.code += `
const ${variableName} = localStorage.getItem('${key}');
`;
    const line = this.code.split('\n').length - 1;
    this.storage.reads.push({ key, line, type: 'read' });
    this.storage.all.push({ key, line, type: 'read' });
    return this;
  }

  /**
   * Add localStorage bracket notation write
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  withBracketWrite(key = 'user', value = '"{}"') {
    this.code += `
localStorage['${key}'] = ${value};
`;
    const line = this.code.split('\n').length - 1;
    this.storage.writes.push({ key, line, type: 'write' });
    this.storage.all.push({ key, line, type: 'write' });
    return this;
  }

  /**
   * Add localStorage bracket notation read
   * @param {string} key - Storage key
   */
  withBracketRead(key = 'user') {
    this.code += `
const userData = localStorage['${key}'];
`;
    const line = this.code.split('\n').length - 1;
    this.storage.reads.push({ key, line, type: 'read' });
    this.storage.all.push({ key, line, type: 'read' });
    return this;
  }

  /**
   * Add sessionStorage.setItem
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  withSessionStorageWrite(key = 'sessionId', value = '"xyz789"') {
    this.code += `
sessionStorage.setItem('${key}', ${value});
`;
    const line = this.code.split('\n').length - 1;
    this.storage.writes.push({ key, line, type: 'write' });
    this.storage.all.push({ key, line, type: 'write' });
    return this;
  }

  /**
   * Add sessionStorage.getItem
   * @param {string} key - Storage key
   */
  withSessionStorageRead(key = 'sessionId') {
    this.code += `
const sessionId = sessionStorage.getItem('${key}');
`;
    const line = this.code.split('\n').length - 1;
    this.storage.reads.push({ key, line, type: 'read' });
    this.storage.all.push({ key, line, type: 'read' });
    return this;
  }

  /**
   * Add localStorage.removeItem
   * @param {string} key - Storage key
   */
  withLocalStorageRemove(key = 'token') {
    this.code += `
localStorage.removeItem('${key}');
`;
    return this;
  }

  /**
   * Add localStorage.clear
   */
  withLocalStorageClear() {
    this.code += `
localStorage.clear();
`;
    return this;
  }

  /**
   * Create auth storage pattern
   */
  withAuthStorage() {
    return this
      .withLocalStorageWrite('token', '"jwt_token_here"')
      .withLocalStorageWrite('user', 'JSON.stringify(user)')
      .withLocalStorageRead('token', 'savedToken');
  }

  /**
   * Create settings storage pattern
   */
  withSettingsStorage() {
    return this
      .withLocalStorageWrite('theme', '"dark"')
      .withLocalStorageWrite('language', '"en"')
      .withLocalStorageRead('theme', 'currentTheme')
      .withLocalStorageRead('language', 'currentLanguage');
  }

  /**
   * Create session storage pattern
   */
  withSessionPattern() {
    return this
      .withSessionStorageWrite('sessionId', '"sess_123"')
      .withSessionStorageWrite('csrfToken', '"token_abc"')
      .withSessionStorageRead('sessionId');
  }

  build() {
    return {
      code: this.code,
      storage: this.storage
    };
  }
}
