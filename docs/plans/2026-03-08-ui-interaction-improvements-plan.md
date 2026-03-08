# UI 界面交互优化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 删除 Header 右上角 SceneSwitcher 下拉按钮并重组"场景"菜单分区，同时让 IBL/Environments 资产在 Inspector 头部正确显示预览缩略图。

**Architecture:** 两个独立的前端组件改动。Task 1 已完成（Header.tsx）；Task 2 是在现有 `textureThumbnailUrl` 计算逻辑中插入一个 IBL 预览分支（InspectorPanel.tsx）。

**Tech Stack:** React + TypeScript，Zustand store，`assetsApi.getAssetDownloadUrl`

---

### Task 1：删除 SceneSwitcher 并重组场景菜单分区 ✅ 已完成

**Files:**
- Modified: `packages/client/src/components/layout/Header.tsx`

**完成内容：**

1. 移除 `import { SceneSwitcher }` 及 JSX 中的 `<SceneSwitcher />` 和相邻分隔线
2. 右侧区域保留 `<UserMenu />` + 左侧分隔线
3. 重组 `sceneMenuItems`：
   - **第一区**（无分隔）：新建场景 / 打开场景 / 保存场景 / 场景另存为
   - **分隔线**
   - **第二区**：导入场景 / 导出场景
   - **分隔线**
   - **第三区**：新建项目 / 打开项目 / 保存项目
4. `useNewSceneFlow` hook 及对应对话框保留（供"新建场景"菜单项触发）

---

### Task 2：InspectorPanel 支持 IBL 资产预览缩略图

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`（`textureThumbnailUrl` useMemo，约第66-89行）
- Test: `packages/client/src/components/panels/InspectorPanel.test.tsx`

---

**Step 1：理解现有 `textureThumbnailUrl` 逻辑**

阅读 `InspectorPanel.tsx` 约第66-89行，当前逻辑：

```typescript
const textureThumbnailUrl = useMemo(() => {
  if (!selectedAsset) return null;
  if (selectedAsset.type !== 'texture' && (selectedAsset.type as string) !== 'image') return null;
  const meta = selectedAsset.metadata as Record<string, unknown> | undefined;
  if (selectedAsset.mime_type === 'image/ktx2') {
    // KTX2 路径：previewAssetId → sourceTextureAssetId
    ...
    return null;
  }
  // 非 KTX2：直接返回下载 URL（IBL 的 HDR/EXR 无法被 <img> 渲染！）
  return `${assetsApi.getAssetDownloadUrl(selectedAsset.id)}?v=...`;
}, [selectedAsset, assets]);
```

IBL runtime 资产的 `mime_type` 为 `image/vnd.radiance` 或 `image/x-exr`，不进入 KTX2 分支，直接返回 HDR/EXR 下载 URL，浏览器无法渲染。

---

**Step 2：在非 KTX2 路径插入 `previewAssetId` 检查**

找到 `textureThumbnailUrl` useMemo 中最后一行 `return \`...getAssetDownloadUrl(selectedAsset.id)...\``，在其**前**插入：

```typescript
// 非 KTX2 但有 previewAssetId（IBL/HDR/EXR 资产的预览 PNG）
const nonKtxPreviewId = meta?.previewAssetId as number | undefined;
if (nonKtxPreviewId) {
  const previewAsset = assets.find((a) => a.id === nonKtxPreviewId);
  if (previewAsset) {
    return `${assetsApi.getAssetDownloadUrl(nonKtxPreviewId)}?v=${new Date(previewAsset.updated_at).getTime()}`;
  }
}
```

修改后完整 useMemo 结构：

```typescript
const textureThumbnailUrl = useMemo(() => {
  if (!selectedAsset) return null;
  if (selectedAsset.type !== 'texture' && (selectedAsset.type as string) !== 'image') return null;
  const meta = selectedAsset.metadata as Record<string, unknown> | undefined;
  if (selectedAsset.mime_type === 'image/ktx2') {
    const previewId = meta?.previewAssetId as number | undefined;
    if (previewId) {
      const previewAsset = assets.find((a) => a.id === previewId);
      if (previewAsset) {
        return `${assetsApi.getAssetDownloadUrl(previewId)}?v=${new Date(previewAsset.updated_at).getTime()}`;
      }
    }
    const sourceId = meta?.sourceTextureAssetId as number | undefined;
    if (sourceId) {
      const sourceAsset = assets.find((a) => a.id === sourceId);
      if (sourceAsset) {
        return `${assetsApi.getAssetDownloadUrl(sourceId)}?v=${new Date(sourceAsset.updated_at).getTime()}`;
      }
    }
    return null;
  }
  // 新增：非 KTX2 但有 previewAssetId（IBL/HDR/EXR 资产的预览 PNG）
  const nonKtxPreviewId = meta?.previewAssetId as number | undefined;
  if (nonKtxPreviewId) {
    const previewAsset = assets.find((a) => a.id === nonKtxPreviewId);
    if (previewAsset) {
      return `${assetsApi.getAssetDownloadUrl(nonKtxPreviewId)}?v=${new Date(previewAsset.updated_at).getTime()}`;
    }
  }
  return `${assetsApi.getAssetDownloadUrl(selectedAsset.id)}?v=${new Date(selectedAsset.updated_at).getTime()}`;
}, [selectedAsset, assets]);
```

---

**Step 3：运行现有 Inspector 测试确认无退化**

```bash
pnpm --filter client test -- --run src/components/panels/InspectorPanel
```

预期：全部通过。

---

**Step 4：运行全量单元测试**

```bash
pnpm --filter client test -- --run
```

预期：全部通过。

---

**Step 5：Commit**

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): show preview thumbnail for IBL/HDR/EXR environment assets"
```

---

## 验收清单

- [x] Header 右上角不再显示场景名称下拉按钮（SceneSwitcher 已移除）
- [x] "场景"菜单三个分区结构正确（第一区：新建/打开/保存/另存为；第二区：导入/导出；第三区：项目操作）
- [x] 新建场景流程（弹出命名对话框、保存确认）可正常触发
- [ ] 在 Environments 文件夹中选中已导入的 IBL 资产，Inspector 头部显示预览 PNG 而非图标
- [ ] 在 Textures 文件夹中选中 KTX2 纹理，Inspector 缩略图展示无退化
- [ ] 在 Textures 文件夹中选中普通 PNG/JPG 纹理，Inspector 缩略图展示无退化
