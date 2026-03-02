# 纹理导入参数检视与重新导入 — 设计文档

**日期：** 2026-03-02
**状态：** 已批准
**关联功能：** 点击 Textures 中的文件图标，在属性检视器显示导入参数，并允许修改后重新导入

---

## 背景

当用户在 ProjectPanel 的 Textures 文件夹中选中一个 KTX2 贴图资产后，InspectorPanel 应展示该贴图的原始导入参数（压缩模式、质量、色彩空间等），并允许用户修改参数后触发重新导入（保持 assetId 不变）。

该功能直接对标已有的"模型导入参数检视 + 重新导入"功能（`ModelImportProp` + `FBXImporter.reimport()`），架构完全一致。

---

## 数据基础

KTX2 资产（`asset.mime_type === 'image/ktx2'`）的 `metadata` 中已存有：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sourceTextureAssetId` | `number` | 源 PNG/JPG 资产 ID |
| `convertSettings` | `TextureConvertSettings` | 转换时使用的参数 |
| `originalDimensions` | `{width, height}` | 原始图像尺寸 |
| `ktx2Dimensions` | `{width, height}` | 转换后图像尺寸 |
| `originalName` | `string` | 原始文件名（存在源资产 metadata 中） |

---

## 架构设计

### 选用方案

**方案 A（推荐）**：新建 `TextureImportProp` 组件，仿照 `ModelImportProp`，并在 `TextureConverter` 中添加 `reimport()` 方法。

理由：
- 与模型导入的现有模式完全对称，代码一致性最佳
- 可在 Inspector 内联展示所有参数，无需弹出第二个对话框
- `replaceAssetFile` API 已就绪，可保持 assetId 不变（不破坏材质引用）

### 数据流

```
用户点击 Textures 中的贴图图标
    → ProjectPanel.handleSelect(asset.id) → selectAsset(assetId)
    → InspectorPanel 进入"资产检视模式"（activeId 为空，selectedAssetId 非空）
        → 资产头部
            - 图标：image（贴图）
            - 缩略图：若 KTX2 则找 sourceTextureAssetId 的 PNG；否则直接 value.url
            - 名称 + 类型 + 文件大小
        → TextureImportProp（仅当 mime_type === 'image/ktx2' 且 metadata.sourceTextureAssetId 存在）
            - 显示 metadata.convertSettings 的所有参数（可编辑）
            - isDirty 检测（与 metadata 中保存的参数比较）
            - "重新导入"按钮（仅 isDirty && 源文件存在时启用）
                → TextureConverter.reimport(asset, newSettings, onProgress)
                    1. fetch 下载源 PNG（credentials: 'include'）
                    2. createImageBitmap → _encodeInWorker（Worker 重新编码）
                    3. assetsApi.replaceAssetFile(asset.id, newKtx2File)（原地替换文件）
                    4. assetsApi.updateAsset(asset.id, { metadata: { ...metadata, convertSettings: newSettings } })
                → loadAssets(projectId, 'texture') 刷新列表
```

---

## 文件变更清单

| 文件 | 类型 | 变更内容 |
|------|------|---------|
| `features/textures/TextureConverter.ts` | 修改 | 添加 `reimport(asset, settings, onProgress)` 公有方法 |
| `components/inspector/TextureImportProp.tsx` | 新建 | 纹理导入设置 Inspector 区域（含重新导入逻辑） |
| `components/inspector/TextureImportProp.test.tsx` | 新建 | 单元测试 |
| `components/panels/InspectorPanel.tsx` | 修改 | 资产头改造（纹理缩略图）；引入并渲染 `TextureImportProp` |

---

## 关键实现细节

### TextureConverter.reimport()

```typescript
async reimport(
  ktx2Asset: Asset,
  newSettings: TextureConvertSettings,
  onProgress: (p: TextureConvertProgress) => void
): Promise<Asset>
```

步骤：
1. 从 `ktx2Asset.metadata.sourceTextureAssetId` 获取源图 ID
2. `fetch(getAssetDownloadUrl(sourceId), { credentials: 'include' })` 下载源 PNG
3. `createImageBitmap(blob)` 读取宽高
4. `this._encodeInWorker(imageBitmap, newSettings, w, h, progressCb)` 编码 KTX2（进度 10%→80%）
5. `assetsApi.replaceAssetFile(ktx2Asset.id, newKtx2File, uploadCb)` 原地替换（80%→95%）
6. `assetsApi.updateAsset(ktx2Asset.id, { metadata: { ...原有 metadata, convertSettings: newSettings } })` 更新参数（95%→100%）
7. 返回更新后的 Asset

### TextureImportProp

- 仅当 `asset.mime_type === 'image/ktx2'` 且 `metadata.sourceTextureAssetId` 存在时渲染
- `savedSettings` 取自 `metadata.convertSettings`（如不存在则用 `DEFAULT_TEXTURE_CONVERT_SETTINGS`）
- `localSettings` state 用于本地编辑
- `isDirty = JSON.stringify(localSettings) !== JSON.stringify(savedSettings)`
- 当 `savedSettings` 变化（重新导入完成后 asset 刷新）时，通过 `useEffect` 重置 `localSettings`
- "重新导入"按钮：`disabled={!isDirty || isReimporting || !sourceExists}`
- 进度信息内联展示在按钮内（spinner + step 文字）

### InspectorPanel 资产头改造

当 `selectedAsset.type === 'texture'` 时：
- 图标改为 `image`
- 若 `mime_type === 'image/ktx2'` 且存在 `sourceTextureAssetId`：使用源 PNG 的下载 URL 作为缩略图 `<img>`
- 否则：显示默认 `image` 图标

---

## 测试策略

**单元测试（Vitest + @testing-library/react）：**
1. 普通 PNG 资产不渲染 `TextureImportProp`
2. KTX2 且无 `sourceTextureAssetId` 的资产不渲染 `TextureImportProp`
3. 有效 KTX2 资产渲染所有导入参数
4. 修改参数后 isDirty badge 出现，"重新导入"按钮可用
5. 重置参数后 isDirty 消失，按钮禁用
6. 源文件不存在时显示警告且按钮禁用
7. 点击"重新导入"调用 `TextureConverter.reimport()`，完成后调用 `loadAssets`

---

## 限制与说明

- 重新导入使用 `replaceAssetFile` 原地替换文件，**assetId 不变**，不破坏已有材质中的贴图引用
- 源 PNG（`isSourceTexture: true`）不会被修改，仅作为编码原材料
- 纯 PNG/JPG 资产（非 KTX2 转换产物）不显示导入参数区域（原始图未经 KTX2 转换流水线）
