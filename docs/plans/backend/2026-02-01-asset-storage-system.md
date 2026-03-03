# 场景文件存储与资产管理系统实施计划

> **与后端认证系统的关系**: 本计划与 `docs/plans/2026-01-31-backend-auth-system.md` 协同工作。
> - 后端计划负责: 用户认证、项目/场景元数据管理(PostgreSQL)、基础API服务
> - **本计划负责**: 服务器端资产文件存储、材质序列化、资产上传下载API、前端资产管理UI
> - 两者结合: 场景数据(JSON)存储在数据库JSONB字段,资产文件存储在服务器文件系统,通过API路径引用关联

## 1. 需求理解

### 核心需求
1. **服务器端文件存储** - 在服务器上为每个项目创建独立的资产目录
2. **素材上传下载** - 前端可上传三维模型、贴图等资产文件到服务器
3. **场景资产引用** - 场景JSON中引用服务器资产的API路径
4. **材质文件管理** - 材质描述文件(.mat.json)存储在服务器并可独立管理
5. **资产元数据管理** - 数据库存储资产的元信息(名称、类型、路径、大小等)

### 目标架构

```
┌──────────────────────────────────────────────────────────────┐
│                    完整系统架构图                               │
├──────────────────────────────────────────────────────────────┤
│ 前端 (packages/client)                                        │
│   ├─ SceneStore (场景对象树、编辑状态)                          │
│   ├─ ProjectStore (项目元数据、场景列表) ← 后端API              │
│   └─ AssetStore (资产列表、上传进度) ← 本计划新增               │
├──────────────────────────────────────────────────────────────┤
│ 后端 (packages/server)                                        │
│   ├─ PostgreSQL                                               │
│   │   ├─ projects 表                                          │
│   │   ├─ scenes 表(data JSONB字段存储场景)                     │
│   │   └─ assets 表 ← 本计划新增                               │
│   ├─ 文件系统                                                  │
│   │   ├─ /uploads/projects/{projectId}/models/               │
│   │   ├─ /uploads/projects/{projectId}/materials/            │
│   │   ├─ /uploads/projects/{projectId}/textures/             │
│   │   └─ /public/thumbnails/{assetId}.jpg                     │
│   └─ API服务                                                   │
│       ├─ POST   /api/projects/:id/assets/upload              │
│       ├─ GET    /api/projects/:id/assets                     │
│       ├─ GET    /api/assets/:id/download                     │
│       ├─ DELETE /api/assets/:id                              │
│       ├─ GET/PUT/DELETE /api/materials/:id                   │
│       └─ POST   /api/assets/:id/thumbnail                    │
└──────────────────────────────────────────────────────────────┘
```

### 服务器端目录结构
```
/uploads/projects/{projectId}/
├── models/
│   ├── building_a.glb
│   ├── equipment_01.fbx
│   └── ...
├── materials/
│   ├── metal_rough.mat.json
│   ├── glass_clear.mat.json
│   └── ...
└── textures/
    ├── floor_diffuse.png
    ├── wall_normal.jpg
    └── ...

/public/thumbnails/
    ├── asset_123.jpg
    └── ...
```

## 2. 数据库设计

### 新增 `assets` 表
```sql
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL,       -- 'model', 'material', 'texture'
  file_path TEXT NOT NULL,          -- projects/{projectId}/models/xxx.glb
  file_size BIGINT,
  mime_type VARCHAR(100),
  thumbnail_path TEXT,
  metadata JSONB,                   -- {format: 'glb', vertices: 1000, ...}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_project_type ON assets(project_id, type);
```

### `scenes.data` 字段中的资产引用
```json
{
  "id": "scene-uuid",
  "name": "Scene1",
  "objects": {
    "obj-1": {
      "type": "Mesh",
      "components": {
        "mesh": {
          "assetId": "asset-ref-1",
          "materialId": "mat-ref-1"
        }
      }
    }
  },
  "assets": {
    "asset-ref-1": {
      "id": "asset-ref-1",
      "name": "building.glb",
      "type": "model",
      "path": "/api/assets/123/download",
      "assetDbId": 123,
      "thumbnail": "/thumbnails/asset_123.jpg"
    }
  },
  "materials": {
    "mat-ref-1": {
      "id": "mat-ref-1",
      "name": "Metal Rough",
      "path": "/api/materials/456",
      "materialDbId": 456
    }
  }
}
```

## 3. 后端实现 (packages/server)

### 3.1 新增文件

**`packages/server/src/models/Asset.ts`** - 资产数据模型
```typescript
export interface Asset {
  id: number;
  project_id: number;
  name: string;
  type: 'model' | 'material' | 'texture';
  file_path: string;
  file_size: number;
  mime_type: string;
  thumbnail_path?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class AssetModel {
  static async create(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<Asset>;
  static async findByProject(projectId: number, type?: string): Promise<Asset[]>;
  static async findById(id: number): Promise<Asset | null>;
  static async delete(id: number): Promise<void>;
}
```

**`packages/server/src/services/assetService.ts`** - 资产业务逻辑
```typescript
export class AssetService {
  // 上传资产文件
  async uploadAsset(
    projectId: number,
    file: Express.Multer.File,
    type: 'model' | 'texture'
  ): Promise<Asset>;

  // 获取项目的所有资产
  async getProjectAssets(projectId: number, type?: string): Promise<Asset[]>;

  // 删除资产
  async deleteAsset(assetId: number): Promise<void>;

  // 生成缩略图
  async generateThumbnail(assetId: number): Promise<string>;
}
```

**`packages/server/src/services/materialService.ts`** - 材质管理服务
```typescript
export class MaterialService {
  // 创建材质描述文件
  async createMaterial(projectId: number, materialData: MaterialAsset): Promise<Asset>;

  // 获取材质
  async getMaterial(materialId: number): Promise<MaterialAsset>;

  // 更新材质
  async updateMaterial(materialId: number, materialData: Partial<MaterialAsset>): Promise<void>;

  // 删除材质
  async deleteMaterial(materialId: number): Promise<void>;
}
```

**`packages/server/src/routes/assets.ts`** - 资产路由
```typescript
router.post('/projects/:projectId/assets/upload',
  authMiddleware,
  upload.single('file'),
  async (req, res) => { /* 上传资产 */ }
);

router.get('/projects/:projectId/assets',
  authMiddleware,
  async (req, res) => { /* 获取项目资产列表 */ }
);

router.get('/assets/:id/download',
  authMiddleware,
  async (req, res) => { /* 下载资产文件 */ }
);

router.delete('/assets/:id',
  authMiddleware,
  async (req, res) => { /* 删除资产 */ }
);

router.post('/assets/:id/thumbnail',
  authMiddleware,
  async (req, res) => { /* 生成缩略图 */ }
);
```

**`packages/server/src/routes/materials.ts`** - 材质路由
```typescript
router.post('/projects/:projectId/materials',
  authMiddleware,
  async (req, res) => { /* 创建材质 */ }
);

router.get('/materials/:id',
  authMiddleware,
  async (req, res) => { /* 获取材质 */ }
);

router.put('/materials/:id',
  authMiddleware,
  async (req, res) => { /* 更新材质 */ }
);

router.delete('/materials/:id',
  authMiddleware,
  async (req, res) => { /* 删除材质 */ }
);
```

**`packages/server/src/utils/fileStorage.ts`** - 文件存储工具
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileStorage {
  private uploadsDir = process.env.UPLOADS_DIR || './uploads';

  // 保存上传的文件
  async saveFile(
    projectId: number,
    type: 'models' | 'materials' | 'textures',
    file: Express.Multer.File
  ): Promise<string>;

  // 读取文件
  async readFile(filePath: string): Promise<Buffer>;

  // 删除文件
  async deleteFile(filePath: string): Promise<void>;

  // 确保目录存在
  async ensureDir(dirPath: string): Promise<void>;
}
```

### 3.2 文件上传配置

**`packages/server/src/middleware/upload.ts`** - Multer配置
```typescript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.params.projectId;
    const type = req.body.type || 'models';
    const uploadPath = path.join(
      process.env.UPLOADS_DIR || './uploads',
      `projects/${projectId}/${type}`
    );
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024  // 100MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream',  // GLB
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});
```

## 4. 前端实现 (packages/client)

### 4.1 类型定义扩展

**`packages/shared/src/types/asset.ts`** (共享类型)
```typescript
export interface Asset {
  id: number;
  project_id: number;
  name: string;
  type: 'model' | 'material' | 'texture';
  file_path: string;
  file_size: number;
  mime_type: string;
  thumbnail_path?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MaterialAsset {
  id: string;
  name: string;
  type: MaterialType;
  properties: Record<string, unknown>;
  textureReferences?: Record<string, number>;  // 贴图asset ID
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}
```

### 4.2 资产管理Store

**`packages/client/src/stores/assetStore.ts`** (新建)
```typescript
interface AssetState {
  assets: Asset[];
  isLoading: boolean;
  uploadProgress: Record<string, UploadProgress>;

  loadAssets: (projectId: number, type?: string) => Promise<void>;
  uploadAsset: (projectId: number, file: File, type: 'model' | 'texture') => Promise<Asset>;
  deleteAsset: (assetId: number) => Promise<void>;
  getAssetUrl: (assetId: number) => string;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  isLoading: false,
  uploadProgress: {},

  loadAssets: async (projectId, type) => {
    set({ isLoading: true });
    const params = type ? `?type=${type}` : '';
    const res = await apiClient.get(`/projects/${projectId}/assets${params}`);
    set({ assets: res.data, isLoading: false });
  },

  uploadAsset: async (projectId, file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await apiClient.post(
      `/projects/${projectId}/assets/upload`,
      formData,
      {
        onUploadProgress: (e) => {
          const percent = (e.loaded / e.total) * 100;
          set((state) => ({
            uploadProgress: {
              ...state.uploadProgress,
              [file.name]: { percent, loaded: e.loaded, total: e.total }
            }
          }));
        }
      }
    );

    // 刷新资产列表
    await get().loadAssets(projectId);
    return res.data;
  },

  deleteAsset: async (assetId) => {
    await apiClient.delete(`/assets/${assetId}`);
    set((state) => ({
      assets: state.assets.filter(a => a.id !== assetId)
    }));
  },

  getAssetUrl: (assetId) => {
    return `${API_BASE_URL}/assets/${assetId}/download`;
  }
}));
```

### 4.3 材质序列化服务

**`packages/shared/src/services/MaterialSerializer.ts`** (新建)
```typescript
import * as THREE from 'three';

export class MaterialSerializer {
  // 序列化材质为JSON
  static serialize(material: THREE.Material): MaterialAsset {
    const type = material.type as MaterialType;
    const properties: Record<string, unknown> = {};
    const textureReferences: Record<string, number> = {};

    // 提取材质属性
    if (material instanceof THREE.MeshStandardMaterial) {
      properties.color = material.color.getHexString();
      properties.metalness = material.metalness;
      properties.roughness = material.roughness;
      properties.transparent = material.transparent;
      properties.opacity = material.opacity;

      // 提取贴图引用
      if (material.map) {
        textureReferences.map = material.map.userData.assetId;
      }
      if (material.normalMap) {
        textureReferences.normalMap = material.normalMap.userData.assetId;
      }
      // ... 其他贴图
    }

    return {
      id: uuidv4(),
      name: material.name || 'Material',
      type,
      properties,
      textureReferences,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // 反序列化JSON为材质
  static async deserialize(data: MaterialAsset, assetStore: AssetStore): Promise<THREE.Material> {
    let material: THREE.Material;

    switch (data.type) {
      case 'MeshStandardMaterial':
        material = new THREE.MeshStandardMaterial();
        Object.assign(material, data.properties);

        // 加载贴图
        if (data.textureReferences?.map) {
          const url = assetStore.getAssetUrl(data.textureReferences.map);
          material.map = await new THREE.TextureLoader().loadAsync(url);
        }
        break;

      // 其他材质类型...
    }

    material.name = data.name;
    return material;
  }
}
```

### 4.4 ProjectPanel 资产管理UI

**`packages/client/src/components/panels/ProjectPanel.tsx`** (重大修改)
```typescript
export const ProjectPanel: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { assets, loadAssets, uploadAsset, deleteAsset } = useAssetStore();
  const [selectedFolder, setSelectedFolder] = useState<'models' | 'materials' | 'textures'>('models');

  useEffect(() => {
    if (currentProject) {
      loadAssets(currentProject.id, selectedFolder);
    }
  }, [currentProject, selectedFolder]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentProject) return;

    for (const file of Array.from(files)) {
      await uploadAsset(currentProject.id, file, selectedFolder === 'models' ? 'model' : 'texture');
    }
  };

  const handleDragAssetToScene = (asset: Asset) => {
    // 将资产拖拽到场景中
    const { addObject } = useSceneStore.getState();
    // 创建Mesh对象引用该资产
  };

  return (
    <div className="flex flex-col h-full">
      {/* 左侧文件夹树 */}
      <aside className="w-64 border-r">
        <FolderItem
          name="Models"
          selected={selectedFolder === 'models'}
          onClick={() => setSelectedFolder('models')}
        />
        <FolderItem
          name="Materials"
          selected={selectedFolder === 'materials'}
          onClick={() => setSelectedFolder('materials')}
        />
        <FolderItem
          name="Textures"
          selected={selectedFolder === 'textures'}
          onClick={() => setSelectedFolder('textures')}
        />
      </aside>

      {/* 右侧资产网格 */}
      <div className="flex-1 p-4">
        {/* 上传按钮 */}
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          accept={selectedFolder === 'models' ? '.glb,.gltf,.fbx' : '.png,.jpg,.jpeg'}
        />

        {/* 资产网格 */}
        <div className="grid grid-cols-10 gap-4">
          {assets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDrag={() => handleDragAssetToScene(asset)}
              onDelete={() => deleteAsset(asset.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

## 5. 场景保存/加载集成

### 5.1 修改 SceneManager

**`packages/client/src/features/scene/services/SceneManager.ts`** (修改)
```typescript
export class SceneManager {
  // 保存场景时,提取材质并上传
  static async saveSceneWithAssets(scene: Scene, projectId: number): Promise<void> {
    const { uploadAsset } = useAssetStore.getState();
    const materialAssets: Record<string, number> = {};

    // 遍历场景对象,提取材质
    for (const obj of Object.values(scene.objects)) {
      if (obj.components?.mesh?.material) {
        const materialData = MaterialSerializer.serialize(obj.components.mesh.material);

        // 创建材质资产
        const asset = await uploadAsset(
          projectId,
          new Blob([JSON.stringify(materialData)], { type: 'application/json' }),
          'material'
        );

        materialAssets[obj.components.mesh.materialId] = asset.id;
      }
    }

    // 更新场景中的材质引用
    scene.materials = Object.entries(materialAssets).reduce((acc, [refId, assetId]) => {
      acc[refId] = {
        id: refId,
        path: `/api/materials/${assetId}`,
        materialDbId: assetId
      };
      return acc;
    }, {} as Record<string, any>);

    // 调用后端API保存场景
    await apiClient.put(`/projects/${projectId}/scenes/${scene.id}`, scene);
  }
}
```

### 5.2 修改 SceneLoader

**`packages/client/src/features/scene/services/SceneLoader.ts`** (修改)
```typescript
export class SceneLoader {
  async loadSceneWithAssets(sceneData: Scene): Promise<Scene> {
    const { getAssetUrl } = useAssetStore.getState();

    // 加载资产
    for (const assetRef of Object.values(sceneData.assets)) {
      if (assetRef.assetDbId) {
        // 解析API路径
        assetRef.path = getAssetUrl(assetRef.assetDbId);
      }
    }

    // 加载材质
    for (const materialRef of Object.values(sceneData.materials || {})) {
      if (materialRef.materialDbId) {
        const materialData = await apiClient.get(`/materials/${materialRef.materialDbId}`);
        // 反序列化材质
        const material = await MaterialSerializer.deserialize(materialData, useAssetStore.getState());
        // 缓存材质
      }
    }

    return sceneData;
  }
}
```

## 6. 实施步骤

### Phase 1: 数据库与后端服务 (3-4天)

**任务**:
1. 创建 `assets` 表迁移脚本
2. 实现 `Asset` 模型和服务
3. 实现 `MaterialService`
4. 配置 Multer 文件上传
5. 实现资产上传/下载API路由
6. 实现材质管理API路由

**关键文件**:
- `packages/server/migrations/002_create_assets_table.sql` - 新建
- `packages/server/src/models/Asset.ts` - 新建
- `packages/server/src/services/assetService.ts` - 新建
- `packages/server/src/services/materialService.ts` - 新建
- `packages/server/src/middleware/upload.ts` - 新建
- `packages/server/src/routes/assets.ts` - 新建
- `packages/server/src/routes/materials.ts` - 新建
- `packages/server/src/utils/fileStorage.ts` - 新建

### Phase 2: 共享类型与材质序列化 (2天)

**任务**:
1. 定义 `Asset` 和 `MaterialAsset` 类型
2. 实现 `MaterialSerializer` 服务
3. 扩展 `Scene` 类型添加 `materials` 字段

**关键文件**:
- `packages/shared/src/types/asset.ts` - 新建
- `packages/shared/src/services/MaterialSerializer.ts` - 新建
- `packages/shared/src/types/scene.ts` - 修改

### Phase 3: 前端资产管理 (3-4天)

**任务**:
1. 创建 `AssetStore`
2. 实现资产上传/下载服务
3. 重构 `ProjectPanel` 显示资产列表
4. 实现资产拖拽到场景功能
5. 实现上传进度显示

**关键文件**:
- `packages/client/src/stores/assetStore.ts` - 新建
- `packages/client/src/components/panels/ProjectPanel.tsx` - 重大修改
- `packages/client/src/components/assets/AssetCard.tsx` - 新建
- `packages/client/src/components/assets/UploadProgress.tsx` - 新建

### Phase 4: 场景保存/加载集成 (2-3天)

**任务**:
1. 修改 `SceneManager` 支持资产提取
2. 修改 `SceneLoader` 支持资产加载
3. 实现材质自动保存/加载
4. 更新自动保存逻辑

**关键文件**:
- `packages/client/src/features/scene/services/SceneManager.ts` - 修改
- `packages/client/src/features/scene/services/SceneLoader.ts` - 修改

### Phase 5: 测试与优化 (2-3天)

**任务**:
1. 单元测试(后端服务、材质序列化)
2. E2E测试(完整上传/下载流程)
3. 文件上传性能优化
4. 大文件分块上传(可选)

## 7. 验证计划

### 7.1 功能测试

**测试场景 1: 上传模型资产**
```
1. 登录并打开项目
2. 在 Project Panel 选择 "Models" 文件夹
3. 点击上传,选择 .glb 文件
4. 验证上传进度显示
5. 验证文件保存到服务器 /uploads/projects/{id}/models/
6. 验证数据库 assets 表新增记录
7. 验证资产卡片显示在网格中
```

**测试场景 2: 拖拽资产到场景**
```
1. 从 Project Panel 拖拽模型资产到 Scene View
2. 验证场景中创建 Mesh 对象
3. 验证 Mesh 引用正确的 assetId
4. 验证模型正确加载和显示
```

**测试场景 3: 材质保存与加载**
```
1. 在场景中选择一个对象
2. 在 Inspector 修改材质属性(颜色、金属度等)
3. 场景自动保存
4. 验证材质描述文件保存到 /uploads/projects/{id}/materials/
5. 验证 assets 表记录材质元数据
6. 刷新页面重新加载场景
7. 验证材质属性正确恢复
```

**测试场景 4: 删除资产**
```
1. 在 Project Panel 选择一个资产
2. 点击删除按钮
3. 验证文件从服务器删除
4. 验证数据库记录删除
5. 验证资产列表更新
```

### 7.2 API测试

```bash
# 上传模型
curl -X POST http://localhost:3001/api/projects/1/assets/upload \
  -H "Cookie: connect.sid=xxx" \
  -F "file=@building.glb" \
  -F "type=model"

# 获取项目资产
curl -X GET http://localhost:3001/api/projects/1/assets?type=model \
  -H "Cookie: connect.sid=xxx"

# 下载资产
curl -X GET http://localhost:3001/api/assets/123/download \
  -H "Cookie: connect.sid=xxx" \
  -o downloaded.glb

# 创建材质
curl -X POST http://localhost:3001/api/projects/1/materials \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=xxx" \
  -d @material.json

# 获取材质
curl -X GET http://localhost:3001/api/materials/456 \
  -H "Cookie: connect.sid=xxx"
```

## 8. 关键挑战与解决方案

### 8.1 大文件上传性能
**挑战**: 100MB+ 模型文件上传可能超时或占用大量内存

**解决方案**:
- 设置合理的超时时间(Express timeout: 5分钟)
- 使用流式处理,避免将整个文件加载到内存
- 可选: 实现分块上传(multipart upload)
- 显示上传进度条提升用户体验

### 8.2 并发上传控制
**挑战**: 用户同时上传多个大文件可能导致服务器压力

**解决方案**:
- 前端限制并发上传数(如最多3个)
- 后端实现请求队列和限流
- 使用后台任务处理缩略图生成

### 8.3 资产路径安全
**挑战**: 防止路径遍历攻击(如 `../../etc/passwd`)

**解决方案**:
- 严格验证文件路径,仅允许访问 `/uploads/projects/{projectId}/` 下的文件
- 使用 `path.normalize()` 和 `path.join()` 安全构造路径
- 验证用户权限,仅允许访问自己项目的资产

### 8.4 材质贴图引用完整性
**挑战**: 材质可能引用多个贴图,需确保所有贴图都已上传

**解决方案**:
- 材质保存时,检查所有贴图的 assetId 是否有效
- 加载材质时,若贴图缺失则使用占位符纹理
- 提供批量上传功能(材质 + 所有贴图)

## 9. 依赖包

### 后端新增
```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0"  // 缩略图生成
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

### 前端无需新增
已有依赖足够(axios, zustand等)

## 10. 后续扩展

### 短期
- 资产预览(3D模型、贴图)
- 批量上传/删除
- 资产搜索和过滤
- 资产使用情况追踪(哪些场景使用了该资产)

### 中期
- CDN加速资产加载
- 资产版本管理
- 资产共享(跨项目)
- 压缩贴图优化加载速度

### 长期
- 资产转码服务(FBX→GLB)
- 自动LOD生成
- 资产协作标注

## 11. 总结

本计划在后端认证系统基础上,添加完整的服务器端资产存储与管理功能:

**核心特性**:
- ✅ 服务器端文件存储(按项目隔离)
- ✅ 资产上传/下载API
- ✅ 材质序列化为JSON
- ✅ 数据库资产元数据管理
- ✅ 前端资产管理UI(ProjectPanel)
- ✅ 场景与资产的完整关联

**预计开发时间**: 12-15 工作日

**关键里程碑**:
- ✅ Phase 1 完成 → 后端API可用
- ✅ Phase 2 完成 → 材质序列化可用
- ✅ Phase 3 完成 → 前端资产管理可用
- ✅ Phase 4 完成 → 场景集成完成
- ✅ Phase 5 完成 → 生产就绪

**与后端认证系统的协作**:
- 依赖后端的 `projects` 和 `scenes` 表
- 复用后端的认证中间件
- 扩展后端API路由(新增 `/assets` 和 `/materials` 端点)
- 前端集成到现有的 EditorPage 和 ProjectPanel
