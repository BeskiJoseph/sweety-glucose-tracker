const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { authRateLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// Registration: POST /api/auth/register
router.post('/register', authController.register);

// Login: POST /api/auth/login (with brute-force rate limiter)
router.post('/login', authRateLimiter, authController.login);

// Session verification: GET /api/auth/me (protected)
router.get('/me', requireAuth, authController.getMe);

// Logout: POST /api/auth/logout
router.post('/logout', authController.logout);

module.exports = router;
