/**
 * @fileoverview Route Builder - Builder for creating route test code
 */

export class RouteBuilder {
  constructor() {
    this.code = '';
    this.routes = { server: [], client: [], all: [] };
  }

  /**
   * Create Express server route
   * @param {string} method - HTTP method (get, post, put, etc.)
   * @param {string} path - Route path
   */
  withServerRoute(method = 'get', path = '/api/users') {
    this.code += `
app.${method}('${path}', (req, res) => {
  res.json({ message: 'success' });
});
`;
    const line = this.code.split('\n').length - 3;
    this.routes.server.push({ method: method.toUpperCase(), route: path, line, type: 'server' });
    this.routes.all.push({ route: path, line, type: 'server', method: method.toUpperCase() });
    return this;
  }

  /**
   * Create Express router route
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   */
  withRouterRoute(method = 'get', path = '/api/items') {
    this.code += `
router.${method}('${path}', controller.handleRequest);
`;
    const line = this.code.split('\n').length - 2;
    this.routes.server.push({ method: method.toUpperCase(), route: path, line, type: 'server' });
    this.routes.all.push({ route: path, line, type: 'server', method: method.toUpperCase() });
    return this;
  }

  /**
   * Create fetch call (client route)
   * @param {string} path - API path
   */
  withFetchCall(path = '/api/users') {
    this.code += `
fetch('${path}')
  .then(res => res.json())
  .then(data => console.log(data));
`;
    const line = this.code.split('\n').length - 3;
    this.routes.client.push({ route: path, line, type: 'client' });
    this.routes.all.push({ route: path, line, type: 'client' });
    return this;
  }

  /**
   * Create axios call (client route)
   * @param {string} method - HTTP method
   * @param {string} path - API path
   */
  withAxiosCall(method = 'get', path = '/api/users') {
    this.code += `
axios.${method}('${path}')
  .then(res => console.log(res.data));
`;
    const line = this.code.split('\n').length - 2;
    this.routes.client.push({ route: path, line, type: 'client' });
    this.routes.all.push({ route: path, line, type: 'client' });
    return this;
  }

  /**
   * Create template literal fetch with variables
   * @param {string} basePath - Base API path
   */
  withTemplateFetch(basePath = '/api/users') {
    this.code += `
fetch(\`${basePath}/\${userId}\`)
  .then(res => res.json());
`;
    const line = this.code.split('\n').length - 2;
    this.routes.client.push({ route: `${basePath}/\${userId}`, line, type: 'client' });
    this.routes.all.push({ route: `${basePath}/\${userId}`, line, type: 'client' });
    return this;
  }

  /**
   * Create multiple server routes
   * @param {Array<{method: string, path: string}>} routes
   */
  withMultipleServerRoutes(routes = [
    { method: 'get', path: '/api/users' },
    { method: 'post', path: '/api/users' },
    { method: 'put', path: '/api/users/:id' }
  ]) {
    routes.forEach(({ method, path }) => {
      this.withServerRoute(method, path);
    });
    return this;
  }

  /**
   * Create API client with multiple endpoints
   */
  withAPIClient() {
    return this
      .withFetchCall('/api/users')
      .withFetchCall('/api/posts')
      .withAxiosCall('post', '/api/login')
      .withAxiosCall('get', '/api/profile');
  }

  /**
   * Create full Express app
   */
  withExpressApp() {
    return this
      .withServerRoute('get', '/api/users')
      .withServerRoute('post', '/api/users')
      .withServerRoute('get', '/api/users/:id')
      .withServerRoute('put', '/api/users/:id')
      .withServerRoute('delete', '/api/users/:id');
  }

  build() {
    return {
      code: this.code,
      routes: this.routes
    };
  }
}
