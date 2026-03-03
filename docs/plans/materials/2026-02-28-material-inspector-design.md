# 设计文档：材质属性视图全量参数扩展

**日期：** 2026-02-28
**状态：** 已确认，待实施
**范围：** MeshStandardMaterial / MeshPhysicalMaterial Inspector 面板全量参数补充，含贴图槽位支持

---

## 背景

当前 `MaterialProp.tsx` 对 `MeshStandardMaterial` 仅暴露 3 个字段（color / roughness / metalness），对 `MeshPhysicalMaterial` 仅 8 个字段，而 Three.js r173 中两者合计提供约 50+ 可编辑属性。本次设计目标是在属性视图中补全所有缺失的标量（数值/颜色/布尔）参数及贴图槽位，并同步扩展 SubNodeInspector。

---

## 方案选型

选择 **Schema 驱动**方案（方案 B）：以字段元数据描述数组驱动通用 UI 渲染器，而非手写每个字段行。

- 字段数量大（~50 个），Schema 方案可扩展性最强
- 新增字段只修改 schema，不触碰 UI 组件逻辑
- 与现有 `normalizeMaterialProps` 白名单协同维护

---

## 架构

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/features/materials/materialSchema.ts` | **新建** | 字段定义 Schema |
| `src/components/inspector/MaterialProp.tsx` | **改造** | Schema 驱动渲染器 |
| `src/components/inspector/MaterialFieldRenderer.tsx` | **新建** | 按字段类型分发控件 |
| `src/components/inspector/TexturePicker.tsx` | **新建** | 贴图选取/上传弹出层 |
| `src/components/inspector/common/ColorInput.tsx` | **新建** | 从 MaterialProp 中抽取 |
| `src/components/inspector/common/Vector2Field.tsx` | **新建** | 两组 NumberInput |
| `src/components/inspector/SubNodeInspector.tsx` | **修改** | 材质区域复用 MaterialFieldRenderer |
| `src/features/materials/normalizeMaterialProps.ts` | **修改** | 扩展白名单和默认值 |
| `src/features/materials/materialFactory.ts` | **修改** | 贴图 URL 异步加载 |
| `src/features/scene/SceneRenderer.tsx` | **修改** | 贴图 needsUpdate 触发 |

---

## 数据模型

### 贴图引用序列化

贴图字段存储为轻量引用对象（可 JSON 序列化），而非 `THREE.Texture`：

```ts
// 有贴图时
props.map = { assetId: 42, url: '/api/assets/42/download?v=1720000000' }

// 无贴图时
props.map = null
```

`assetId` 用于 Inspector 回显选中状态，`url` 用于渲染层加载。

### 贴图资产类型

上传的图片资产以 `type: 'texture'` 存入资产库，`TexturePicker` 从 `useAssetStore` 中筛选 `type === 'texture'` 展示。

---

## MaterialFieldDef Schema

```ts
type FieldUIType = 'number' | 'color' | 'boolean' | 'vector2' | 'texture';
type FieldGroup  = 'base' | 'pbr' | 'physical' | 'maps' | 'wireframe';

interface MaterialFieldDef {
  key: string;           // Three.js 属性名（贴图字段为 Three.js map key）
  type: FieldUIType;
  group: FieldGroup;
  label: string;         // 中文标签（显示用）
  min?: number;
  max?: number;
  step?: number;
}
```

### MeshStandardMaterial 字段（~28 个）

**base 分组：**
- `color` (color) — 漫反射颜色
- `emissive` (color) — 自发光颜色
- `emissiveIntensity` (number, 0~∞, step 0.01) — 自发光强度
- `envMapIntensity` (number, 0~∞, step 0.01) — 环境贴图强度
- `aoMapIntensity` (number, 0~1, step 0.01) — AO 贴图强度
- `lightMapIntensity` (number, 0~∞, step 0.01) — 光照贴图强度
- `flatShading` (boolean) — 平面着色
- `fog` (boolean) — 受雾效影响

**pbr 分组：**
- `roughness` (number, 0~1, step 0.01) — 粗糙度
- `metalness` (number, 0~1, step 0.01) — 金属度
- `bumpScale` (number, -∞~∞, step 0.01) — 凹凸缩放
- `normalScale` (vector2, step 0.01) — 法线缩放 XY
- `displacementScale` (number, step 0.01) — 置换缩放
- `displacementBias` (number, step 0.01) — 置换偏移

**maps 分组：**
- `map` — 漫反射贴图
- `emissiveMap` — 自发光贴图
- `roughnessMap` — 粗糙度贴图
- `metalnessMap` — 金属度贴图
- `normalMap` — 法线贴图
- `bumpMap` — 凹凸贴图
- `displacementMap` — 置换贴图
- `aoMap` — AO 贴图
- `lightMap` — 光照贴图
- `alphaMap` — 透明度贴图
- `envMap` — 环境反射贴图

### MeshPhysicalMaterial 额外字段（在 Standard 基础上新增，~22 个）

**physical 分组：**
- `clearcoat` (number, 0~1, step 0.01) — 清漆强度
- `clearcoatRoughness` (number, 0~1, step 0.01) — 清漆粗糙度
- `clearcoatNormalScale` (vector2, step 0.01) — 清漆法线缩放
- `ior` (number, 1~2.333, step 0.001) — 折射率
- `reflectivity` (number, 0~1, step 0.01) — 反射率（与 ior 联动）
- `transmission` (number, 0~1, step 0.01) — 透射率
- `thickness` (number, 0~∞, step 0.01) — 体积厚度
- `attenuationDistance` (number, 0~∞, step 0.1) — 衰减距离
- `attenuationColor` (color) — 衰减颜色
- `specularIntensity` (number, 0~1, step 0.01) — 镜面强度
- `specularColor` (color) — 镜面颜色
- `anisotropy` (number, -1~1, step 0.01) — 各向异性
- `anisotropyRotation` (number, 0~6.283, step 0.01) — 各向异性旋转（rad）
- `sheen` (number, 0~1, step 0.01) — 丝绒强度
- `sheenRoughness` (number, 0~1, step 0.01) — 丝绒粗糙度
- `sheenColor` (color) — 丝绒颜色
- `iridescence` (number, 0~1, step 0.01) — 虹彩强度
- `iridescenceIOR` (number, 1~3, step 0.001) — 虹彩折射率
- `iridescenceThicknessRange` (vector2, step 1) — 虹彩厚度范围 [min, max] (nm)
- `dispersion` (number, 0~∞, step 0.01) — 色散

**maps 分组（Physical 额外）：**
- `clearcoatMap`, `clearcoatRoughnessMap`, `clearcoatNormalMap`
- `sheenColorMap`, `sheenRoughnessMap`
- `transmissionMap`, `thicknessMap`
- `iridescenceMap`, `iridescenceThicknessMap`
- `anisotropyMap`
- `specularIntensityMap`, `specularColorMap`

---

## UI 布局

```
材质 (Materials)
├── 类型选择 [MeshPhysicalMaterial ▼]
│
├── ▼ 基础 (Base)               ← 默认展开
│   ├── color / emissive / emissiveIntensity ...
│   └── flatShading [✓] / fog [✓]
│
├── ▼ PBR                        ← 默认展开
│   ├── roughness / metalness / normalScale ...
│   └── bumpScale / displacementScale ...
│
├── ▶ 物理高级 (Physical)         ← 默认折叠
│   ├── clearcoat / ior / transmission / sheen ...
│   └── iridescence / anisotropy / dispersion ...
│
└── ▶ 贴图 (Maps)                 ← 默认折叠
    ├── [缩略图] map       [×] [选择▼]
    ├── [缩略图] normalMap [×] [选择▼]
    └── ...
```

---

## TexturePicker 弹出层

- 触发：点击贴图槽的 "选择▼" 按钮
- 内容：显示 `useAssetStore` 中 `type === 'texture'` 的图片资产，网格布局（每格 60×60 缩略图 + 文件名）
- 上传：弹出层顶部 "[上传图片]" 按钮，选文件后调用 `assetsApi.upload({type:'texture', projectId})`，上传成功后刷新列表并自动选中
- 清除：点击贴图槽的 "×" 按钮将该贴图字段设为 `null`
- 选中后关闭弹出层，触发 `UpdateMaterialPropsCommand({ [key]: {assetId, url} })`

---

## 渲染层：贴图异步加载

`materialFactory.ts` 新增辅助函数 `applyTextureProps`：

```ts
const textureCache = new Map<string, THREE.Texture>();

export function applyTextureProps(
  material: THREE.Material,
  props: Record<string, unknown>
): void {
  for (const [key, val] of Object.entries(props)) {
    if (!val || typeof val !== 'object' || !('url' in val)) continue;
    const ref = val as { assetId: number; url: string };
    if (textureCache.has(ref.url)) {
      (material as any)[key] = textureCache.get(ref.url)!;
      material.needsUpdate = true;
    } else {
      new THREE.TextureLoader().load(ref.url, (tex) => {
        textureCache.set(ref.url, tex);
        (material as any)[key] = tex;
        material.needsUpdate = true;
      });
    }
  }
}
```

`SceneRenderer.ObjectRenderer` 在材质 spec 变化时（useEffect）调用此函数更新现有材质，避免每次重新 new 材质。

---

## normalizeMaterialProps 扩展

- `ALLOWED_KEYS_BY_TYPE.MeshStandardMaterial`：追加所有 Standard 新增字段（含贴图 key）
- `ALLOWED_KEYS_BY_TYPE.MeshPhysicalMaterial`：追加所有 Physical 新增字段
- `DEFAULTS_BY_TYPE`：仅对有默认值意义的数值字段补充默认值（如 `emissiveIntensity: 1.0`，`ior: 1.5`）
- Standard → Physical 切换：Standard 的贴图引用全部保留（共享槽位）
- Physical → Standard 切换：Physical 独有字段丢弃，共享字段保留

---

## SubNodeInspector 改造

材质区域从手写 `color / roughness / metalness` 三行，改为：
1. 读取 GLTF 子节点真实材质类型（已有 `nodeInfo.materialType`）
2. 渲染对应材质的 `MaterialFieldRenderer`（传入 `fields` 和 `onChangeProp`）
3. `handleMaterialChange` 签名扩展为接受任意 prop key

SubNodeInspector 的贴图支持：贴图引用同样存入 `nodeOverrides[path].material.props`，渲染层在 `ModelMesh` 的材质覆盖逻辑中调用 `applyTextureProps`。

---

## 撤销/重做

- 所有字段修改（包括贴图选取）均通过 `UpdateMaterialPropsCommand` 走命令系统
- 贴图 URL 清除（设为 null）同样可撤销
- 命令 merge 逻辑保持不变（同一对象的连续修改合并为单步撤销）

---

## 测试策略

- `materialSchema.ts` 无副作用，全字段定义可做快照测试
- `normalizeMaterialProps.test.ts` 追加新字段的白名单过滤和默认值测试
- `materialFactory.test.ts` 追加贴图 props 解析逻辑测试（mock TextureLoader）
- `MaterialProp.test.tsx` 追加 Schema 渲染覆盖率（各 group 折叠/展开，字段变更触发 command）
- `TexturePicker` E2E：上传图片 → 出现在列表 → 选中 → 贴图缩略图更新
