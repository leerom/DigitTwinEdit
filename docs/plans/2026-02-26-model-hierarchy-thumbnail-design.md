# 设计文档：模型层级展开 + Inspector 缩略图预览

**日期：** 2026-02-26
**状态：** 已批准

---

## 背景

底部 Project 面板的 Models 文件夹中，当前仅以平铺卡片形式显示导入后的模型资产，缺少以下能力：
1. 查看模型内部的节点层级结构（如 Root > Body > Wheel_L）
2. 在 Inspector 面板预览选中的模型或子节点，并支持旋转交互

---

## 功能1：模型层级展开

### 交互流程

1. 在 Models 文件夹下，`AssetCard` 右下角新增一个 `chevron_right` 展开箭头按钮（仅 model 类型资产显示）
2. 用户点击展开箭头，触发懒加载：调用 `useGLTF` 加载对应 GLB 文件，遍历 `scene` 提取节点树
3. 节点列表以缩进形式在卡片下方（或弹出面板中）展开，显示每个节点的名称和类型图标
4. 点击子节点可选中，触发 Inspector 预览（见功能2）
5. 再次点击箭头收起层级列表

### 数据结构

```typescript
interface ModelNode {
  name: string;
  type: 'Mesh' | 'Group' | 'Object3D';
  path: string;          // 唯一路径，如 "Root/Body/Wheel_L"
  children: ModelNode[];
}
```

### 技术要点

- **懒加载**：只在用户首次点击展开时触发 `useGLTF`，R3F 内置缓存确保多次展开不重复加载
- **节点过滤**：只展示 `THREE.Mesh` 和 `THREE.Group`，跳过灯光、骨骼等辅助节点
- **组件**：新建 `ModelHierarchyExpander` 组件，内部管理展开状态和节点树

### 层级展示 UI 草图

```
┌─────────────────────────────────────┐
│ [模型图标] model-name.glb  [▶展开]   │  ← AssetCard（收起状态）
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [模型图标] model-name.glb  [▼收起]   │  ← AssetCard（展开状态）
│   ├─ [Group]  Root                  │
│   │   ├─ [Mesh]  Body               │
│   │   ├─ [Mesh]  Wheel_L            │
│   │   └─ [Mesh]  Wheel_R            │
└─────────────────────────────────────┘
```

---

## 功能2：Inspector 3D 缩略图预览

### 触发条件

- 用户在 ProjectPanel 中选中一个 model 资产（`assetStore.selectedAssetId` 非 null）
- 或用户点击层级展开后的某个子节点（此时附带 `selectedNodePath` 信息）

### UI 位置

在 `InspectorPanel` 的资产检视模式（`!activeId && selectedAsset`）下，资产头部信息与 `ModelImportProp` 之间，新增 `ModelPreview` 组件。

### ModelPreview 组件设计

```
┌────────────────────────────────┐
│  预览: Root/Body               │  ← 当前节点路径
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │   @react-three/fiber     │  │  高度 180px
│  │   Canvas（嵌入式）        │  │
│  │   鼠标左键拖拽 = 旋转     │  │
│  └──────────────────────────┘  │
│  拖拽旋转预览                  │  ← 提示文字
└────────────────────────────────┘
```

### 技术实现

- `<Canvas frameloop="demand">` — 仅在交互时渲染，节省 GPU
- `useGLTF(url)` 加载模型，`clone(gltf.scene)` 独立克隆避免污染场景
- 若 `selectedNodePath` 非 null，从克隆后的 scene graph 中按路径提取目标子节点显示
- `<OrbitControls enableZoom={false} enablePan={false}>` 只允许旋转
- 灯光：`<ambientLight intensity={0.6}>` + `<directionalLight>`
- 初始化时用包围盒自动调整相机距离（fitCamera）

### assetStore 扩展

新增两个字段：
```typescript
selectedAssetId: number | null;       // 已有
selectedNodePath: string | null;      // 新增：子节点路径，null 表示选中整个模型
```

新增 action：
```typescript
selectNode: (path: string | null) => void;
```

---

## 影响范围

| 文件 | 变更类型 |
|------|---------|
| `packages/client/src/stores/assetStore.ts` | 新增 `selectedNodePath` 状态和 `selectNode` action |
| `packages/client/src/components/assets/AssetCard.tsx` | 新增展开箭头按钮和 `ModelHierarchyExpander` 嵌入 |
| `packages/client/src/components/assets/ModelHierarchyExpander.tsx` | 新建：懒加载 GLB、渲染节点树 |
| `packages/client/src/components/inspector/ModelPreview.tsx` | 新建：R3F Canvas 预览组件 |
| `packages/client/src/components/panels/InspectorPanel.tsx` | 在资产检视模式下插入 `ModelPreview` |

---

## 不在范围内

- 后端改动（不持久化节点树）
- 子节点拖入场景（只做预览）
- 缩略图截图保存
