/**
 * @fileoverview Express Server Setup
 * 
 * Single Responsibility: Configure and manage Express server
 * 
 * @module orchestrator-server/server/express-server
 */

import express from 'express';
import cors from 'cors';

/**
 * Create and configure Express app
 * @returns {Object} Express app
 */
export function createApp() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  return app;
}

/**
 * Start the server
 * @param {Object} app - Express app
 * @param {number} port - Port to listen on
 * @returns {Promise<Object>} HTTP server
 */
export function startServer(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) reject(err);
      else resolve(server);
    });
  });
}
