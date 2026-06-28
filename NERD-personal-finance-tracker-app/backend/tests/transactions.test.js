import request from 'supertest';
import express from 'express';
import store from '../src/store/inMemory.js';
import authRoutes from '../src/routes/auth.js';
import transactionRoutes from '../src/routes/transactions.js';
import summaryRoutes from '../src/routes/summary.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { generateToken } from '../src/middleware/auth.js';

// Setup test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);
app.use(errorHandler);

// Test data
let testUserId;
let testToken;
let transactionId;

describe('Personal Finance Tracker API', () => {
  beforeEach(() => {
    store.reset();
  });

  // ==================== Authentication Tests ====================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('token');
      expect(response.body.username).toBe('testuser');
      testUserId = response.body.id;
      testToken = response.body.token;
    });

    it('should reject registration with missing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 6 characters');
    });

    it('should reject duplicate username registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      testUserId = response.body.id;
      testToken = response.body.token;
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.id).toBe(testUserId);
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ==================== Transaction Tests ====================
  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      testUserId = registerResponse.body.id;
      testToken = registerResponse.body.token;

      // Add test transactions
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 50,
          category: 'food',
          description: 'Lunch',
          date: '2026-06-27'
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'income',
          amount: 1000,
          category: 'salary',
          description: 'Monthly salary',
          date: '2026-06-25'
        });
    });

    it('should get all transactions for authenticated user', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should filter transactions by type', async () => {
      const response = await request(app)
        .get('/api/transactions?type=expense')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].type).toBe('expense');
    });

    it('should filter transactions by category', async () => {
      const response = await request(app)
        .get('/api/transactions?category=salary')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].category).toBe('salary');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid type filter', async () => {
      const response = await request(app)
        .get('/api/transactions?type=invalid')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/transactions', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      testToken = response.body.token;
    });

    it('should create a transaction successfully', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 45.50,
          category: 'food',
          description: 'Lunch',
          date: '2026-06-27'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('expense');
      expect(response.body.amount).toBe(45.50);
      expect(response.body.userId).toBe(response.body.userId);
      transactionId = response.body.id;
    });

    it('should reject transaction with missing type', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 50,
          category: 'food',
          date: '2026-06-27'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Type');
    });

    it('should reject transaction with invalid type', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'invalid',
          amount: 50,
          category: 'food',
          date: '2026-06-27'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('income');
    });

    it('should reject transaction with invalid amount', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: -50,
          category: 'food',
          date: '2026-06-27'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positive');
    });

    it('should reject transaction with missing category', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 50,
          date: '2026-06-27'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Category');
    });

    it('should reject transaction without authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'expense',
          amount: 50,
          category: 'food',
          date: '2026-06-27'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/transactions/:id', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      testToken = registerResponse.body.token;

      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 50,
          category: 'food',
          description: 'Lunch',
          date: '2026-06-27'
        });

      transactionId = transactionResponse.body.id;
    });

    it('should get a transaction by id', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(transactionId);
      expect(response.body.category).toBe('food');
    });

    it('should reject get request with invalid transaction id', async () => {
      const response = await request(app)
        .get('/api/transactions/invalid-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Not found');
    });

    it('should reject get request without authentication', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transactionId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/transactions/:id', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      testToken = registerResponse.body.token;

      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 50,
          category: 'food',
          description: 'Lunch',
          date: '2026-06-27'
        });

      transactionId = transactionResponse.body.id;
    });

    it('should update a transaction', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 75,
          category: 'restaurant'
        });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(75);
      expect(response.body.category).toBe('restaurant');
    });

    it('should reject update with invalid amount', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: -50
        });

      expect(response.status).toBe(400);
    });

    it('should reject update with invalid type', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'invalid'
        });

      expect(response.status).toBe(400);
    });

    it('should reject update for non-existent transaction', async () => {
      const response = await request(app)
        .put('/api/transactions/invalid-id')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 100
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      testToken = registerResponse.body.token;

      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 50,
          category: 'food',
          description: 'Lunch',
          date: '2026-06-27'
        });

      transactionId = transactionResponse.body.id;
    });

    it('should delete a transaction', async () => {
      const response = await request(app)
        .delete(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      const getResponse = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject delete for non-existent transaction', async () => {
      const response = await request(app)
        .delete('/api/transactions/invalid-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/transactions/${transactionId}`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== Summary Tests ====================
  describe('GET /api/summary', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      testToken = registerResponse.body.token;

      // Add transactions
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'income',
          amount: 1000,
          category: 'salary',
          description: 'Monthly salary',
          date: '2026-06-25'
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 300,
          category: 'food',
          description: 'Groceries',
          date: '2026-06-26'
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'expense',
          amount: 200,
          category: 'utilities',
          description: 'Electricity',
          date: '2026-06-27'
        });
    });

    it('should get financial summary', async () => {
      const response = await request(app)
        .get('/api/summary')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalIncome).toBe(1000);
      expect(response.body.totalExpenses).toBe(500);
      expect(response.body.balance).toBe(500);
      expect(response.body.byCategory.salary).toBe(1000);
      expect(response.body.byCategory.food).toBe(300);
      expect(response.body.byCategory.utilities).toBe(200);
    });

    it('should reject summary request without authentication', async () => {
      const response = await request(app)
        .get('/api/summary');

      expect(response.status).toBe(401);
    });

    it('should return zero totals for new user with no transactions', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'password123'
        });

      const response = await request(app)
        .get('/api/summary')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalIncome).toBe(0);
      expect(response.body.totalExpenses).toBe(0);
      expect(response.body.balance).toBe(0);
    });
  });
});
