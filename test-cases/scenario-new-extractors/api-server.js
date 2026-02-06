/**
 * API Server - Express routes
 * Tests: route-extractor, route-connections
 */

const express = require('express');
const app = express();

// Route 1: GET /api/users
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

// Route 2: POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'abc123' });
});

// Route 3: GET /api/users/:id (with param)
app.get('/api/users/:id', (req, res) => {
  res.json({ user: { id: req.params.id } });
});

app.listen(3000);
