import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// 模拟数据
let users = [];
let projects = [];
let assets = [];
let sessions = new Map();
let assetIdCounter = 1;
let projectIdCounter = 1;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Session模拟
let currentUser = null;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok (mock)', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;

  const user = {
    id: users.length + 1,
    username,
    email,
    created_at: new Date().toISOString(),
  };

  users.push(user);
  currentUser = user;

  res.status(201).json({
    success: true,
    user,
    message: 'User registered successfully (mock)',
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;

  let user = users.find(u => u.username === username);
  if (!user) {
    user = { id: 1, username, email: 'mock@example.com' };
    users.push(user);
  }

  currentUser = user;

  res.json({
    success: true,
    user,
    message: 'Login successful (mock)',
  });
});

app.get('/api/auth/check', (req, res) => {
  if (currentUser) {
    res.json({
      success: true,
      authenticated: true,
      user: currentUser,
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

// Project routes
app.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    projects,
  });
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;

  const project = {
    id: projectIdCounter++,
    name,
    description,
    owner_id: currentUser?.id || 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scenes: [],
  };

  projects.push(project);

  res.status(201).json({
    success: true,
    project,
    message: 'Project created (mock)',
  });
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.find(p => p.id === parseInt(req.params.id));

  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  res.json({
    success: true,
    project,
  });
});

// Asset routes
app.post('/api/projects/:projectId/assets/upload', (req, res) => {
  const projectId = parseInt(req.params.projectId);

  // 模拟文件上传
  setTimeout(() => {
    const asset = {
      id: assetIdCounter++,
      project_id: projectId,
      name: 'mock-model.glb',
      type: 'model',
      file_path: `/uploads/projects/${projectId}/models/mock-model.glb`,
      file_size: 123456,
      mime_type: 'application/octet-stream',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assets.push(asset);

    res.status(201).json({
      success: true,
      asset,
      message: 'Asset uploaded (mock)',
    });
  }, 500); // 模拟上传延迟
});

app.get('/api/projects/:projectId/assets', (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const type = req.query.type;

  let projectAssets = assets.filter(a => a.project_id === projectId);

  if (type) {
    projectAssets = projectAssets.filter(a => a.type === type);
  }

  res.json({
    success: true,
    assets: projectAssets,
  });
});

app.get('/api/projects/:projectId/assets/stats', (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const projectAssets = assets.filter(a => a.project_id === projectId);

  const stats = {
    total: projectAssets.length,
    models: projectAssets.filter(a => a.type === 'model').length,
    materials: projectAssets.filter(a => a.type === 'material').length,
    textures: projectAssets.filter(a => a.type === 'texture').length,
    totalSize: projectAssets.reduce((sum, a) => sum + a.file_size, 0),
  };

  res.json({
    success: true,
    stats,
  });
});

app.delete('/api/assets/:id', (req, res) => {
  const assetId = parseInt(req.params.id);
  const index = assets.findIndex(a => a.id === assetId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Asset not found' });
  }

  assets.splice(index, 1);

  res.json({
    success: true,
    message: 'Asset deleted (mock)',
  });
});

// Scene routes
app.get('/api/projects/:projectId/scenes/active', (req, res) => {
  // 返回空场景
  res.json({
    success: true,
    scene: null,
  });
});

app.listen(PORT, () => {
  console.log('🎭 Mock API Server running on http://localhost:3001');
  console.log('📝 Mode: Mock (no database required)');
  console.log('🔒 CORS origin: http://localhost:5173');
  console.log('');
  console.log('⚠️  This is a MOCK server for testing UI only');
  console.log('    Real data will not be persisted');
  console.log('');
  console.log('✅ You can now test:');
  console.log('   - User registration/login');
  console.log('   - Project creation');
  console.log('   - Asset upload UI');
  console.log('   - Asset list display');
  console.log('   - Asset deletion');
});
