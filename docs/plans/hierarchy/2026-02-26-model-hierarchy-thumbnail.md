# 模型层级展开与 Inspector 缩略图预览 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在底部 Project 面板 Models 中为导入模型添加层级展开功能，并在 Inspector 面板底部新增可旋转的 3D 预览组件。

**Architecture:** 采用实时解析方案（无需后端改动）——使用 GLTFLoader 懒加载 GLB 文件提取节点树；Inspector 预览使用嵌入式 R3F Canvas（@react-three/fiber）加 OrbitControls 实现旋转。assetStore 新增 selectedNodePath 状态追踪当前预览的子节点路径。

**Tech Stack:** React + TypeScript, @react-three/fiber, @react-three/drei (useGLTF/OrbitControls), three.js GLTFLoader, Zustand (immer), Tailwind CSS

---

## 预备知识

### 关键文件
- `packages/client/src/stores/assetStore.ts` — Zustand 资产 store
- `packages/client/src/components/assets/AssetCard.tsx` — 通用资产卡片（不修改）
- `packages/client/src/components/panels/ProjectPanel.tsx` — 底部项目面板，Models 网格渲染入口
- `packages/client/src/components/panels/InspectorPanel.tsx` — 右侧检视面板
- `packages/client/src/features/scene/SceneRenderer.tsx` — 参考 ModelMesh 中 useGLTF 用法

### URL 构造
```typescript
// 获取资产下载 URL（需 withCredentials: true）
import { assetsApi } from '@/api/assets';
const url = assetsApi.getAssetDownloadUrl(asset.id);
// 若需 cache-buster（防止重导入后缓存问题）:
const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;
```

### 参考：SceneRenderer 中的 useGLTF 用法
```typescript
const { scene: gltfScene } = useGLTF(url, true, true, (loader) => {
  loader.setWithCredentials(true);
});
const clonedScene = useMemo(() => {
  const clone = gltfScene.clone(true);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m: THREE.Material) => m.clone());
      } else if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
    }
  });
  return clone;
}, [gltfScene]);
```

---

## Task 1: 扩展 assetStore —— 新增 selectedNodePath

**Files:**
- Modify: `packages/client/src/stores/assetStore.ts`

### Step 1: 在 AssetState interface 中新增字段和 action

在 `packages/client/src/stores/assetStore.ts` 的 `AssetState` interface 中添加：

```typescript
selectedNodePath: string | null;  // 新增：子节点路径，null = 选中整个模型
selectNode: (path: string | null) => void;  // 新增
```

### Step 2: 在 create(...) 的初始状态中新增

```typescript
selectedNodePath: null,
```

### Step 3: 在 create(...) 的 actions 中新增

```typescript
selectNode: (path: string | null) => {
  set({ selectedNodePath: path });
},
```

### Step 4: 修改 selectAsset action，选中新资产时重置 selectedNodePath

找到现有的 `selectAsset` action：
```typescript
selectAsset: (id: number | null) => {
  set({ selectedAssetId: id });
},
```
改为：
```typescript
selectAsset: (id: number | null) => {
  set({ selectedAssetId: id, selectedNodePath: null });
},
```

### Step 5: 运行单元测试确认 store 基础功能无损坏

```bash
pnpm --filter client test -- --run src/stores
```
Expected: 所有现有 store 测试通过

### Step 6: Commit

```bash
git add packages/client/src/stores/assetStore.ts
git commit -m "feat(assetStore): 新增 selectedNodePath 状态和 selectNode action"
```

---

## Task 2: 定义 ModelNode 类型 + buildNodeTree 工具函数

**Files:**
- Create: `packages/client/src/components/assets/modelHierarchy.ts`

### Step 1: 创建文件并实现

```typescript
// packages/client/src/components/assets/modelHierarchy.ts
import * as THREE from 'three';

export interface ModelNode {
  name: string;
  type: 'Mesh' | 'Group' | 'Object3D';
  path: string;  // 完整路径，如 "Root/Body/Wheel_L"
  children: ModelNode[];
}

/**
 * 从 Three.js Object3D 构建节点树，只保留 Mesh 和 Group 节点。
 * 跳过骨骼、灯光等辅助节点。
 */
export function buildNodeTree(
  obj: THREE.Object3D,
  parentPath = ''
): ModelNode[] {
  const nodes: ModelNode[] = [];

  for (const child of obj.children) {
    const isMesh = (child as THREE.Mesh).isMesh;
    const isGroup = child instanceof THREE.Group || child.type === 'Group';
    const isScene = child.type === 'Scene';

    if (!isMesh && !isGroup && !isScene) continue;

    const path = parentPath ? `${parentPath}/${child.name}` : child.name;
    const nodeType: ModelNode['type'] = isMesh ? 'Mesh' : 'Group';

    const node: ModelNode = {
      name: child.name || '(unnamed)',
      type: nodeType,
      path,
      children: buildNodeTree(child, path),
    };
    nodes.push(node);
  }

  return nodes;
}

/**
 * 按路径从 Object3D 树中找到目标节点。
 * 路径格式："Root/Body/Wheel_L"
 */
export function findNodeByPath(
  root: THREE.Object3D,
  path: string
): THREE.Object3D | null {
  const parts = path.split('/');
  let current: THREE.Object3D = root;

  for (const part of parts) {
    const found = current.children.find((c) => c.name === part);
    if (!found) return null;
    current = found;
  }

  return current;
}
```

### Step 2: 编写单元测试

创建 `packages/client/src/components/assets/modelHierarchy.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildNodeTree, findNodeByPath } from './modelHierarchy';

describe('buildNodeTree', () => {
  it('提取 Mesh 和 Group 节点', () => {
    const root = new THREE.Group();
    root.name = 'Root';
    const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    body.name = 'Body';
    root.add(body);

    const tree = buildNodeTree(root);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Body');
    expect(tree[0].type).toBe('Mesh');
    expect(tree[0].path).toBe('Body');
  });

  it('跳过非 Mesh/Group 节点', () => {
    const root = new THREE.Group();
    root.name = 'Root';
    const light = new THREE.DirectionalLight();
    light.name = 'Sun';
    root.add(light);

    const tree = buildNodeTree(root);
    expect(tree).toHaveLength(0);
  });

  it('生成正确的嵌套路径', () => {
    const root = new THREE.Group();
    const sub = new THREE.Group();
    sub.name = 'Body';
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.name = 'Wheel';
    sub.add(mesh);
    root.add(sub);

    const tree = buildNodeTree(root);
    expect(tree[0].children[0].path).toBe('Body/Wheel');
  });
});

describe('findNodeByPath', () => {
  it('按路径找到目标节点', () => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    body.name = 'Body';
    root.add(body);

    const found = findNodeByPath(root, 'Body');
    expect(found).toBe(body);
  });

  it('路径不存在时返回 null', () => {
    const root = new THREE.Group();
    expect(findNodeByPath(root, 'Missing')).toBeNull();
  });
});
```

### Step 3: 运行测试

```bash
pnpm --filter client test -- --run src/components/assets/modelHierarchy.test.ts
```
Expected: 5 tests PASS

### Step 4: Commit

```bash
git add packages/client/src/components/assets/modelHierarchy.ts \
        packages/client/src/components/assets/modelHierarchy.test.ts
git commit -m "feat: 添加 ModelNode 类型和 buildNodeTree 工具函数"
```

---

## Task 3: 创建 ModelHierarchyExpander 组件

**Files:**
- Create: `packages/client/src/components/assets/ModelHierarchyExpander.tsx`

此组件在 AssetCard 上方叠加一个展开按钮，展开时通过 GLTFLoader 懒加载模型并显示节点树（popover 形式）。

**不使用 useGLTF**（因为 useGLTF 依赖 R3F context），而是直接使用 `GLTFLoader`。

```typescript
// packages/client/src/components/assets/ModelHierarchyExpander.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clsx } from 'clsx';
import type { Asset } from '@digittwinedit/shared';
import { assetsApi } from '../../api/assets.js';
import { useAssetStore } from '../../stores/assetStore.js';
import { buildNodeTree, type ModelNode } from './modelHierarchy.js';

interface Props {
  asset: Asset;
}

export const ModelHierarchyExpander: React.FC<Props> = ({ asset }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nodeTree, setNodeTree] = useState<ModelNode[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectAsset = useAssetStore((s) => s.selectAsset);
  const selectNode = useAssetStore((s) => s.selectNode);

  // 懒加载节点树（只加载一次）
  const loadHierarchy = useCallback(() => {
    if (nodeTree !== null) return; // 已加载，不重复
    setIsLoading(true);
    const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;
    const loader = new GLTFLoader();
    loader.setWithCredentials(true);
    loader.load(
      url,
      (gltf) => {
        const tree = buildNodeTree(gltf.scene);
        setNodeTree(tree);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.error('[ModelHierarchyExpander] 加载失败:', err);
        setIsLoading(false);
        setNodeTree([]); // 空树防止重复加载
      }
    );
  }, [asset.id, asset.updated_at, nodeTree]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡到 AssetCard 的 onSelect
    if (!isExpanded) loadHierarchy();
    setIsExpanded((v) => !v);
  };

  const handleNodeClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    selectAsset(asset.id);
    selectNode(path);
  };

  // 点击外部时收起
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isExpanded]);

  const isEmpty = nodeTree !== null && nodeTree.length === 0;

  return (
    <div ref={containerRef} className="relative">
      {/* 展开按钮（叠加在图标角落，由父组件定位） */}
      <button
        className={clsx(
          'flex items-center justify-center w-4 h-4 rounded transition-colors',
          'bg-slate-700 hover:bg-primary text-slate-400 hover:text-white',
          isExpanded && 'bg-primary text-white'
        )}
        onClick={handleToggle}
        title="展开模型层级"
      >
        <span className="material-symbols-outlined text-[10px]">
          {isExpanded ? 'expand_more' : 'chevron_right'}
        </span>
      </button>

      {/* 节点树 Popover */}
      {isExpanded && (
        <div
          className={clsx(
            'absolute z-50 left-5 top-0 min-w-[180px] max-w-[260px]',
            'bg-[#1a1d26] border border-border-dark rounded shadow-xl',
            'text-xs text-slate-300 py-1'
          )}
        >
          {isLoading && (
            <div className="flex items-center space-x-2 px-3 py-2 text-slate-500">
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
              <span>加载层级...</span>
            </div>
          )}
          {isEmpty && (
            <div className="px-3 py-2 text-slate-500">无子节点</div>
          )}
          {nodeTree && nodeTree.length > 0 && (
            <NodeList nodes={nodeTree} depth={0} onNodeClick={handleNodeClick} />
          )}
        </div>
      )}
    </div>
  );
};

// 递归渲染节点列表
const NodeList: React.FC<{
  nodes: ModelNode[];
  depth: number;
  onNodeClick: (e: React.MouseEvent, path: string) => void;
}> = ({ nodes, depth, onNodeClick }) => {
  return (
    <>
      {nodes.map((node) => (
        <NodeItem key={node.path} node={node} depth={depth} onNodeClick={onNodeClick} />
      ))}
    </>
  );
};

const NodeItem: React.FC<{
  node: ModelNode;
  depth: number;
  onNodeClick: (e: React.MouseEvent, path: string) => void;
}> = ({ node, depth, onNodeClick }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const selectedNodePath = useAssetStore((s) => s.selectedNodePath);
  const isSelected = selectedNodePath === node.path;

  return (
    <>
      <div
        className={clsx(
          'flex items-center space-x-1 px-2 py-0.5 cursor-pointer',
          isSelected ? 'bg-primary/20 text-white' : 'hover:bg-slate-700/50'
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={(e) => onNodeClick(e, node.path)}
      >
        {hasChildren ? (
          <span
            className="material-symbols-outlined text-[10px] text-slate-500 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          >
            {open ? 'expand_more' : 'chevron_right'}
          </span>
        ) : (
          <span className="w-[10px] flex-shrink-0" />
        )}
        <span className="material-symbols-outlined text-[10px] text-slate-500 flex-shrink-0">
          {node.type === 'Mesh' ? 'deployed_code' : 'folder'}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && open && (
        <NodeList nodes={node.children} depth={depth + 1} onNodeClick={onNodeClick} />
      )}
    </>
  );
};
```

### Step 1: 创建上述文件

### Step 2: 手动测试（启动开发服务器验证）

```bash
pnpm dev:all
```

在浏览器中：登录 → 打开有模型资产的项目 → 切换到 Models 文件夹 → 验证展开按钮可见（但尚未集成到 AssetCard，此步骤只是确认文件编译无错误）

### Step 3: Commit

```bash
git add packages/client/src/components/assets/ModelHierarchyExpander.tsx
git commit -m "feat: 添加 ModelHierarchyExpander 组件（懒加载 GLB 节点树）"
```

---

## Task 4: 在 ProjectPanel 中集成 ModelHierarchyExpander

**Files:**
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx`

### Step 1: 在 ProjectPanel 顶部新增 import

```typescript
import { ModelHierarchyExpander } from '../assets/ModelHierarchyExpander.js';
```

### Step 2: 修改 onSelect 回调，同时重置 selectedNodePath

找到现有代码：
```tsx
onSelect={() => {
  selectAsset(asset.id);
  clearSelection();
}}
```

修改为：
```tsx
onSelect={() => {
  selectAsset(asset.id); // selectAsset 内部已重置 selectedNodePath
  clearSelection();
}}
```
（因为 Task 1 中已修改 `selectAsset` 自动重置 selectedNodePath，此处无需额外修改。）

### Step 3: 在 AssetCard 渲染位置叠加展开按钮

找到现有的资产网格渲染：
```tsx
<div className="grid grid-cols-10 gap-4 content-start">
  {displayAssets.map((asset) => (
    <AssetCard
      key={asset.id}
      asset={asset}
      selected={selectedAssetId === asset.id}
      onSelect={() => {
        selectAsset(asset.id);
        clearSelection();
      }}
      onOpen={() => handleAssetOpen(asset.id)}
      onRename={(name) => handleAssetRename(asset.id, name)}
      onDelete={() => handleDeleteAsset(asset.id)}
      onDragStart={(e) => handleAssetDragStart(e, asset.id)}
    />
  ))}
</div>
```

改为：
```tsx
<div className="grid grid-cols-10 gap-4 content-start">
  {displayAssets.map((asset) => (
    <div key={asset.id} className="relative">
      <AssetCard
        asset={asset}
        selected={selectedAssetId === asset.id}
        onSelect={() => {
          selectAsset(asset.id);
          clearSelection();
        }}
        onOpen={() => handleAssetOpen(asset.id)}
        onRename={(name) => handleAssetRename(asset.id, name)}
        onDelete={() => handleDeleteAsset(asset.id)}
        onDragStart={(e) => handleAssetDragStart(e, asset.id)}
      />
      {/* 仅 model 类型显示层级展开按钮 */}
      {asset.type === 'model' && selectedFolder === 'models' && (
        <div className="absolute top-0 right-0 z-10">
          <ModelHierarchyExpander asset={asset} />
        </div>
      )}
    </div>
  ))}
</div>
```

同时，在 `ProjectPanel` 顶部从 assetStore 补充解构 `selectNode`（如需用到）：
```typescript
const { selectNode } = useAssetStore();
```

### Step 4: 手动测试

```bash
pnpm dev:all
```

验证：
- [ ] Models 文件夹下每个模型卡片右上角显示展开箭头
- [ ] 点击箭头触发 GLB 加载，显示 loading 动画
- [ ] 加载完成后显示节点树 popover
- [ ] 点击节点，popover 不消失，节点高亮
- [ ] 点击 popover 外部，popover 收起
- [ ] 再次点击箭头，缓存节点树（不重新加载）

### Step 5: Commit

```bash
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat(ProjectPanel): 集成 ModelHierarchyExpander 展开模型层级"
```

---

## Task 5: 创建 ModelPreview 组件（R3F Canvas + OrbitControls）

**Files:**
- Create: `packages/client/src/components/inspector/ModelPreview.tsx`

此组件在 Inspector 面板中显示模型或子节点的 3D 预览，支持鼠标拖拽旋转。

```typescript
// packages/client/src/components/inspector/ModelPreview.tsx
import React, { useMemo, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset } from '@digittwinedit/shared';
import { assetsApi } from '../../api/assets.js';
import { findNodeByPath } from '../assets/modelHierarchy.js';

interface ModelPreviewProps {
  asset: Asset;
  nodePath: string | null; // null = 显示整个模型
}

export const ModelPreview: React.FC<ModelPreviewProps> = ({ asset, nodePath }) => {
  const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;

  return (
    <div className="w-full border-b border-border-dark pb-3 mb-3">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          预览
        </span>
        {nodePath && (
          <span
            className="text-[9px] text-slate-600 truncate max-w-[140px]"
            title={nodePath}
          >
            {nodePath}
          </span>
        )}
      </div>
      <div className="w-full h-[180px] rounded overflow-hidden bg-[#0c0e14] border border-border-dark">
        <Canvas
          frameloop="demand"
          camera={{ fov: 45, near: 0.01, far: 1000 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <directionalLight position={[-2, -1, -2]} intensity={0.3} />
          <Suspense fallback={null}>
            <PreviewScene url={url} nodePath={nodePath} />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            makeDefault
          />
        </Canvas>
      </div>
      <p className="text-[9px] text-slate-600 text-center mt-1">左键拖拽旋转</p>
    </div>
  );
};

// ---- 内部组件（必须在 Canvas 内部使用）----

interface PreviewSceneProps {
  url: string;
  nodePath: string | null;
}

function PreviewScene({ url, nodePath }: PreviewSceneProps) {
  const { scene: gltfScene } = useGLTF(url, true, true, (loader) => {
    loader.setWithCredentials(true);
  });
  const { camera, invalidate } = useThree();

  // 克隆场景并独立材质（与 SceneRenderer 中的 ModelMesh 保持一致）
  const clonedScene = useMemo(() => {
    const cloned = gltfScene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m: THREE.Material) => m.clone());
        } else if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return cloned;
  }, [gltfScene]);

  // 根据 nodePath 决定显示哪个节点（null = 整体）
  const displayObject = useMemo(() => {
    if (!nodePath) return clonedScene;
    const found = findNodeByPath(clonedScene, nodePath);
    return found ?? clonedScene;
  }, [clonedScene, nodePath]);

  // 自动调整相机到包围盒
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(displayObject);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim === 0) return;

    const perspCamera = camera as THREE.PerspectiveCamera;
    const fovRad = (perspCamera.fov * Math.PI) / 180;
    const dist = (maxDim / 2) / Math.tan(fovRad / 2);

    camera.position.set(
      center.x + maxDim * 0.3,
      center.y + maxDim * 0.3,
      center.z + dist * 1.6
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    invalidate();
  }, [displayObject, camera, invalidate]);

  // 卸载时释放克隆材质
  useEffect(() => {
    return () => {
      clonedScene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m: THREE.Material) => m?.dispose());
        }
      });
    };
  }, [clonedScene]);

  return <primitive object={displayObject} />;
}
```

### Step 1: 创建上述文件

### Step 2: Commit

```bash
git add packages/client/src/components/inspector/ModelPreview.tsx
git commit -m "feat: 添加 ModelPreview 组件（R3F Canvas + OrbitControls 可旋转预览）"
```

---

## Task 6: 在 InspectorPanel 中集成 ModelPreview

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`

### Step 1: 新增 import

```typescript
import { ModelPreview } from '../inspector/ModelPreview.js';
```

同时补充 assetStore 的 selectedNodePath：
```typescript
const selectedNodePath = useAssetStore((state) => state.selectedNodePath);
```

### Step 2: 在资产检视模式下插入 ModelPreview

找到现有代码（在 `!activeId` 分支中）：
```tsx
{selectedAsset ? (
  /* 资产检视模式 */
  <div className="flex-1 overflow-y-auto custom-scrollbar">
    {/* 资产头部 */}
    <div className="p-4 border-b border-border-dark bg-header-dark/50">
      ...
    </div>

    {/* 资产属性内容 */}
    <div className="p-4">
      <ModelImportProp ... />
    </div>
  </div>
) : (
```

在"资产属性内容"的 `<div className="p-4">` **之前**（即资产头部下方）插入：
```tsx
{/* 模型 3D 预览（仅 model 类型） */}
{selectedAsset.type === 'model' && (
  <div className="px-4 pt-3">
    <ModelPreview asset={selectedAsset} nodePath={selectedNodePath} />
  </div>
)}
```

完整结构变为：
```tsx
{selectedAsset ? (
  <div className="flex-1 overflow-y-auto custom-scrollbar">
    {/* 资产头部 */}
    <div className="p-4 border-b border-border-dark bg-header-dark/50">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5">
          <span className="material-symbols-outlined text-primary text-base">deployed_code</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-medium truncate">{selectedAsset.name}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {selectedAsset.type} · {(selectedAsset.file_size / 1024).toFixed(0)} KB
          </p>
        </div>
      </div>
    </div>

    {/* 模型 3D 预览（仅 model 类型） */}
    {selectedAsset.type === 'model' && (
      <div className="px-4 pt-3">
        <ModelPreview asset={selectedAsset} nodePath={selectedNodePath} />
      </div>
    )}

    {/* 资产属性内容 */}
    <div className="p-4">
      <ModelImportProp
        asset={selectedAsset}
        projectId={selectedAsset.project_id}
        onReimportComplete={() => {}}
      />
    </div>
  </div>
) : (
```

### Step 3: 手动端到端测试

```bash
pnpm dev:all
```

验证以下场景：

**场景 A：点击模型资产卡片（不展开层级）**
- [ ] Inspector 右侧资产头部下方出现 ModelPreview 预览区域（高度 180px）
- [ ] 预览加载模型（有短暂 Suspense 空白，然后显示模型）
- [ ] 鼠标左键在预览区域拖拽，模型可旋转
- [ ] 提示文字"左键拖拽旋转"可见
- [ ] 点击其他非模型资产（如纹理），预览区域不显示

**场景 B：展开层级后点击子节点**
- [ ] 展开模型层级 popover
- [ ] 点击一个子节点（如 "Body"）
- [ ] Inspector 预览显示该子节点，并在标题旁显示路径（如 "Root/Body"）
- [ ] 相机自动聚焦到该子节点的包围盒
- [ ] 旋转功能仍正常

**场景 C：切换资产后预览更新**
- [ ] 点击模型 A → 预览显示模型 A
- [ ] 点击模型 B → 预览更新为模型 B，selectedNodePath 重置为 null（显示整个模型 B）

### Step 4: Commit

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(InspectorPanel): 集成 ModelPreview，在资产检视模式下显示 3D 预览"
```

---

## Task 7: 最终检查和收尾

### Step 1: 运行所有单元测试

```bash
pnpm --filter client test -- --run
```
Expected: 所有测试通过（包括 modelHierarchy.test.ts 的 5 个用例）

### Step 2: TypeScript 类型检查

```bash
pnpm --filter client build
```
Expected: 无类型错误

### Step 3: 检查控制台错误

在浏览器开发者工具中验证：
- [ ] 无 `useGLTF` 相关 context 错误
- [ ] 无 Three.js dispose 警告
- [ ] 无 CORS/身份验证错误（GLTFLoader 的 withCredentials 正确设置）

### Step 4: 最终 Commit（如有遗漏文件）

```bash
git status
git add <任何遗漏的文件>
git commit -m "feat: 完成模型层级展开与 Inspector 3D 缩略图预览功能"
```

---

## 注意事项

1. **withCredentials**: GLTFLoader 和 useGLTF 都需要 `setWithCredentials(true)`，否则跨端口请求会 401
2. **cache-buster URL**: 使用 `?v=<timestamp>` 避免重导入后 useGLTF 缓存旧模型
3. **frameloop="demand"**: ModelPreview 的 Canvas 使用按需渲染，避免空转消耗 GPU
4. **OrbitControls enableZoom/Pan false**: 预览区域只允许旋转，防止误操作
5. **材质克隆**: 必须克隆材质以防修改 useGLTF 缓存中的共享材质实例
