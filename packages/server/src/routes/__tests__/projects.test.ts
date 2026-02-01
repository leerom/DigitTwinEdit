import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import projectRoutes from '../../routes/projects';
import { ProjectService } from '../../services/projectService';
import { requireAuth } from '../../middleware/auth';

// Mock services
jest.mock('../../services/projectService');
jest.mock('../../middleware/auth');

describe('Project Routes', () => {
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

    // Mock auth middleware to set userId
    (requireAuth as jest.Mock).mockImplementation((req, res, next) => {
      req.session.userId = 1;
      next();
    });

    app.use('/api/projects', projectRoutes);

    jest.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('should return user projects', async () => {
      const mockProjects = [
        { id: 1, name: 'Project 1', owner_id: 1 },
        { id: 2, name: 'Project 2', owner_id: 1 },
      ];

      (ProjectService.getUserProjects as jest.Mock).mockResolvedValue(mockProjects);

      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.projects).toHaveLength(2);
      expect(ProjectService.getUserProjects).toHaveBeenCalledWith(1);
    });

    it('should return empty array if no projects', async () => {
      (ProjectService.getUserProjects as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual([]);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const mockProject = {
        id: 1,
        name: 'New Project',
        description: 'Test project',
        owner_id: 1,
      };

      (ProjectService.createProject as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'New Project',
          description: 'Test project',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.project).toEqual(mockProject);
    });

    it('should reject project without name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          description: 'Test project',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project with scenes', async () => {
      const mockProject = {
        id: 1,
        name: 'Project 1',
        owner_id: 1,
        scenes: [
          { id: 1, name: 'Scene 1', is_active: true },
          { id: 2, name: 'Scene 2', is_active: false },
        ],
      };

      (ProjectService.getProjectWithScenes as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).get('/api/projects/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.project).toEqual(mockProject);
      expect(response.body.project.scenes).toHaveLength(2);
    });

    it('should return 404 if project not found', async () => {
      (ProjectService.getProjectWithScenes as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/projects/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const mockProject = {
        id: 1,
        name: 'Updated Project',
        description: 'Updated description',
        owner_id: 1,
      };

      (ProjectService.updateProject as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app)
        .put('/api/projects/1')
        .send({
          name: 'Updated Project',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.project.name).toBe('Updated Project');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      (ProjectService.deleteProject as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/api/projects/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(ProjectService.deleteProject).toHaveBeenCalledWith(1, 1);
    });
  });
});
