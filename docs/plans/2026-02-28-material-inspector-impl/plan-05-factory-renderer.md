# Plan 05 — materialFactory + SceneRenderer 贴图异步加载

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 扩展 materialFactory 处理贴图引用 `{assetId, url}`，并更新 SceneRenderer 的 ObjectRenderer 和 ModelMesh 以响应贴图变化。

**前置条件：** Plan 01 完成（需了解贴图引用格式 `{assetId, url}`）

---

## 背景：渲染层现状

`SceneRenderer.tsx` 中 `ObjectRenderer` 的材质更新策略（`packages/client/src/features/scene/SceneRenderer.tsx:317-349`）：

```ts
// 类型变更：重建材质
if (materialSpec && lastTypeRef.current !== materialSpec.type) {
  materialRef.current?.dispose();
  materialRef.current = createThreeMaterial(materialSpec);
  lastTypeRef.current = materialSpec.type;
}

// Props 变更：逐项赋值
useEffect(() => {
  if (!materialSpec || !materialRef.current) return;
  const mat: any = materialRef.current;
  const props = (materialSpec.props ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(props)) {
    if (key === 'color' && typeof value === 'string' && mat.color?.set) {
      mat.color.set(value);
    } else {
      mat[key] = value as any;   // ← 贴图引用 {assetId, url} 直接赋值会出错
    }
  }
  mat.wireframe = resolveWireframeOverride(renderMode, materialSpec);
  mat.needsUpdate = true;
}, [materialSpec, renderMode, selectedIds]);
```

问题：`{assetId, url}` 对象被直接赋值给 `mat.map` 等字段，Three.js 不认识此对象。

---

## Task 1: 扩展 materialFactory.ts — 添加 applyTextureProps

**Files:**
- Modify: `packages/client/src/features/materials/materialFactory.ts`
- Modify: `packages/client/src/features/materials/materialFactory.test.ts`

### Step 1: 写测试（追加到已有测试文件）

```ts
// 追加到 materialFactory.test.ts

import * as THREE from 'three';

// 判断是否为贴图引用
describe('isTextureRef', () => {
  it('识别 {assetId, url} 为贴图引用', () => {
    const { isTextureRef } = await import('./materialFactory');
    expect(isTextureRef({ assetId: 1, url: '/img' })).toBe(true);
    expect(isTextureRef('#ffffff')).toBe(false);
    expect(isTextureRef(null)).toBe(false);
    expect(isTextureRef(0.5)).toBe(false);
  });
});

describe('applyTextureProps', () => {
  it('非贴图引用属性跳过不处理', () => {
    const { applyTextureProps } = await import('./materialFactory');
    const mat = new THREE.MeshStandardMaterial();
    // 不应该抛出错误
    applyTextureProps(mat, { roughness: 0.5, color: '#ff0000' });
    // roughness 和 color 已由调用方处理，applyTextureProps 不修改它们
    expect(mat.roughness).toBe(1); // 未被修改（默认值）
  });

  it('贴图引用属性触发 TextureLoader 加载', () => {
    const { applyTextureProps } = await import('./materialFactory');

    // mock TextureLoader
    const loadMock = vi.fn((url, onLoad) => {
      const tex = new THREE.Texture();
      onLoad(tex);
      return {} as any;
    });
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(loadMock);

    const mat = new THREE.MeshStandardMaterial();
    applyTextureProps(mat, { map: { assetId: 1, url: '/tex.png' } });

    expect(loadMock).toHaveBeenCalledWith('/tex.png', expect.any(Function), undefined, expect.any(Function));
    expect(mat.map).toBeInstanceOf(THREE.Texture);
    expect(mat.needsUpdate).toBe(true);

    vi.restoreAllMocks();
  });
});

describe('createThreeMaterial with textures', () => {
  it('创建材质时不将贴图引用直接传给构造函数', () => {
    const mat = createThreeMaterial({
      type: 'MeshStandardMaterial',
      props: { roughness: 0.5, map: { assetId: 1, url: '/img.png' } },
    }) as any;
    // map 字段不应是 {assetId, url} 对象
    expect(mat.map === null || mat.map instanceof THREE.Texture || mat.map === undefined).toBe(true);
    expect(typeof mat.map?.assetId).not.toBe('number');
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/features/materials/materialFactory.test.ts
```

### Step 3: 修改 materialFactory.ts

```ts
// packages/client/src/features/materials/materialFactory.ts
import * as THREE from 'three';
import type { MaterialSpec } from '@/types';

/** 模块级纹理缓存，避免相同 URL 重复 TextureLoader */
const textureCache = new Map<string, THREE.Texture>();

/** 判断一个值是否为贴图引用对象 */
export function isTextureRef(value: unknown): value is { assetId: number; url: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'assetId' in (value as object) &&
    'url' in (value as object)
  );
}

/**
 * 将 props 中的贴图引用字段异步加载并应用到材质。
 * 非贴图引用字段由调用方负责赋值，此函数只处理 isTextureRef 的字段。
 */
export function applyTextureProps(
  material: THREE.Material,
  props: Record<string, unknown>
): void {
  for (const [key, val] of Object.entries(props)) {
    if (!isTextureRef(val)) continue;
    const ref = val;
    if (textureCache.has(ref.url)) {
      (material as any)[key] = textureCache.get(ref.url)!;
      material.needsUpdate = true;
    } else {
      new THREE.TextureLoader().load(
        ref.url,
        (tex) => {
          textureCache.set(ref.url, tex);
          (material as any)[key] = tex;
          material.needsUpdate = true;
        },
        undefined,
        (err) => console.warn(`[materialFactory] 贴图加载失败: ${ref.url}`, err)
      );
    }
  }
}

/** 从 props 中过滤掉贴图引用，返回纯标量 props 供构造函数使用 */
function filterScalarProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (!isTextureRef(val)) {
      result[key] = val;
    }
  }
  return result;
}

export function createThreeMaterial(spec: MaterialSpec): THREE.Material {
  const allProps = spec.props ?? {};
  const scalarProps = filterScalarProps(allProps);

  let material: THREE.Material;
  switch (spec.type) {
    case 'MeshPhysicalMaterial':
      material = new THREE.MeshPhysicalMaterial(scalarProps as any);
      break;
    case 'MeshPhongMaterial':
      material = new THREE.MeshPhongMaterial(scalarProps as any);
      break;
    case 'MeshLambertMaterial':
      material = new THREE.MeshLambertMaterial(scalarProps as any);
      break;
    case 'MeshBasicMaterial':
      material = new THREE.MeshBasicMaterial(scalarProps as any);
      break;
    case 'MeshStandardMaterial':
    default:
      material = new THREE.MeshStandardMaterial(scalarProps as any);
  }

  // 立即触发贴图异步加载（加载完成后 material.needsUpdate = true 即可）
  applyTextureProps(material, allProps);

  return material;
}
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/features/materials/materialFactory.test.ts
```

### Step 5: Commit

```bash
git add packages/client/src/features/materials/materialFactory.ts \
        packages/client/src/features/materials/materialFactory.test.ts
git commit -m "feat(materials): add applyTextureProps and filter texture refs from constructor props"
```

---

## Task 2: 更新 SceneRenderer — ObjectRenderer props 更新逻辑

**Files:**
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx`（`ObjectRenderer` 的 `useEffect`，约 line 327-349）

### Step 1: 修改 ObjectRenderer 中的 props 遍历 useEffect

找到 `SceneRenderer.tsx` 中以下 useEffect（line ~327）并修改：

```ts
// 原来：
for (const [key, value] of Object.entries(props)) {
  if (key === 'color' && typeof value === 'string' && mat.color?.set) {
    mat.color.set(value);
  } else {
    mat[key] = value as any;   // ← 需要修改这里
  }
}
mat.wireframe = resolveWireframeOverride(renderMode, materialSpec);
mat.needsUpdate = true;

// 改为：
import { isTextureRef, applyTextureProps } from '@/features/materials/materialFactory';

// ...在 useEffect 内部：
const texProps: Record<string, unknown> = {};
for (const [key, value] of Object.entries(props)) {
  if (isTextureRef(value)) {
    texProps[key] = value;           // 贴图引用：收集起来，稍后异步加载
  } else if (key === 'color' && typeof value === 'string' && mat.color?.set) {
    mat.color.set(value);
  } else if (key === 'emissive' && typeof value === 'string' && mat.emissive?.set) {
    mat.emissive.set(value);         // 同样处理 emissive 等 Color 类型字段
  } else if (key === 'sheenColor' && typeof value === 'string' && (mat as any).sheenColor?.set) {
    (mat as any).sheenColor.set(value);
  } else if (key === 'attenuationColor' && typeof value === 'string' && (mat as any).attenuationColor?.set) {
    (mat as any).attenuationColor.set(value);
  } else if (key === 'specularColor' && typeof value === 'string' && (mat as any).specularColor?.set) {
    (mat as any).specularColor.set(value);
  } else if (key === 'normalScale' && Array.isArray(value) && (mat as any).normalScale?.set) {
    (mat as any).normalScale.set(value[0], value[1]);
  } else if (key === 'clearcoatNormalScale' && Array.isArray(value) && (mat as any).clearcoatNormalScale?.set) {
    (mat as any).clearcoatNormalScale.set(value[0], value[1]);
  } else if (key === 'iridescenceThicknessRange' && Array.isArray(value)) {
    (mat as any).iridescenceThicknessRange = [...value];
  } else {
    mat[key] = value as any;
  }
}
mat.wireframe = resolveWireframeOverride(renderMode, materialSpec);
mat.needsUpdate = true;

// 异步加载贴图（加载完成后自动 needsUpdate）
if (Object.keys(texProps).length > 0) {
  applyTextureProps(mat, texProps);
}
```

**注意：** 在文件顶部 import 区域添加 `import { isTextureRef, applyTextureProps } from '@/features/materials/materialFactory';`。

### Step 2: 更新 ModelMesh — materialSpec 应用到子网格

找到 `ModelMesh` 内的 `useMemo`（line ~82-104），在 `materialSpec` 应用块中加贴图处理：

```ts
// 原来（line ~84-103）：
if (materialSpec) {
  const props = materialSpec.props as Record<string, unknown>;
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if (!mat) return;
      const m = mat as any;
      for (const [key, value] of Object.entries(props)) {
        if (key === 'color' && typeof value === 'string' && m.color?.set) {
          m.color.set(value);
        } else {
          m[key] = value;     // ← 同样问题，需要处理贴图引用
        }
      }
      m.needsUpdate = true;
    });
  });
}

// 改为（在文件顶部已 import isTextureRef、applyTextureProps）：
if (materialSpec) {
  const props = materialSpec.props as Record<string, unknown>;
  const texProps: Record<string, unknown> = {};
  const scalarProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (isTextureRef(v)) texProps[k] = v;
    else scalarProps[k] = v;
  }

  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if (!mat) return;
      const m = mat as any;
      for (const [key, value] of Object.entries(scalarProps)) {
        if (key === 'color' && typeof value === 'string' && m.color?.set) m.color.set(value);
        else if (key === 'emissive' && typeof value === 'string' && m.emissive?.set) m.emissive.set(value);
        else if (key === 'normalScale' && Array.isArray(value) && m.normalScale?.set) m.normalScale.set(value[0], value[1]);
        else m[key] = value;
      }
      if (Object.keys(texProps).length > 0) applyTextureProps(mat, texProps);
      m.needsUpdate = true;
    });
  });
}
```

### Step 3: 手动测试（SceneRenderer 不易单元测试，用 E2E 验证）

```bash
pnpm dev:all
# 在浏览器中：
# 1. 新建场景，添加一个 Box 几何体
# 2. 选中 Box → Inspector → 切换材质为 MeshStandardMaterial
# 3. 展开"基础"分组，修改"自发光颜色"为红色 → SceneView 应立即反映发光效果
# 4. 展开"贴图"分组，为 map 槽上传一张图片 → Box 应显示纹理
# 5. 撤销（Ctrl+Z）→ 贴图应消失
```

### Step 4: Commit

```bash
git add packages/client/src/features/scene/SceneRenderer.tsx
git commit -m "feat(renderer): handle texture refs and Color fields in ObjectRenderer/ModelMesh props update"
```
