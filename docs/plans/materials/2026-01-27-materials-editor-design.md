# 材质（Materials）属性编辑设计（Inspector）

## 背景与目标

为三维对象增加材质属性编辑修改功能：当用户在 Scene View 选中一个三维对象时，右侧属性检视器（Inspector）除 Transform 外，还应显示 Materials 相关属性；相机、灯光等无材质对象不显示。

同时满足：
- **实时渲染反馈**：修改材质类型/属性后，Scene View 立即呈现效果。
- **可持久化**：材质设置可随场景保存/加载（JSON）。
- **可撤销/重做**：所有材质编辑都进入命令历史（Undo/Redo），并支持合并连续拖拽（merge）。

## 范围（本次支持的材质类型）

本次支持以下 5 种 three.js 网格材质类型：
- `MeshStandardMaterial`
- `MeshBasicMaterial`
- `MeshLambertMaterial`
- `MeshPhongMaterial`
- `MeshPhysicalMaterial`

> 多材质（`material[]`）暂不做；本期定义为“每对象单材质”。

## 方案选择

采用 **方案 1：数据模型存可序列化的 MaterialSpec，渲染层将 spec 映射为 three material 实例**。

原因：
- 便于保存/加载（避免序列化 three 实例）
- 便于 Undo/Redo（命令记录的是 spec 前/后快照）
- 便于测试（normalize/命令行为可在 Vitest 里验证）
- 扩展材质类型与 UI 字段更可控

## 数据模型：MaterialSpec

在“可渲染网格对象（mesh/primitive/model 等）”的场景对象 schema 中加入：

```ts
export type MaterialType =
  | 'MeshStandardMaterial'
  | 'MeshBasicMaterial'
  | 'MeshLambertMaterial'
  | 'MeshPhongMaterial'
  | 'MeshPhysicalMaterial';

export type MaterialSpec = {
  type: MaterialType;
  props: Record<string, unknown>; // 受白名单约束
};
```

### 默认值策略

- 新建三维对象时默认：`type = 'MeshStandardMaterial'`。
- `props` 使用“默认白名单字段 + 默认值”。默认值尽量与 three 默认一致（如 `opacity=1`、`transparent=false`、`side=FrontSide`）。

### 白名单字段（确保不遗漏常用项）

为了避免 three 全量属性导致 UI 过于复杂，本设计按“常用且对外观影响明显”的字段建立白名单；其余贴图等高级项可后续迭代。

#### 通用（THREE.Material）
- `transparent`（bool）
- `opacity`（0~1）
- `depthTest`（bool）
- `depthWrite`（bool）
- `alphaTest`（0~1）
- `visible`（bool）
- `side`（`FrontSide | BackSide | DoubleSide`）

#### 通用（网格材质常用）
- `wireframe`（bool）
- `color`（颜色：`#RRGGBB` / hex number）

#### `MeshStandardMaterial`
- `roughness`（0~1）
- `metalness`（0~1）

建议下期纳入：`emissive`、`emissiveIntensity`、`flatShading`、`vertexColors`、`fog`

#### `MeshPhysicalMaterial`
- `roughness`（0~1）
- `metalness`（0~1）
- `clearcoat`（0~1）
- `clearcoatRoughness`（0~1）
- `ior`（建议 UI 限制 1~2.333）
- `transmission`（0~1）
- `thickness`（>=0）

#### `MeshPhongMaterial`
- `shininess`
- `specular`（颜色）
- 建议：`emissive`、`emissiveIntensity`

#### `MeshLambertMaterial`
- 仅 `color`（建议：`emissive`、`emissiveIntensity`）

#### `MeshBasicMaterial`
- 仅 `color`

> 上述字段核对参考了 three 官方 material-browser 的 GUI 控件清单与 PBR 示例（见“参考文档”）。

## Inspector UI：Materials 面板

### 显示规则

仅当当前选中对象属于“可渲染网格对象”且存在/支持 `material` 字段时显示 Materials。
- Camera、Light 等对象：隐藏 Materials 面板。

### UI 结构

1) **材质类型下拉菜单**（顶部）
- 5 个选项：Standard / Basic / Lambert / Phong / Physical
- 切换触发 `ChangeMaterialTypeCommand`（支持 Undo/Redo）

2) **动态属性表单**（下方）
- 根据 `material.type` 渲染对应字段
- 每个字段变更触发 `UpdateMaterialPropsCommand`
- Slider 类字段支持 `merge()` 合并连续更新

### 类型切换时的 props 规范化

提供：

```ts
function normalizeProps(oldProps: Record<string, unknown>, newType: MaterialType): Record<string, unknown>
```

规则：
- 保留通用字段（`color/transparent/opacity/alphaTest/depthTest/depthWrite/visible/side/wireframe`）
- 移除新类型不支持字段
- 为新类型补齐字段默认值

## 渲染层：MaterialSpec → THREE.Material

### 基本策略

- **同类型更新**：`type` 不变时，对已有材质实例进行增量赋值更新。
- **类型变化重建**：`type` 变化时，`dispose()` 旧材质并创建新材质实例。

### needsUpdate 触发

参考 three 官方 `material-browser` 的做法，对以下字段变更设置：
- `transparent`、`alphaTest`、`side`、`wireframe`
-（后续纳入时）`flatShading`、`vertexColors`、`fog`

更新后 `material.needsUpdate = true`，以确保 shader/渲染状态刷新。

### 资源清理

对象删除或组件卸载时调用 `material.dispose()`，避免 GPU 资源泄漏。

## Undo/Redo 命令设计

### 1) ChangeMaterialTypeCommand
- 记录 `beforeSpec` 与 `afterSpec` 两份快照
- `execute()`：应用 after
- `undo()`：恢复 before
- `redo()`：再次应用 after

### 2) UpdateMaterialPropsCommand
- 记录 `beforeProps` 与 `afterProps`
- `merge(other)`：同对象+同类型+短时间连续更新时，仅更新 `afterProps` 为最新值

## 测试策略（Vitest）

- `normalizeProps` 的单元测试：
  - Standard → Physical：补齐 `clearcoat/.../ior/transmission/thickness`
  - Physical → Basic：剔除不支持字段，仅保留通用字段
- 命令测试：
  - `execute/undo/redo` 正确改变 store 中的 `material` 字段
  - `merge()` 合并后历史条目数量合理

## 验收标准

- 选中 mesh 对象：Inspector 显示 Transform + Materials；选中相机/灯光：不显示 Materials。
- 新建对象默认 `MeshStandardMaterial`。
- Materials 顶部可切换 5 种材质类型；切换后下方字段随类型变化可编辑。
- 修改任意字段后 SceneView 实时更新外观；且所有修改可 Undo/Redo（含类型切换与属性修改）。

## 参考（Context7 / three 官方）

- three `material-browser`：`guiMaterial()` 与 `guiMeshStandardMaterial()` 控件字段清单（透明度、alphaTest、side、wireframe、roughness、metalness 等）
- three transparency 文档：`transparent / alphaTest / side` 常见配置
- PBR 示例：`MeshPhysicalMaterial` 的 `clearcoat / transmission / thickness / ior`
