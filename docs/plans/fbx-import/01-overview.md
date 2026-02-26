# 01 - 功能概述与整体架构

## 1. 功能目标

为 Three.js 三维编辑器提供与 Unity 风格一致的 FBX 模型导入体验：

1. 支持本地 FBX 文件选择与校验
2. 弹出导入配置对话框（缩放、法线、格式等设置）
3. 在浏览器端 Web Worker 中完成 FBX → GLB 格式转换
4. 将原始 FBX 和转换后的 GLB 分别上传至服务器
5. Models 面板只展示 GLB 文件
6. Inspector 显示模型的导入配置，支持「重新导入」

---

## 2. 架构决策

| 决策项 | 选择 | 原因 |
|--------|------|------|
| 转换位置 | 浏览器端 Web Worker | 利用已有 Three.js FBXLoader + GLTFExporter，满足「不阻塞编辑器」要求 |
| 存储策略 | FBX + GLB 均保存 | GLB 用于渲染，FBX 用于「重新导入」（修改设置后重新转换） |
| 首次导入 | 弹出配置对话框 | 类 Unity Import Settings，用户可在导入前设置参数 |
| 数据库 | 无需 migration | 利用现有 `metadata` JSONB 字段存储 FBX↔GLB 关联 |

---

## 3. 完整数据流

```
用户点击「添加」→「模型」→「导入FBX」
        ↓
  打开文件选择器（仅 .fbx，≤500MB）
        ↓ 用户选择文件
  校验文件：后缀名 + 文件大小
        ↓ 校验通过
  显示 FBXImportDialog（导入配置对话框）
        ↓ 用户点击「导入」
  FBXImporter.import(file, settings)
        ↓
  显示进度对话框（0%）
        ↓
  postMessage({ fbxBuffer, settings }) → Web Worker
        ↓
  [Worker] FBXLoader.parse(fbxBuffer)
           → 应用 scale / convertUnits
           → 应用 normals / normalsMode
           → GLTFExporter.parseAsync({ binary: true }) → GLB
        ↓ 进度回调（每 10% 更新一次）
  [主线程] 接收 { glbBuffer: ArrayBuffer }
        ↓
  上传 FBX 到服务器（metadata.isSourceFbx = true）
        ↓ 获得 fbxAsset.id
  上传 GLB 到服务器（metadata.sourceFbxAssetId + importSettings）
        ↓
  刷新 assetStore
        ↓
  Models 面板显示新 GLB 资产
```

---

## 4. 资产元数据结构

**FBX 资产**（存储于服务器，不在面板显示）：
```json
{
  "format": "fbx",
  "isSourceFbx": true,
  "originalName": "building.fbx"
}
```

**GLB 资产**（显示在 Models 面板）：
```json
{
  "format": "glb",
  "sourceFbxAssetId": 42,
  "importSettings": {
    "scale": 1.0,
    "convertUnits": true,
    "normals": "import",
    "normalsMode": "areaAndAngle",
    "saveFormat": "glb",
    "embedTextures": true
  }
}
```

**面板过滤逻辑**（ProjectPanel.tsx）：
```ts
// 过滤掉原始 FBX 文件，只显示 GLB
const displayAssets = assets.filter(
  (a) => !(a.metadata as any)?.isSourceFbx
);
```

---

## 5. 重新导入流程

当用户在 Inspector 中修改了导入设置并点击「重新导入」：

```
Inspector 「重新导入」按钮点击
        ↓
从 metadata.sourceFbxAssetId 获取 FBX 资产 ID
        ↓
GET /api/assets/:fbxAssetId/download → FBX ArrayBuffer
        ↓
用新设置在 Web Worker 中重新转换 → 新 GLB
        ↓
PUT /api/assets/:glbAssetId（更新文件内容 + metadata.importSettings）
        ↓
Inspector 刷新显示最新设置
```

> **注意**：PUT 端点目前仅支持更新 metadata，不支持替换文件内容。
> 实现时需要先 DELETE 旧 GLB 资产再 POST 新 GLB 资产，或扩展 PUT 端点支持文件替换。
