
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目架构概述

本项目采用 **Monorepo** 架构（pnpm workspace），包含前端、后端和共享类型包：

```
digittwinedit/
├── packages/
│   ├── client/          # 前端应用（React + Vite + TypeScript）
│   ├── server/          # 后端API服务（Node.js + Express + PostgreSQL）
│   └── shared/          # 共享类型定义和工具
├── pnpm-workspace.yaml
└── package.json
```

### 技术栈

**前端（client）**:
- 框架: Vite + React + TypeScript (ESM)
- 3D 渲染: @react-three/fiber + Three.js
- 状态管理: Zustand（sceneStore 使用 immer 中间件）
- 路由: React Router DOM v6
- HTTP 客户端: Axios + React Query
- 测试: Vitest（单元/组件）+ Playwright（E2E）

**后端（server）**:
- 运行时: Node.js + TypeScript
- 框架: Express
- 数据库: PostgreSQL
- 认证: Session + Cookie（connect-pg-simple）
- 密码加密: bcryptjs

---

## 常用命令

> 项目使用 pnpm 作为包管理器。所有命令在项目根目录执行。

### 安装依赖

```bash
pnpm install
```

### 本地开发

```bash
pnpm dev             # 仅启动前端（http://localhost:5173）
pnpm dev:server      # 仅启动后端（http://localhost:3001）
pnpm dev:all         # 并行启动前端 + 后端
```

### 生产构建

```bash
pnpm build           # 构建顺序: shared → server → client
pnpm preview         # 预览构建产物
```

### 运行测试

```bash
# 前端单元测试（Vitest）
pnpm test                                         # 所有包
pnpm --filter client test                         # 仅前端
pnpm --filter client test -- --run src/stores/sceneStore.test.ts  # 单个文件
pnpm --filter client test -- --run -t "描述文字"  # 匹配测试名称
pnpm test:ui                                      # Vitest UI 模式
pnpm coverage                                     # 覆盖率报告

# 后端测试（Jest）
pnpm --filter server test
pnpm --filter server test:watch
pnpm --filter server test:coverage

# E2E 测试（Playwright）
pnpm --filter client test:e2e
npx playwright test --ui                          # UI 模式
```

> **测试配置**:
> - Vitest 配置: `packages/client/vite.config.ts:14`（使用 jsdom，排除 `tests/e2e/**`）
> - Playwright 配置: `packages/client/playwright.config.ts`
> - E2E 测试目录: `packages/client/tests/e2e`

---

## 数据库配置

### PostgreSQL 准备

```bash
createdb digittwinedit
psql digittwinedit < packages/server/migrations/001_initial.sql
```

环境变量（`packages/server/.env`）：
```env
DATABASE_URL=postgresql://username:password@localhost:5432/digittwinedit
SESSION_SECRET=your-random-secret-key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
UPLOADS_DIR=./uploads
```

### 数据库表结构

- **users**: 用户表（username, password_hash, email）
- **projects**: 项目表（name, description, owner_id, thumbnail）
- **scenes**: 场景表（project_id, name, data[JSONB], is_active）
- **session**: Session 存储表（sid, sess, expire）
- 迁移脚本: `packages/server/migrations/`

---

## API 端点

基础路径: `/api`

```
POST/GET/PUT/DELETE  /api/auth/{register|login|logout|me}
GET/POST/PUT/DELETE  /api/projects/:id
GET/POST/PUT/DELETE  /api/projects/:projectId/scenes/:id
PUT                  /api/projects/:projectId/scenes/:id/activate
GET/POST/DELETE      /api/assets/:id
GET/POST/PUT/DELETE  /api/materials/:id
```

---

## 代码结构与运行时架构

### 包结构说明

- **入口文件**: `packages/client/src/main.tsx` → `App.tsx`
- **路径别名**: `@/*` → `packages/client/src/*`（`tsconfig.json:24` + `vite.config.ts:9`）
- **路由**: `/login`（LoginPage）、`/editor/:projectId`（EditorPage，受保护）、`/`（重定向）

---

### 前端应用架构

#### 整体布局

- 组合式编辑器布局：`packages/client/src/features/editor/EditorPage.tsx`
- `MainLayout` 管理整体区域（顶部/左侧层级/中间 SceneView/右侧 Inspector/底部 Project）：`packages/client/src/components/layout/MainLayout.tsx:13`

#### Scene View（3D 视口）

- 视口入口：`packages/client/src/components/viewport/SceneView.tsx:23`
  - 基于 `@react-three/fiber` 的 `<Canvas>`；场景内容：`packages/client/src/features/scene/SceneRenderer.tsx`
  - 叠加层 UI（渲染模式/工具栏）：`packages/client/src/components/viewport/ViewportOverlay.tsx`
  - 相机系统（轨道/Fly 导航）：`packages/client/src/features/editor/navigation/CameraSystem.tsx`
  - 工具 Gizmo：`packages/client/src/features/editor/tools/ActiveToolGizmo.tsx`
  - 视图 Gizmo：`packages/client/src/components/viewport/ViewGizmo.tsx`

#### SceneRenderer 渲染架构

`SceneRenderer.tsx` 中 `ObjectRenderer` 组件负责每个场景对象的渲染，区分两类 Mesh：

- **基础几何体**（box/sphere/plane 等）：`object.components.mesh.geometry` 存储类型，通过 `materialRef.current`（`THREE.Material`）渲染，wireframe 由 `resolveWireframeOverride(renderMode, materialSpec)` 驱动
- **GLTF/GLB 模型**：`object.components.model.assetId` 存储资产 ID，通过 `ModelMesh` 组件 + `useGLTF` 加载，cloneScene 后材质独立管理；renderMode 变化时通过 `useEffect` 遍历所有子网格材质设置 wireframe

`RenderMode = 'shaded' | 'wireframe' | 'hybrid'` 存储在 `editorStore.renderMode`，`hybrid` 模式额外渲染 `<lineSegments>` 边线。

#### 状态管理（Zustand）

| Store | 位置 | 核心职责 |
|-------|------|---------|
| `useSceneStore` | `stores/sceneStore.ts` | 场景数据模型（对象树、isDirty、导入进度）；**使用 immer 中间件**，actions 内可直接 mutate state |
| `useEditorStore` | `stores/editorStore.ts` | 交互状态（activeTool、selectedIds、renderMode、navigationMode、activeSubNodePath、renamingId、viewMode） |
| `useHistoryStore` | `stores/historyStore.ts` | 命令模式撤销/重做；`execute(cmd)` 入栈，支持 `cmd.merge()` 合并连续操作 |
| `useProjectStore` | `stores/projectStore.ts` | 项目/场景列表、currentScene、autoSaveScene() |
| `useAuthStore` | `stores/authStore.ts` | 认证状态（user、isAuthenticated、login/logout/checkAuth） |
| `useAssetStore` | `stores/assetStore.ts` | 资产列表缓存，供 Inspector 和 SceneRenderer 查找 assetId/updated_at；selectedAssetId/selectedNodePath 供 Inspector 展示资产属性 |
| `useMaterialStore` | `stores/materialStore.ts` | 材质资产列表、selectedMaterialId、previewSpec；CRUD 操作对接 materialsApi |
| `useLayoutStore` | `stores/layoutStore.ts` | 面板可见性/尺寸（sidebarLeft/Right/bottomPanel）；仅支持 dark 主题 |

#### 场景数据模型（SceneObject）

```typescript
// packages/client/src/types/index.ts
interface SceneObject {
  id: string; name: string; type: ObjectType;  // GROUP/MESH/LIGHT/CAMERA/TWIN
  parentId: string | null; children: string[];
  visible: boolean; locked: boolean;
  // GROUP 对象在顶层存储渲染属性（MESH 同名字段在 MeshComponent 内）
  castShadow?: boolean; receiveShadow?: boolean;
  frustumCulled?: boolean; renderOrder?: number;
  transform: { position, rotation, scale }; // Vector3 = [number,number,number]
  components?: {
    mesh?: {                                       // 基础几何体 MESH 使用
      geometry?: 'box'|'sphere'|'plane'|'cylinder'|'torus'|'capsule';
      material?: MaterialSpec;                    // Inspector 材质覆盖（序列化存储）
      castShadow?: boolean; receiveShadow?: boolean;
      frustumCulled?: boolean; renderOrder?: number;
      materialAssetId?: number;                  // 绑定的材质资产 DB ID
    };
    model?: { assetId: number; path?: string;    // GLTF/GLB 模型使用（独立 key，非 mesh 子项）
              nodeOverrides?: Record<string, { material?: MaterialSpec; transform?: ... }> };
    light?: { color, intensity, type, castShadow?, range?, angle? };
    camera?: { fov, near, far, orthographic };
    twin?: { externalId, dataSource, status };
  };
}
```

**关键点**：GLTF/GLB 模型存储在 `components.model`，基础几何体存储在 `components.mesh.geometry`。两者互斥，同一对象不会同时有 `components.model` 和 `components.mesh.geometry`。`components.mesh.material` 用于对象级材质覆盖，两类对象都可使用。

`Scene.objects` 是以 id 为 key 的扁平字典，通过 `parentId/children` 维护树形层级，根节点固定为 `'root'`。

#### 命令系统（Undo/Redo）

实现 `Command` 接口（`features/editor/commands/Command.ts`）：
```typescript
interface Command {
  name: string;
  execute: () => void;
  undo: () => void;
  merge?: (next: Command) => boolean;  // 用于合并连续操作（如拖拽）
}
```
调用 `useHistoryStore.getState().execute(cmd)` 执行并入栈。

#### 键盘快捷键系统

- 注册表：`packages/client/src/features/editor/shortcuts/shortcutRegistry.ts`
- 快捷键格式：`'Ctrl+KeyZ'`、`'Delete'`、`'KeyW'` 等，值为 `{ action, params, priority, requiresSelection? }`
- 内置快捷键：Q/W/E/R/Y（工具切换）、F（聚焦对象）、F2（重命名）、Delete（删除确认）、Ctrl+D（复制）、Ctrl+Z/Y（撤销/重做）
- 执行器：`packages/client/src/features/editor/shortcuts/executeShortcut.ts`

#### FBX 导入管线

位置：`packages/client/src/features/fbx/`

流程：FBXImportDialog（UI）→ FBXImporter（协调器）→ fbxWorker（Web Worker，FBX→GLB 转换）→ assetsApi.upload（上传 FBX+GLB）→ sceneStore.addAssetToScene（加入场景）

- Worker 超时：60 秒；文件大小限制：500MB
- 导入配置：`FBXImportSettings`（scale/convertUnits/normals/saveFormat/embedTextures）
- 进度通过 `sceneStore.importProgress` 广播，`ImportProgress.percentage` 0–100

#### 纹理导入管线

位置：`packages/client/src/features/textures/`

流程：TextureImportDialog（UI）→ textureWorker（Web Worker，PNG/JPG→KTX2 压缩转换）→ assetsApi.upload（上传原图 + KTX2）

- 支持两种压缩模式：`ETC1S`（文件小）/ `UASTC`（质量高）
- 配置：`TextureConvertSettings`（generateMipmaps/potResize/quality/colorSpace/compressionMode）
- KTX2 资产的 `metadata.sourceTextureAssetId` 指向原始 PNG 资产（用于缩略图）
- Inspector 中通过 `TexturePicker` 组件将纹理资产绑定到材质属性

#### 材质系统

- `MaterialSpec.type`：`MeshStandardMaterial`（默认）| `MeshBasicMaterial` | `MeshLambertMaterial` | `MeshPhongMaterial` | `MeshPhysicalMaterial`
- 工厂函数：`packages/client/src/features/materials/materialFactory.ts` → `createThreeMaterial(spec)`
- Inspector 修改材质通过 `UpdateMaterialPropsCommand` / `ChangeMaterialTypeCommand` 走命令系统
- 材质资产（独立持久化）通过 `BindMaterialAssetCommand` 绑定到 `MeshComponent.materialAssetId`；`sceneStore.syncMaterialAsset()` 将资产 spec 同步到引用该资产的所有对象

#### Inspector Panel 模式

`InspectorPanel`（`components/panels/InspectorPanel.tsx`）有三种显示模式：
1. **对象检视**：`editorStore.activeId` 有值时，显示 Transform/MeshProp/MaterialProp/LightProp 等（依对象类型）
2. **资产检视**：`assetStore.selectedAssetId` 有值时，显示 ModelImportProp / TextureImportProp + 底部 3D 预览
3. **材质资产检视**：`materialStore.selectedMaterialId` 有值时，显示 MaterialAssetProp + 底部 MaterialPreview

#### 自动保存机制

`packages/client/src/features/scene/hooks/useAutoSave.ts` 监听 `sceneStore.isDirty`，1秒防抖后调用 API 保存到服务器。

---

### 后端应用架构

- 入口：`packages/server/src/app.ts`
- 认证中间件：`middleware/auth.ts` → `requireAuth`（自动注入 `req.user`）
- 分层：`routes/` → `services/`（业务逻辑）→ `models/`（DB 查询）

---

## 需求与规划文档

- 原始需求：`rawRequirements/`（SceneView功能需求.md、三维场景编辑器功能需求.md 等）
- 实施计划 & 变更记录：`docs/plans/`（按日期命名）

---

## 已知环境/配置备注

- **TS 路径别名** `@/*` 仅在 `packages/client` 生效；IDE 可能报路径未解析错误，不影响 Vite 运行时
- **环境变量**：前端 `packages/client/.env.development`（API 地址），后端 `packages/server/.env`（DB/Session）
- **后端** 使用 `tsx watch`（开发）/ `node dist/app.js`（生产）

---

## 快速故障排查

### 登录失败
1. 确认后端运行：`GET http://localhost:3001/health` → `{"status":"ok"}`
2. 检查浏览器控制台 CORS 错误
3. 检查 session 表：`psql digittwinedit -c "\dt session"`

### 场景保存失败
1. 确认用户已登录（`/api/auth/me` 有返回）
2. 场景数据建议 < 10MB
