import express from 'express';
import { logout } from '../../controllers/auth/logout.js';
import { authenticateToken } from '../../middleware/index.js';

const router = express.Router();

// User logout endpoint
router.post('/', authenticateToken, logout);

export default router; 