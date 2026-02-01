import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import sceneRoutes from '../../routes/scenes';
import { SceneService } from '../../services/sceneService';
import { requireAuth } from '../../middleware/auth';

// Mock services
jest.mock('../../services/sceneService');
jest.mock('../../middleware/auth');

describe('Scene Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      })
    );

    // Mock auth middleware
    (requireAuth as jest.Mock).mockImplementation((req, res, next) => {
      req.session.userId = 1;
      next();
    });

    app.use('/api/projects/:projectId/scenes', sceneRoutes);

    jest.clearAllMocks();
  });

  describe('GET /api/projects/:projectId/scenes', () => {
    it('should return project scenes', async () => {
      const mockScenes = [
        { id: 1, name: 'Scene 1', project_id: 1, is_active: true },
        { id: 2, name: 'Scene 2', project_id: 1, is_active: false },
      ];

      (SceneService.getProjectScenes as jest.Mock).mockResolvedValue(mockScenes);

      const response = await request(app).get('/api/projects/1/scenes');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scenes).toHaveLength(2);
    });
  });

  describe('GET /api/projects/:projectId/scenes/active', () => {
    it('should return active scene', async () => {
      const mockScene = {
        id: 1,
        name: 'Active Scene',
        project_id: 1,
        is_active: true,
        data: { objects: {} },
      };

      (SceneService.getActiveScene as jest.Mock).mockResolvedValue(mockScene);

      const response = await request(app).get('/api/projects/1/scenes/active');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scene.is_active).toBe(true);
    });

    it('should return 404 if no active scene', async () => {
      (SceneService.getActiveScene as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/projects/1/scenes/active');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/projects/:projectId/scenes', () => {
    it('should create a new scene', async () => {
      const mockScene = {
        id: 1,
        name: 'New Scene',
        project_id: 1,
        data: { objects: {} },
      };

      (SceneService.createScene as jest.Mock).mockResolvedValue(mockScene);

      const response = await request(app)
        .post('/api/projects/1/scenes')
        .send({
          name: 'New Scene',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.scene.name).toBe('New Scene');
    });
  });

  describe('PUT /api/projects/:projectId/scenes/:id', () => {
    it('should update scene data', async () => {
      const mockScene = {
        id: 1,
        name: 'Updated Scene',
        project_id: 1,
        data: { objects: { obj1: {} } },
      };

      (SceneService.updateScene as jest.Mock).mockResolvedValue(mockScene);

      const response = await request(app)
        .put('/api/projects/1/scenes/1')
        .send({
          name: 'Updated Scene',
          data: { objects: { obj1: {} } },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scene.name).toBe('Updated Scene');
    });
  });

  describe('PUT /api/projects/:projectId/scenes/:id/activate', () => {
    it('should activate a scene', async () => {
      const mockScene = {
        id: 2,
        name: 'Scene 2',
        project_id: 1,
        is_active: true,
        data: {},
      };

      (SceneService.setActiveScene as jest.Mock).mockResolvedValue(mockScene);

      const response = await request(app)
        .put('/api/projects/1/scenes/2/activate');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scene.is_active).toBe(true);
    });
  });

  describe('DELETE /api/projects/:projectId/scenes/:id', () => {
    it('should delete a scene', async () => {
      (SceneService.deleteScene as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/api/projects/1/scenes/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(SceneService.deleteScene).toHaveBeenCalledWith(1, 1, 1);
    });
  });
});
