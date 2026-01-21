# 快速开始: UI 优化开发指南

**分支**: `002-optimize-editor-ui`

## 环境准备

1. **依赖安装**:
   本功能无需安装新的 npm 包（`material-symbols` 通过 CDN 引入）。
   确保已安装现有依赖: `npm install`

2. **字体与图标**:
   检查 `index.html` 是否包含以下 `<link>` 标签（将由开发任务添加）：
   - Material Symbols Outlined
   - Inter Font
   - JetBrains Mono Font

## 开发流程

1. **样式配置**:
   - 修改 `tailwind.config.js`，添加 `code.html` 中定义的颜色变量 (`bg-dark`, `panel-dark`, `primary` 等)。
   - 在 `src/index.css` 中添加 `.material-symbols-outlined` 和 `.custom-scrollbar` 的基础样式。

2. **布局重构**:
   - 从 `src/components/layout/MainLayout.tsx` 开始，实现 5 区域 Grid 布局。
   - 替换现有的 Flex 布局结构。

3. **组件迁移**:
   - 将 `Hierarchy`, `Inspector` 等现有组件的内容迁移到新的 `Panel` 容器中。
   - 使用 `material-symbols-outlined` 类替换现有的 Lucide 图标组件。
     - 例如: `<span class="material-symbols-outlined">save</span>` 替代 `<SaveIcon />`

4. **视口优化**:
   - 在 `SceneView.tsx` 中引入新的 `ViewportOverlay` 组件。
   - 确保 Overlay 位于 Canvas 之上 (`absolute inset-0 pointer-events-none`)，且内部按钮可交互 (`pointer-events-auto`)。

## 调试技巧

- 使用 Chrome DevTools 的 "Toggle Device Toolbar" 测试不同分辨率下的布局适应性。
- 使用 Tailwind 的 `bg-red-500` 等高亮色临时标记布局区域边界。
