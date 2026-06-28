import express from 'express';
import bcrypt from 'bcrypt';
import store from '../store/inMemory.js';
import { generateToken } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      throw new ValidationError('Username is required and must be a non-empty string');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new ValidationError('Password is required and must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = store.getUserByUsername(username);
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = store.createUser(username, passwordHash);

    // Generate token
    const token = generateToken(user.id, user.username);

    res.status(201).json({
      id: user.id,
      username: user.username,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new ValidationError('Password is required');
    }

    // Find user
    const user = store.getUserByUsername(username);
    if (!user) {
      throw new ValidationError('Invalid username or password');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new ValidationError('Invalid username or password');
    }

    // Generate token
    const token = generateToken(user.id, user.username);

    res.status(200).json({
      id: user.id,
      username: user.username,
      token
    });
  } catch (error) {
    next(error);
  }
});

export default router;
