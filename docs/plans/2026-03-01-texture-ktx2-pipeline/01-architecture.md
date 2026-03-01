# 纹理 KTX2 转换流水线 — 架构与数据流

## 1. 整体处理流程

```
用户在"纹理"标签页点击"导入纹理"
        │
        ▼
[TextureImportDialog]
  ├─ 显示文件名、原始尺寸
  ├─ 设置区（Mipmap / POT 缩放 / 质量 / Alpha / 色彩空间 / 压缩模式）
  ├─ 实时预览（公式估算：文件大小对比 + 显存占用对比）
  └─ [取消] / [转换并上传]
        │ onConfirm(settings)
        ▼
[TextureConverter.convert(file, settings, projectId, onProgress)]
        │
        ├─① 读取 File → ImageBitmap（获取原始 width/height）
        │
        ├─② 发送至 Web Worker（textureWorker.ts）
        │       │ postMessage({ imageBitmap, settings }, [imageBitmap])
        │       │
        │       ├─ 加载 basis_encoder.wasm（懒加载，首次约 1–2s）
        │       ├─ POT 缩放（OffscreenCanvas，仅 potResize=true 时）
        │       ├─ 提取 RGBA 像素数据（ImageData.data）
        │       ├─ 自动检测 Alpha（若 hasAlpha=false 但像素中 A<255，发 warning）
        │       ├─ basis_encoder 编码 → KTX2 Uint8Array（约 1–30s/张）
        │       └─ postMessage({ type: 'done', ktx2Buffer, detectedAlpha? })
        │
        ├─③ 上传原始 JPG/PNG 到服务器（metadata: isSourceTexture=true）
        └─④ 上传 KTX2 到服务器（metadata: 包含转换参数 + sourceTextureAssetId）
                │
                ▼
        assetsApi.uploadAsset(projectId, ktx2File, 'texture')
```

## 2. Asset 元数据约定

### 原始图片 Asset（隐藏，不在面板显示）

```json
{
  "isSourceTexture": true,
  "format": "jpg",
  "originalName": "texture_albedo.jpg"
}
```

### KTX2 Asset（面板显示）

```json
{
  "format": "ktx2",
  "sourceTextureAssetId": 42,
  "originalDimensions": { "width": 1024, "height": 1024 },
  "ktx2Dimensions": { "width": 1024, "height": 1024 },
  "convertSettings": {
    "generateMipmaps": true,
    "potResize": false,
    "potMode": "nearest",
    "quality": 200,
    "hasAlpha": false,
    "colorSpace": "sRGB",
    "compressionMode": "ETC1S"
  }
}
```

## 3. 目录结构

### 新增文件

```
packages/client/src/features/textures/
├── types.ts                  # TextureConvertSettings + 进度/结果类型
├── TextureConverter.ts       # 协调器（管理 Worker 生命周期 + 上传）
├── textureWorker.ts          # Web Worker（basis_encoder 编码）
├── TextureImportDialog.tsx   # 设置对话框 + 实时预览
└── useTextureImport.ts       # React Hook（供 ProjectPanel 调用）

packages/client/public/
└── basis_encoder.wasm        # WASM 静态资源（约 5MB）
```

### 修改文件

```
packages/client/src/components/panels/ProjectPanel.tsx
  └─ 在"textures"分支添加"导入纹理（→KTX2）"按钮，调用 useTextureImport Hook

packages/server/src/middleware/upload.ts
  └─ allowedMimeTypes 添加 'image/ktx2'
```

### 可选数据库迁移（不改变表结构，仅记录约定）

```
packages/server/migrations/003_texture_ktx2_convention.sql
  └─ 添加注释说明 metadata 字段约定（不 ALTER TABLE）
```

## 4. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 非图片文件（.fbx/.glb 等） | validate 阶段拦截，显示"仅支持 JPG/PNG 格式" |
| 图片尺寸超过 4096×4096 | 显示警告，建议启用 POT 缩放 |
| basis_encoder.wasm 加载失败 | 捕获并显示"转换器加载失败，请刷新页面重试" |
| Worker 编码超时（60s） | terminate worker，显示"编码超时" |
| Alpha 通道被自动检测到 | 显示提示对话框，让用户确认是否保留 Alpha |
| 上传失败 | 显示网络错误，不影响本地编码结果 |
