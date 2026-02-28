# Plan 06 — SubNodeInspector 材质区域扩展

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 将 SubNodeInspector 的材质区域从硬编码 3 字段（color/roughness/metalness）扩展为复用 MaterialFieldRenderer，支持与顶层对象相同的全量字段编辑。

**前置条件：** Plan 04（MaterialFieldRenderer 已实现）、Plan 05（applyTextureProps 已实现）

---

## 背景：SubNodeInspector 当前材质实现

`SubNodeInspector.tsx` 中：
- `NodeInfo` 接口只记录 `materialColor`, `materialRoughness`, `materialMetalness` 三个字段
- `handleMaterialChange` 只接受 `'color' | 'roughness' | 'metalness'` 三种 prop
- 材质覆盖存入 `nodeOverrides[path].material.props`（与 MaterialSpec 结构相同）
- GLTF 渲染层（`ModelMesh` 中）已在 Plan 05 中扩展支持贴图和 Color 字段

---

## Task 1: 扩展 SubNodeInspector 的 NodeInfo + handleMaterialChange

**Files:**
- Modify: `packages/client/src/components/inspector/SubNodeInspector.tsx`
- Modify: `packages/client/src/components/inspector/SubNodeInspector.test.tsx`（若存在）

### Step 1: 了解当前 handleMaterialChange 调用

```ts
// 当前签名（约 line 293）：
const handleMaterialChange = useCallback(
  (prop: 'color' | 'roughness' | 'metalness', value: string | number) => {
    ...
    updateComponent(activeId, 'model', {
      ...existing,
      nodeOverrides: {
        [activeSubNodePath]: {
          ...existingNodeOverride,
          material: { type: matType, props: { ...existingProps, [prop]: value } },
        },
      },
    });
    ...
  }
);
```

需要改为接受任意 `prop: string, value: unknown`。

### Step 2: 扩展 NodeInfo 接口

原 `NodeInfo` 只含 `materialColor`, `materialRoughness`, `materialMetalness`；
改为存储完整的 `materialProps: Record<string, unknown>` + 保留 `materialType` 和 `materialName`。

```ts
// 改造前
interface NodeInfo {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  materialName: string;
  materialType: string;
  materialColor: string;
  materialRoughness: number;
  materialMetalness: number;
}

// 改造后
interface NodeInfo {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  materialName: string;
  materialType: string;
  materialProps: Record<string, unknown>;  // ← 新增，替代三个单独字段
}
```

### Step 3: 修改 GLTF 加载 useEffect 中的材质信息提取（约 line 168-215）

```ts
// 改造前：
let materialColor = '#ffffff';
let materialRoughness = 1;
let materialMetalness = 0;
// ...
if (stdMat.color) materialColor = '#' + stdMat.color.getHexString();
if (typeof stdMat.roughness === 'number') materialRoughness = stdMat.roughness;
if (typeof stdMat.metalness === 'number') materialMetalness = stdMat.metalness;
// ...
if (overrides?.material?.props) {
  const mp = overrides.material.props;
  if (typeof mp.color === 'string') materialColor = mp.color;
  if (typeof mp.roughness === 'number') materialRoughness = mp.roughness;
  if (typeof mp.metalness === 'number') materialMetalness = mp.metalness;
}
setNodeInfo({ ..., materialColor, materialRoughness, materialMetalness });

// 改造后：
// 从 GLTF 材质读取基础 props
const baseMaterialProps: Record<string, unknown> = {};
if (mat) {
  const stdMat = mat as THREE.MeshStandardMaterial;
  if (stdMat.color) baseMaterialProps.color = '#' + stdMat.color.getHexString();
  if (typeof stdMat.roughness === 'number') baseMaterialProps.roughness = stdMat.roughness;
  if (typeof stdMat.metalness === 'number') baseMaterialProps.metalness = stdMat.metalness;
  if (typeof stdMat.emissiveIntensity === 'number') baseMaterialProps.emissiveIntensity = stdMat.emissiveIntensity;
  if (stdMat.emissive) baseMaterialProps.emissive = '#' + stdMat.emissive.getHexString();
}

// 叠加 nodeOverrides 中已有的材质覆盖（优先级更高）
const overrideProps = overrides?.material?.props ?? {};
const mergedProps = { ...baseMaterialProps, ...overrideProps };

setNodeInfo({
  position: pos, rotation: rot, scale: sc,
  materialName, materialType,
  materialProps: mergedProps,
});
```

### Step 4: 扩展 handleMaterialChange

```ts
// 改造后：
const handleMaterialChange = useCallback(
  (prop: string, value: unknown) => {
    if (!activeId || !activeSubNodePath) return;
    const existing = (objects[activeId]?.components as any)?.model ?? {};
    const existingOverrides = existing.nodeOverrides ?? {};
    const existingNodeOverride = existingOverrides[activeSubNodePath] ?? {};
    const existingMatOverride = existingNodeOverride.material ?? {};
    const existingProps = existingMatOverride.props ?? {};
    const matType = existingMatOverride.type ?? 'MeshStandardMaterial';

    updateComponent(activeId, 'model', {
      ...existing,
      nodeOverrides: {
        ...existingOverrides,
        [activeSubNodePath]: {
          ...existingNodeOverride,
          material: {
            type: matType,
            props: { ...existingProps, [prop]: value },
          },
        },
      },
    });

    // 同步本地显示状态
    setNodeInfo((prev) => {
      if (!prev) return prev;
      return { ...prev, materialProps: { ...prev.materialProps, [prop]: value } };
    });
  },
  [activeId, activeSubNodePath, objects, updateComponent]
);
```

### Step 5: 替换材质区域的 JSX

```tsx
// 改造前（约 line 374-416）：
{/* 材质 */}
<div>
  <h3 className="text-[11px] font-bold text-slate-300 mb-2">材质 (Material)</h3>
  <div className="space-y-2">
    {/* 类型（只读） */}...
    {/* 颜色 */}...
    {/* 粗糙度 */}...
    {/* 金属感 */}...
  </div>
</div>

// 改造后：
import { getFieldsForType, type FieldGroup } from '@/features/materials/materialSchema';
import { MaterialFieldRenderer } from './MaterialFieldRenderer';
import { useProjectStore } from '@/stores/projectStore';
// ...
const currentProjectId = useProjectStore((s) => s.currentScene?.project_id ?? 0);
const matType = nodeInfo.materialType as any;
const fields = (matType === 'MeshStandardMaterial' || matType === 'MeshPhysicalMaterial')
  ? getFieldsForType(matType)
  : getFieldsForType('MeshStandardMaterial'); // fallback

{/* 材质 */}
<div>
  <h3 className="text-[11px] font-bold text-slate-300 mb-2">材质 (Material)</h3>
  <div className="space-y-1 text-[10px] text-slate-500 mb-2">
    <span>类型：{nodeInfo.materialType}</span>
    {nodeInfo.materialName !== '—' && <span>名称：{nodeInfo.materialName}</span>}
  </div>
  <div className="space-y-2">
    {fields.map((field) => (
      <MaterialFieldRenderer
        key={field.key}
        field={field}
        value={nodeInfo.materialProps[field.key]}
        onChange={handleMaterialChange}
        projectId={currentProjectId}
      />
    ))}
  </div>
</div>
```

**注意：** SubNodeInspector 展示所有字段无折叠（字段在子节点 Inspector 内本身已是嵌套内容，折叠层级过多影响体验）。如果字段太多，可考虑仅展示 Standard 字段（含 base + pbr + maps），Physical 字段仅在材质类型为 Physical 时展示。

### Step 6: 手动测试

```bash
pnpm dev:all
# 1. 导入一个 GLTF 模型（如测试资产）
# 2. 展开层级视图中的 GLTF 子节点，选中某个 Mesh 子节点
# 3. Inspector 右侧显示 SubNodeInspector
# 4. 滚动到"材质"区域，修改粗糙度、自发光颜色等
# 5. SceneView 中该子节点材质应实时更新
# 6. 为 map 槽上传/选择一张纹理，该子节点应显示纹理
```

### Step 7: Commit

```bash
git add packages/client/src/components/inspector/SubNodeInspector.tsx
git commit -m "feat(inspector): extend SubNodeInspector material section to full schema-driven fields"
```

---

## 收尾：运行全量测试

```bash
pnpm --filter client test
```

期望：所有测试 PASS（含新增的 Schema、normalizeMaterialProps、ColorInput、Vector2Field、MaterialFieldRenderer、TexturePicker、MaterialProp 测试）

### 最终 Commit（若有遗漏文件）

```bash
git add -A
git commit -m "feat(inspector): complete material inspector full-property expansion

- materialSchema: 50+ 字段 Schema 定义（Standard + Physical）
- normalizeMaterialProps: 白名单从 Schema 自动推导
- ColorInput / Vector2Field: 新增 UI 原子组件
- TexturePicker: 资产库选取 + 直接上传，type=texture 归档
- MaterialFieldRenderer: Schema 驱动字段分发渲染器
- MaterialProp: 重构为分组折叠 Schema 渲染器
- materialFactory: applyTextureProps 异步贴图加载 + 贴图引用过滤
- SceneRenderer: ObjectRenderer/ModelMesh 处理贴图引用和 Color 类型字段
- SubNodeInspector: 材质区域扩展为全量字段

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
