# 基于节点的可视化材质编辑器 — 设计文档

**日期**：2026-03-10
**状态**：已批准
**关联需求**：`rawRequirements/基于节点的可视化材质编辑器.md`

---

## 1. 架构概述

### 技术选型

| 关注点 | 选型 | 理由 |
|--------|------|------|
| 节点图 UI | `@xyflow/react`（React Flow） | 成熟、社区活跃，内置节点/连线/拖拽/缩放 |
| 着色器执行 | Three.js TSL NodeMaterial（0.173 内置） | 原生支持 WebGL，无需额外运行时 |
| 编辑器展示 | 全屏 Overlay（层叠在主编辑器上） | 类 Babylon NME 体验，空间充足 |
| 存储格式 | 材质资产 `properties.graph` JSONB | 沿用现有 DB 表，无需 migration |

### 系统边界

```
NodeMaterialEditor（全屏 Overlay）
  ├── NodeLibraryPanel（左侧节点库）
  ├── NodeCanvas（React Flow 画布）
  ├── PropertyPanel（右侧节点属性）
  └── PreviewPanel（右侧 3D 预览）
           │ 图变化 debounce 300ms
           ▼
      TSL Compiler
      (JSON Graph → TSL 表达式)
           │
           ▼
  MeshStandardNodeMaterial 实例
     ├── SceneView（场景内对象实时更新）
     └── PreviewPanel（编辑器内预览）
```

### 新增目录

```
packages/client/src/features/nodeMaterial/
├── NodeMaterialEditor.tsx        # 全屏 overlay 入口
├── NodeCanvas.tsx                # React Flow 画布
├── NodeLibraryPanel.tsx          # 左侧节点库
├── PropertyPanel.tsx             # 右侧属性面板
├── PreviewPanel.tsx              # 右侧 3D 预览
├── nodes/
│   ├── nodeRegistry.ts           # 节点类型注册表（元数据）
│   ├── nodeCategories.ts         # 分类定义
│   └── components/               # 各类型节点 React 组件
│       ├── InputNode.tsx
│       ├── MathNode.tsx
│       ├── OutputNode.tsx
│       └── ...
├── compiler/
│   └── tslCompiler.ts            # JSON 图 → TSL NodeMaterial
└── hooks/
    ├── useNodeEditor.ts           # 编辑器交互状态
    └── usePreviewMaterial.ts      # 编译并维护预览材质
```

### 现有文件改动点

| 文件 | 改动内容 |
|------|---------|
| `types/index.ts` | `MaterialType` 加入 `'NodeMaterial'`；新增 `NodeGraphData`、`NodeGraphNode`、`NodeGraphEdge` 类型 |
| `features/materials/materialFactory.ts` | `createThreeMaterial` 识别 `NodeMaterial`，调用 TSL 编译器 |
| `stores/materialStore.ts` | 新增 `openNodeEditor(id)` / `closeNodeEditor()` 状态 |
| `components/inspector/MaterialAssetProp.tsx` | NodeMaterial 显示「打开节点编辑器」按钮 |
| `components/panels/ProjectPanel.tsx` | 新建材质对话框加入 NodeMaterial 选项 |
| `features/editor/EditorPage.tsx` | 条件渲染 `<NodeMaterialEditor>` overlay |

---

## 2. 数据模型

### TypeScript 类型定义

```typescript
// packages/client/src/types/index.ts

interface NodeGraphNode {
  id: string;
  type: string;                        // 节点类型 key
  position: { x: number; y: number };
  data: {
    label?: string;
    params: Record<string, unknown>;   // 节点参数值
  };
}

interface NodeGraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

interface NodeGraphData {
  version: 1;
  nodes: NodeGraphNode[];
  edges: NodeGraphEdge[];
}

type MaterialType =
  | 'MeshStandardMaterial'
  | 'MeshPhysicalMaterial'
  | 'MeshPhongMaterial'
  | 'MeshLambertMaterial'
  | 'MeshBasicMaterial'
  | 'NodeMaterial';                    // 新增
```

### 数据库存储（无 migration，沿用 JSONB）

```json
{
  "type": "NodeMaterial",
  "properties": {
    "baseType": "standard",
    "graph": {
      "version": 1,
      "nodes": [
        { "id": "n1", "type": "colorInput", "position": { "x": 100, "y": 200 },
          "data": { "params": { "value": [1, 0.2, 0.2] } } },
        { "id": "n2", "type": "fragmentOutput", "position": { "x": 600, "y": 200 },
          "data": { "params": {} } }
      ],
      "edges": [
        { "id": "e1", "source": "n1", "sourceHandle": "out",
          "target": "n2", "targetHandle": "colorNode" }
      ]
    }
  }
}
```

### 新建默认图

新建 NodeMaterial 时自动生成一个最小图：`colorInput`（白色）→ `fragmentOutput.colorNode`，让用户立即看到效果。

---

## 3. 节点类型目录（共约 60 个）

### Inputs（10 个）

| key | 标签 | 输出 | TSL |
|-----|------|------|-----|
| `floatInput` | Float | `out: float` | `uniform(float)` |
| `intInput` | Integer | `out: int` | `uniform(int)` |
| `boolInput` | Boolean | `out: bool` | `uniform(bool)` |
| `vec2Input` | Vector2 | `out: vec2` | `uniform(vec2)` |
| `vec3Input` | Vector3 | `out: vec3` | `uniform(vec3)` |
| `vec4Input` | Vector4 | `out: vec4` | `uniform(vec4)` |
| `colorInput` | Color | `out: vec3` | `uniform(color)` |
| `textureInput` | Texture | `out: vec4`, `rgb: vec3`, `a: float` | `texture(sampler)` |
| `timeNode` | Time | `out: float` | `time` |
| `uvInput` | UV | `out: vec2` | `uv(channel)` |

### Math（20 个）

`addMath`, `subMath`, `mulMath`, `divMath`, `modMath`, `absMath`, `sinMath`, `cosMath`, `powMath`, `sqrtMath`, `minMath`, `maxMath`, `clampMath`, `saturateMath`, `mixMath`, `dotMath`, `crossMath`, `normalizeMath`, `lengthMath`, `reflectMath`

### Mesh（6 个）

`positionMesh`（local/world/view 输出）、`normalMesh`（local/world/view）、`tangentMesh`、`uvMesh`（uv0/uv1）、`vertexColorMesh`、`transformMesh`（modelMatrix/normalMatrix）

### Matrices（5 个）

`modelMatrixNode`, `viewMatrixNode`, `projMatrixNode`, `mvMatrixNode`, `normalMatrixNode`

### Utility（8 个）

`splitVec`, `joinVec`, `convertNode`, `remapNode`, `oneMinus`, `stepNode`, `smoothstepNode`, `ifElseNode`

### PBR（2 个）

`standardPBR`（colorNode/roughnessNode/metalnessNode/emissiveNode/normalNode/opacityNode/aoNode）、`physicalPBR`（额外支持 clearcoat/sheen/iridescence）

### Noises（4 个）

`perlinNoise`, `voronoiNoise`, `fbmNoise`, `checkerNoise`（均通过 Three.js materialx 噪声函数实现）

### Scene（4 个）

`cameraPosNode`, `cameraFarNode`, `cameraNearNode`, `screenUVNode`

### Output（1 个，不可删除）

`fragmentOutput`：输入插槽 `colorNode/emissiveNode/roughnessNode/metalnessNode/normalNode/opacityNode`，直接映射到 TSL NodeMaterial 同名插槽

---

## 4. TSL 编译器

### 编译流程

```
NodeGraphData
  → 验证（fragmentOutput 存在，无循环依赖）
  → 构建边索引（targetNodeId:handle → edge）
  → 深度优先求值（带 Map 缓存）
  → NODE_BUILDERS[type](node, handle, evalInput) → TSL Node
  → 赋值到 MeshStandardNodeMaterial 各插槽
  → 返回 { material, errors }
```

### 类型自动提升规则

| 源 | 目标插槽 | 处理 |
|----|---------|------|
| `float` | `vec3` | `vec3(f, f, f)` |
| `vec3` | `colorNode` | 直接赋值 |
| `vec4` | `colorNode` | 取 `.rgb` |
| 未连线 float | — | 使用 `params` 默认值，降级 `uniform(0)` |

### 实时更新策略

- `onNodesChange` / `onEdgesChange` → debounce **300ms** → `compileNodeGraph()`
- 编译失败 → 保留上次合法材质 + 状态栏错误提示
- 编译成功 → `material.needsUpdate = true` → `syncMaterialAsset()` 同步 SceneView

---

## 5. UI 交互

### 布局

```
┌──────────────────────────────────────────────────────────────────┐
│ [← 返回]  节点材质编辑器：[材质名称]              [保存] [另存为]│  顶栏
├──────────┬───────────────────────────────────┬───────────────────┤
│ 节点库   │        React Flow 画布             │ 属性面板           │
│ ──────── │  [节点] ────────► [节点]          │ 选中节点参数       │
│ Inputs   │      └──────────► [节点]          │ ─────────────────  │
│ Math     │                                   │ 3D 预览视口        │
│ Mesh     │  双击空白 → 节点搜索弹出框         │ （球/平/Box 切换） │
│ ...      │  右键节点 → 删除/复制/重命名       │                   │
└──────────┴───────────────────────────────────┴───────────────────┤
│ 状态栏：[编译成功 ✓] 或 [错误：...节点 "Add" 输入 a 未连接]      │
└──────────────────────────────────────────────────────────────────┘
```

### 键盘快捷键

| 快捷键 | 动作 |
|--------|------|
| `Delete` / `Backspace` | 删除选中节点（fragmentOutput 不可删） |
| `Ctrl+D` | 复制选中节点 |
| `Ctrl+Z` / `Ctrl+Y` | 撤销/重做（独立于场景历史栈） |
| `Ctrl+S` | 保存材质 |
| `F` | 适配画布到所有节点 |

### 节点内联编辑

- `floatInput` / `intInput`：节点内数字输入框
- `colorInput`：节点内色块，点击弹出 color picker
- `textureInput`：节点内缩略图，点击弹出资产选择器（复用 `TexturePicker`）
- `vec2/3/4Input`：节点内多分量输入框

---

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| 缺少 `fragmentOutput` | 状态栏红色警告，禁用保存 |
| 输入未连线 | 降级默认值，黄色提示 |
| 循环依赖 | 状态栏红色错误，保留上次合法材质 |
| TSL 运行时异常 | try/catch 捕获，显示异常信息 |
| 纹理 assetId 不存在 | 1×1 白色占位纹理，节点黄色警告图标 |
| 保存 API 失败 | toast 提示，不关闭编辑器 |

### 保存流程

```
点击「保存」
  → 序列化 React Flow 图 → NodeGraphData JSON
  → materialsApi.updateMaterial(id, { type, properties: { graph, baseType } })
  → 成功 → toast「保存成功」+ materialStore 更新缓存
  → sceneStore.syncMaterialAsset() 触发场景内对象重编译
```

自动保存：debounce 1 秒，顶栏显示「已自动保存」。

---

## 7. 测试策略

### 单元测试（Vitest）

- `tslCompiler.test.ts`：空图、单节点、链式节点、未连线降级、循环检测、类型提升、texture 节点、physicalPBR 分支
- `nodeRegistry.test.ts`：所有节点有完整元数据，NODE_BUILDERS 覆盖所有注册类型
- `typeCompatibility.test.ts`：类型提升/拒绝规则

### 组件测试（Vitest + jsdom）

- `NodeLibraryPanel.test.tsx`：分类渲染、搜索过滤、点击回调
- `PropertyPanel.test.tsx`：未选/选中节点时的渲染、参数修改回调
- `NodeMaterialEditor.test.tsx`：默认 fragmentOutput、Ctrl+S 触发保存、编译错误禁用保存

### 集成测试

- `nodeMaterialIntegration.test.ts`：新建→编译→返回合法材质；保存→重载→图结构一致；`materialFactory.createThreeMaterial` 处理 NodeMaterial

### E2E 测试（Playwright，可选）

- `nodeMaterialEditor.spec.ts`：拖拽节点→连线→预览变色；保存→刷新→图持久化

---

## 8. 依赖

```
pnpm add @xyflow/react           # 节点图 UI
# Three.js TSL 已内置于 three@0.173.0，无需额外安装
```
