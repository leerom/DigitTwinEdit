# 界面交互优化设计文档

**日期**：2026-03-08
**状态**：需求1已完成；需求2待实施

---

## 概述

本次优化包含两项独立的界面交互改进：

1. 删除 Header 右上角的 `SceneSwitcher` 下拉按钮，并重组"场景"菜单分区
2. IBL/Environments 资产在属性检视器（Inspector）头部显示预览缩略图

---

## 需求1：删除右上角 SceneSwitcher 并重组场景菜单分区

### 问题

- Header 右上角的 `SceneSwitcher` 组件显示当前场景名称及下拉切换菜单，与 ProjectPanel 底部的场景切换功能重复，布局上也显冗余。
- "场景"下拉菜单的分区逻辑不清晰（新建/打开/保存分散在不同区）。

### 实际变更（已完成）

**改动文件**：`packages/client/src/components/layout/Header.tsx`

**变更1：删除 `SceneSwitcher`**

- 移除 `import { SceneSwitcher } from '../../features/scene/components/SceneSwitcher'`
- 移除 Header 右侧区域的 `<SceneSwitcher />` 及其两侧分隔线
- 右侧区域现在只保留 `<UserMenu />`（含一条左侧分隔线）

**变更2：重组 `sceneMenuItems` 分区**

重组后的菜单结构：

| 分区 | 条目 |
|------|------|
| 第一区（场景操作） | 新建场景 / 打开场景 / 保存场景 / 场景另存为 |
| 分隔线 | |
| 第二区（导入导出） | 导入场景 / 导出场景 |
| 分隔线 | |
| 第三区（项目操作） | 新建项目 / 打开项目 / 保存项目 |

`useNewSceneFlow` hook 及对应的新建场景/保存确认对话框保留在 Header.tsx 中（供"新建场景"菜单项触发）。

---

## 需求2：IBL 资产在 Inspector 头部显示预览缩略图

### 问题

IBL（HDR/EXR）资产导入后，在 Inspector 中以图标替代缩略图显示，原因如下：

- `InspectorPanel.tsx` 的 `textureThumbnailUrl` 计算仅处理 KTX2 类型（`mime_type === 'image/ktx2'`）和普通纹理（直接返回下载 URL）
- IBL runtime 资产的 mime_type 为 `image/vnd.radiance` 或 `image/x-exr`，属于"普通纹理"分支
- 浏览器无法将 HDR/EXR 文件作为 `<img>` src 渲染

### 现有数据基础

IBL 导入管线（`IBLConverter.ts`）已在 `runtimeAsset.metadata` 中存储：

```json
{
  "usage": "ibl",
  "previewAssetId": <number>,
  ...
}
```

预览 PNG 在导入时已上传到服务器，可通过 `assetsApi.getAssetDownloadUrl(previewId)` 访问。

### 方案（待实施）

**改动文件**：`packages/client/src/components/panels/InspectorPanel.tsx`

在 `textureThumbnailUrl` 的 `useMemo` 中，在"非 KTX2 直接返回下载 URL"前插入 `previewAssetId` 检查：

```typescript
// 非 KTX2 路径：先检查 previewAssetId（IBL/HDR/EXR 资产的预览 PNG）
const nonKtxPreviewId = meta?.previewAssetId as number | undefined;
if (nonKtxPreviewId) {
  const previewAsset = assets.find((a) => a.id === nonKtxPreviewId);
  if (previewAsset) {
    return `${assetsApi.getAssetDownloadUrl(nonKtxPreviewId)}?v=${new Date(previewAsset.updated_at).getTime()}`;
  }
}
// 普通纹理（PNG/JPG）直接使用下载 URL
return `${assetsApi.getAssetDownloadUrl(selectedAsset.id)}?v=...`;
```

### 副作用分析

- `previewAssetId` 字段目前仅 IBL 资产使用，普通 KTX2 纹理使用 `sourceTextureAssetId`，无冲突
- 新增代码仅在 `previewAsset` 存在时才生效，不影响不含 `previewAssetId` 的资产

---

## 变更文件汇总

| 文件 | 变更类型 | 状态 |
|------|---------|------|
| `packages/client/src/components/layout/Header.tsx` | 删除 SceneSwitcher + 重组菜单分区 | 已完成 |
| `packages/client/src/components/panels/InspectorPanel.tsx` | `textureThumbnailUrl` 增加 IBL 预览分支 | 待实施 |

---

## 测试要点

1. 确认 Header 右上角不再显示场景名称下拉按钮
2. 确认"场景"菜单三个分区结构正确，各条目功能正常
3. 确认新建场景流程（弹出命名对话框、保存确认）仍可正常触发
4. 在 Environments 文件夹中导入 HDR/EXR，点击资产后 Inspector 头部显示预览 PNG
5. 已有纹理（KTX2/PNG）资产的 Inspector 缩略图展示无退化
