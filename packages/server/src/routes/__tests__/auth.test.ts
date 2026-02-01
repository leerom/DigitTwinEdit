import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import authRoutes from '../../routes/auth';
import { AuthService } from '../../services/authService';

// Mock AuthService
jest.mock('../../services/authService');

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Simple session for testing
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );

    app.use('/api/auth', authRoutes);

    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      (AuthService.register as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'Test123!',
          email: 'test@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual(mockUser);
    });

    it('should reject invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // Too short
          password: 'Test123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: '123', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      (AuthService.login as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual(mockUser);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid username or password')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user', async () => {
      const agent = request.agent(app);

      // First login
      const mockUser = { id: 1, username: 'testuser' };
      (AuthService.login as jest.Mock).mockResolvedValue(mockUser);

      await agent.post('/api/auth/login').send({
        username: 'testuser',
        password: 'Test123!',
      });

      // Then logout
      const response = await agent.post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user if authenticated', async () => {
      const agent = request.agent(app);
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };

      (AuthService.login as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      // Login first
      await agent.post('/api/auth/login').send({
        username: 'testuser',
        password: 'Test123!',
      });

      // Get current user
      const response = await agent.get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual(mockUser);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
