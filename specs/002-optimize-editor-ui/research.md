# 研究报告: 编辑器 UI 优化技术方案

**分支**: `002-optimize-editor-ui` | **日期**: 2026-01-21

## 决策摘要

### 1. 图标库集成方案
- **决策**: 采用 **Google Fonts CDN** (`<link>`) 引入 Material Symbols Outlined。
- **理由**:
  1.  **视觉一致性**: 能够 100% 还原 `code.html` 的设计效果，支持 Font Variation Settings (权重、填充等)。
  2.  **简单至上**: 符合 Constitution 的 Native-First 和 MVP 原则，无需复杂的构建配置或大量 npm 依赖。
  3.  **零构建成本**: 相比引入 huge icon package，CDN 方式在开发阶段最轻量。
- **替代方案**:
  - `npm install material-symbols`: 包体积过大，Tree-shaking 配置复杂。
  - `lucide-react`: 风格不匹配，放弃。
  - `@fontsource`: 作为生产环境自托管的后续优化选项。

### 2. 布局重构策略
- **决策**: 使用 `grid` + `flex` 混合布局。
  - 最外层使用 CSS Grid 定义 5 区域 (Header, Sidebar-L, Main, Sidebar-R, Footer)。
  - 面板内部使用 Flexbox 进行流式排版。
- **理由**: Grid 在处理固定侧边栏 + 自适应中间区域（Viewport）时比纯 Flex 更稳定，且易于实现 5 面板的标准布局。

### 3. 悬浮工具栏实现
- **决策**: 在 `src/components/viewport` 下新建 `ViewportOverlay` 组件，使用绝对定位 (`absolute`) 覆盖在 Canvas 之上。
- **理由**: 简单有效，配合 `pointer-events-none` 和 `pointer-events-auto` 精确控制交互区域，无需 Portal。

## 详细研究发现

### Material Symbols 使用规范

为了匹配设计稿，需在全局 CSS 中添加以下类定义：

```css
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 18px;  /* 默认大小 */
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  /* 支持可变字体设置 */
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
}
```

### 字体配置

设计稿引用了 `Inter` 和 `JetBrains Mono`。Tailwind 配置需更新：

```javascript
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      display: ["Inter", "Microsoft YaHei", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    // ... colors
  }
}
```

需在 `index.html` 引入相应 Google Fonts 链接。
