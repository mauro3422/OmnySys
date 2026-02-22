/**
 * @fileoverview Env Builder - Builder for creating environment variable test code
 */

export class EnvBuilder {
  constructor() {
    this.code = '';
    this.envVars = [];
  }

  /**
   * Add process.env access
   * @param {string} varName - Environment variable name
   * @param {string} variableName - Local variable name
   */
  withProcessEnv(varName = 'API_URL', variableName = 'apiUrl') {
    this.code += `
const ${variableName} = process.env.${varName};
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'process.env' });
    return this;
  }

  /**
   * Add import.meta.env access (Vite)
   * @param {string} varName - Environment variable name
   * @param {string} variableName - Local variable name
   */
  withImportMetaEnv(varName = 'VITE_API_URL', variableName = 'apiUrl') {
    this.code += `
const ${variableName} = import.meta.env.${varName};
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'import.meta.env' });
    return this;
  }

  /**
   * Add default value pattern
   * @param {string} varName - Environment variable name
   * @param {string} defaultValue - Default value
   */
  withDefaultValue(varName = 'PORT', defaultValue = '3000') {
    this.code += `
const port = process.env.${varName} || '${defaultValue}';
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'process.env' });
    return this;
  }

  /**
   * Add boolean environment variable
   * @param {string} varName - Environment variable name
   */
  withBooleanEnv(varName = 'DEBUG') {
    this.code += `
const isDebug = process.env.${varName} === 'true';
`;
    const line = this.code.split('\n').length - 1;
    this.envVars.push({ name: varName, line, type: 'process.env' });
    return this;
  }

  /**
   * Add multiple environment variables
   * @param {string[]} varNames - Environment variable names
   */
  withMultipleEnv(varNames = ['API_URL', 'API_KEY', 'NODE_ENV']) {
    varNames.forEach(name => {
      this.withProcessEnv(name, name.toLowerCase());
    });
    return this;
  }

  /**
   * Create config object from env vars
   */
  withConfigObject() {
    this.code += `
const config = {
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY,
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development'
};
`;
    this.envVars.push(
      { name: 'API_URL', line: this.code.split('\n').length - 5, type: 'process.env' },
      { name: 'API_KEY', line: this.code.split('\n').length - 4, type: 'process.env' },
      { name: 'PORT', line: this.code.split('\n').length - 3, type: 'process.env' },
      { name: 'NODE_ENV', line: this.code.split('\n').length - 2, type: 'process.env' }
    );
    return this;
  }

  build() {
    return {
      code: this.code,
      envVars: this.envVars
    };
  }
}
