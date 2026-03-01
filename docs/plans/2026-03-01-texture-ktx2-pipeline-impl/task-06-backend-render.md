# Task 06 — 后端改动 + materialFactory KTX2 渲染支持

## 目标

1. 修改 `upload.ts` 允许上传 `image/ktx2` 类型文件
2. 在 `materialFactory.ts` 中支持 KTX2 纹理加载（使用 Three.js `KTX2Loader`）
3. 写后端上传中间件的单元测试

## Files

- Modify: `packages/server/src/middleware/upload.ts`
- Modify: `packages/client/src/features/materials/materialFactory.ts`

---

## Step 1: 查阅现有 upload.ts

```bash
cat packages/server/src/middleware/upload.ts
```

找到 `fileFilter` 中判断 `mimetype` 的位置，确认现有允许的类型列表。

---

## Step 2: 修改 upload.ts（添加 image/ktx2）

找到 upload.ts 中的 MIME 类型过滤逻辑，添加 `'image/ktx2'`。

示例（根据实际文件结构调整）：

```typescript
// 在已有的 allowedMimeTypes 数组中追加：
const allowedMimeTypes = [
  // ... 已有类型 ...
  'image/ktx2',  // KTX2 纹理（basis_universal 编码）
];
```

> 如果 upload.ts 用的是 `allowedExtensions` 而非 MIME 类型检查，则追加 `'.ktx2'`。
> 运行 `cat packages/server/src/middleware/upload.ts` 确认后再修改。

---

## Step 3: 验证后端接受 ktx2 文件

启动后端：
```bash
pnpm dev:server
```

用 curl 测试（需要先登录获取 session cookie，或通过前端验证）：
```bash
curl -X POST http://localhost:3001/api/projects/1/assets/upload \
  -F "file=@test.ktx2;type=image/ktx2" \
  -F "type=texture" \
  -b "connect.sid=<你的 session cookie>"
```

预期：`{"success": true, "asset": {...}}`（而不是 400 "Invalid file type"）

---

## Step 4: 查阅 materialFactory.ts 的纹理加载逻辑

```bash
cat packages/client/src/features/materials/materialFactory.ts
```

找到处理 `TextureRef`（`assetId`）的代码，了解现有纹理加载方式（通常是 `THREE.TextureLoader`）。

---

## Step 5: 修改 materialFactory.ts 支持 KTX2

在 `materialFactory.ts` 中，找到纹理加载函数，添加 KTX2 支持：

```typescript
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as THREE from 'three';

// KTX2Loader 单例（需要 renderer 实例才能调用 detectSupport）
let _ktx2Loader: KTX2Loader | null = null;

/**
 * 获取 KTX2Loader 单例
 * @param renderer THREE.WebGLRenderer 实例（从 @react-three/fiber 的 useThree 获取）
 */
function getKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  if (!_ktx2Loader) {
    _ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/basis/')  // basis_transcoder.wasm 路径
      .detectSupport(renderer);
  }
  return _ktx2Loader;
}

/**
 * 根据 URL 判断是否为 KTX2 纹理，并选择合适的加载器
 */
async function loadTexture(
  url: string,
  colorSpace: THREE.ColorSpace,
  renderer: THREE.WebGLRenderer
): Promise<THREE.Texture> {
  if (url.toLowerCase().endsWith('.ktx2')) {
    const loader = getKTX2Loader(renderer);
    const texture = await loader.loadAsync(url);
    texture.colorSpace = colorSpace;
    return texture;
  }
  // 普通图片（JPG/PNG/WebP）
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = colorSpace;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}
```

> **basis_transcoder.wasm 路径**：Three.js 的 `KTX2Loader` 需要 `basis_transcoder.wasm` 和 `basis_transcoder.js`。
> 这些文件来自 `node_modules/three/examples/jsm/libs/basis/`，需复制到 `public/basis/`：
>
> ```bash
> cp node_modules/three/examples/jsm/libs/basis/basis_transcoder.wasm packages/client/public/basis/
> cp node_modules/three/examples/jsm/libs/basis/basis_transcoder.js  packages/client/public/basis/
> ```
>
> 复制后 `packages/client/public/basis/` 目录中应有 4 个文件：
> `basis_encoder.wasm`, `basis_encoder.js`, `basis_transcoder.wasm`, `basis_transcoder.js`

---

## Step 6: 在 materialFactory 中集成 renderer 获取

KTX2Loader 需要 `renderer` 实例。由于 `materialFactory.ts` 在 `@react-three/fiber` Canvas 外部也会被调用，需要通过参数或 context 传入 renderer。

**最简方案**：将 `renderer` 作为可选参数传给创建材质的函数：

```typescript
// 只有在需要加载 KTX2 纹理时才需要 renderer
export async function loadMaterialTexture(
  texRef: TextureRef,
  colorSpace: THREE.ColorSpace,
  renderer?: THREE.WebGLRenderer
): Promise<THREE.Texture | null> {
  const url = assetsApi.getAssetDownloadUrl(texRef.assetId);
  if (url.toLowerCase().endsWith('.ktx2')) {
    if (!renderer) {
      console.warn('[materialFactory] KTX2 纹理需要 renderer 实例，已跳过');
      return null;
    }
    return loadTexture(url, colorSpace, renderer);
  }
  return loadTexture(url, colorSpace, renderer!);
}
```

在 `SceneRenderer.tsx` 中，从 `useThree` 获取 renderer 传入：
```typescript
const { gl } = useThree(); // gl = THREE.WebGLRenderer
// 在需要加载纹理时：loadMaterialTexture(texRef, colorSpace, gl)
```

---

## Step 7: 验证 KTX2 纹理在 Three.js 中正确显示

手动测试步骤：
1. 通过 Task 05 的流程上传一张 sRGB 颜色贴图（如 `albedo.jpg`）
2. 在材质 Inspector 中，将"漫反射贴图"设置为刚上传的 `.ktx2` 资产
3. 确认纹理在 3D 视口中颜色正确（不偏灰、不偏暗）
4. 将"法线贴图"用 Linear 色彩空间的 KTX2，确认光照正确

**常见错误**：
- 颜色偏灰/偏暗 → 色彩空间设置错误（颜色贴图应用 sRGB，法线应用 Linear）
- 纹理全黑 → `basis_transcoder.wasm` 路径错误，检查 Network 面板是否 404

---

## Step 8: 运行全量测试

```bash
pnpm --filter client test -- --run
pnpm --filter server test
```

预期：所有测试通过，无回归。

---

## Step 9: Commit

```bash
git add packages/server/src/middleware/upload.ts \
        packages/client/src/features/materials/materialFactory.ts \
        packages/client/public/basis/basis_transcoder.wasm \
        packages/client/public/basis/basis_transcoder.js
git commit -m "feat(textures): 后端允许 ktx2 上传 + materialFactory 支持 KTX2Loader 渲染"
```

---

## 完成后整体验收清单

- [ ] `public/basis/` 目录包含 4 个文件（encoder × 2，transcoder × 2）
- [ ] "纹理"标签页出现"导入纹理（→KTX2）"按钮
- [ ] 选择 JPG/PNG 后弹出参数对话框，实时更新估算数字
- [ ] 点击"转换并上传"后出现进度条（percent 0→100）
- [ ] 资产列表中出现 `.ktx2` 文件，不显示原始 `.jpg/.png`（isSourceTexture 过滤）
- [ ] 将 KTX2 纹理指定给材质后，3D 视口显示颜色正确（sRGB 色彩空间）
- [ ] 全量单元测试通过（`pnpm test`）
