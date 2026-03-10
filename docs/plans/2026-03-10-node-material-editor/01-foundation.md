# 节点材质编辑器 — Phase 1: 基础层

> 上级索引：[README.md](./README.md)

---

## Task 1: 安装 @xyflow/react 依赖

**Files:**
- Modify: `packages/client/package.json`

### Step 1: 安装依赖

```bash
cd packages/client
pnpm add @xyflow/react
```

Expected output: 安装成功，`package.json` 中 `dependencies` 新增 `"@xyflow/react": "^12.x.x"`

### Step 2: 验证安装

```bash
pnpm --filter client exec node -e "import('@xyflow/react').then(m => console.log('OK:', Object.keys(m).slice(0,3)))"
```

Expected output: `OK: [ 'ReactFlow', 'ReactFlowProvider', 'useNodesState' ]`（或类似）

### Step 3: Commit

```bash
git add packages/client/package.json pnpm-lock.yaml
git commit -m "chore(deps): add @xyflow/react for node material editor"
```

---

## Task 2: 新增 NodeGraph 类型定义

**Files:**
- Modify: `packages/client/src/types/index.ts`（在 `MaterialType` 联合类型与 `MaterialSpec` 中新增 `NodeMaterial`，并添加 NodeGraph 相关类型）

### Step 1: 编写类型定义

在 `packages/client/src/types/index.ts` 中找到 `MaterialType` 定义（第 16 行），添加 `'NodeMaterial'`：

```typescript
// 修改 MaterialType（原第 16-22 行）
export type MaterialType =
  | 'MeshStandardMaterial'
  | 'MeshBasicMaterial'
  | 'MeshLambertMaterial'
  | 'MeshPhongMaterial'
  | 'MeshPhysicalMaterial'
  | 'NodeMaterial';            // ← 新增
```

在文件末尾（`Scene` 接口之后）添加：

```typescript
// ── NodeMaterial 节点图类型 ─────────────────────────────────────

/** 节点端口的数据类型 */
export type NodePortType =
  | 'float'
  | 'int'
  | 'bool'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'color'   // vec3 的颜色语义子类型
  | 'texture' // sampler2D
  | 'mat4'
  | 'any';    // 接受任意类型

/** 节点端口（输入或输出插槽）定义 */
export interface NodePortDef {
  id: string;
  label: string;
  type: NodePortType;
  defaultValue?: unknown; // 未连接时的降级默认值
}

/** 单个节点元数据（注册表静态定义） */
export interface NodeTypeDef {
  key: string;                   // 节点类型唯一 key
  label: string;                 // UI 显示名称
  category: string;              // 所属分类 key
  description?: string;          // 工具提示说明
  inputs: NodePortDef[];
  outputs: NodePortDef[];
  defaultParams: Record<string, unknown>; // 节点内联参数初始值
  undeletable?: boolean;         // fragmentOutput 等不可删除节点
}

/** 存储在 React Flow 节点 data 字段中的运行时数据 */
export interface NodeRFData {
  typeKey: string;               // 对应 NodeTypeDef.key
  label?: string;                // 用户自定义标签（可选）
  params: Record<string, unknown>; // 当前参数值（可内联编辑）
}

/** 存储在数据库 material.properties.graph 的序列化格式 */
export interface NodeGraphNode {
  id: string;
  type: string;                  // NodeTypeDef.key
  position: { x: number; y: number };
  data: NodeRFData;
}

export interface NodeGraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface NodeGraphData {
  version: 1;
  nodes: NodeGraphNode[];
  edges: NodeGraphEdge[];
}

/** NodeMaterial 的 MaterialSpec.props 结构 */
export interface NodeMaterialProps {
  baseType: 'standard' | 'physical'; // 底层 PBR 模型
  graph: NodeGraphData;
}
```

### Step 2: 验证 TypeScript 类型检查无新增错误

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "^.*error TS" | wc -l
```

Expected output: 与修改前相比，行数不增加（项目中预存在 TS 错误可忽略）

### Step 3: Commit

```bash
git add packages/client/src/types/index.ts
git commit -m "feat(types): add NodeMaterial type and NodeGraph data model"
```

---

## Task 3: materialStore 扩展 — nodeEditor 状态

**Files:**
- Modify: `packages/client/src/stores/materialStore.ts`

### Step 1: 阅读当前 materialStore.ts

当前 `MaterialState` interface（第 7-23 行）需要增加：
- `nodeEditorMaterialId: number | null` — 当前打开节点编辑器的材质 ID
- `openNodeEditor(id: number): void`
- `closeNodeEditor(): void`

### Step 2: 修改 materialStore.ts

在 `MaterialState` interface 中新增：

```typescript
// 在 MaterialState interface 末尾（setPreviewSpec 之后）添加：
nodeEditorMaterialId: number | null;
openNodeEditor: (id: number) => void;
closeNodeEditor: () => void;
```

在 `create<MaterialState>` 的初始状态对象中新增：

```typescript
nodeEditorMaterialId: null,
```

在 actions 实现中（`setPreviewSpec` 之后）新增：

```typescript
openNodeEditor: (id) => set({ nodeEditorMaterialId: id }),
closeNodeEditor: () => set({ nodeEditorMaterialId: null }),
```

完整修改后的 `materialStore.ts` 相关部分如下：

```typescript
interface MaterialState {
  materials: Asset[];
  isLoading: boolean;
  saveError: string | null;
  selectedMaterialId: number | null;
  previewSpec: MaterialSpec | null;
  nodeEditorMaterialId: number | null;   // ← 新增

  loadMaterials: (projectId: number) => Promise<void>;
  createMaterial: (projectId: number, name: string, type: MaterialType) => Promise<Asset>;
  duplicateMaterial: (materialId: number, projectId: number) => Promise<Asset>;
  renameMaterial: (materialId: number, name: string) => Promise<void>;
  deleteMaterial: (materialId: number) => Promise<void>;
  updateMaterialSpec: (materialId: number, spec: MaterialSpec) => Promise<void>;
  selectMaterial: (id: number | null) => void;
  clearSaveError: () => void;
  setPreviewSpec: (spec: MaterialSpec | null) => void;
  openNodeEditor: (id: number) => void;  // ← 新增
  closeNodeEditor: () => void;           // ← 新增
}

// 初始状态
{
  // ...原有字段...
  nodeEditorMaterialId: null,           // ← 新增
}

// actions
openNodeEditor: (id) => set({ nodeEditorMaterialId: id }),  // ← 新增
closeNodeEditor: () => set({ nodeEditorMaterialId: null }),  // ← 新增
```

### Step 3: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "materialStore"
```

Expected output: 无新增错误

### Step 4: Commit

```bash
git add packages/client/src/stores/materialStore.ts
git commit -m "feat(store): add nodeEditorMaterialId state to materialStore"
```
