/**
 * API Client - Consumes server routes
 * Tests: route-extractor, route-connections
 * Expected: shared-route connections with api-server.js
 */

import axios from 'axios';

// Fetch users (matches api-server.js GET /api/users)
async function getUsers() {
  const response = await fetch('/api/users');
  return response.json();
}

// Login (matches api-server.js POST /api/auth/login)
async function login(username, password) {
  const response = await axios.post('/api/auth/login', { username, password });
  return response.data;
}

// Get user by ID (matches api-server.js GET /api/users/:id)
async function getUserById(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

export { getUsers, login, getUserById };
