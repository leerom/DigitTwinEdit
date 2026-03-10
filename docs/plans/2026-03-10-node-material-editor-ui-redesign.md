# 节点材质编辑器 UI 全面重设计

**日期**: 2026-03-10
**范围**: `packages/client/src/features/nodeMaterial/` 全部 UI 组件
**目标**: 与三维编辑器完全一致的设计系统，参考 Blender/Unreal 节点编辑器的专业视觉

---

## 设计系统基准

| Token | 值 | 用途 |
|---|---|---|
| `bg-bg-dark` | `#0c0e14` | 全局背景、画布背景 |
| `bg-panel-dark` | `#161922` | 侧边面板背景 |
| `bg-header-dark` | `#1e222d` | 顶栏/底栏背景 |
| `border-border-dark` | `#2d333f` | 所有边框 |
| `accent-blue` | `#3b82f6` | 强调色/选中/保存按钮 |
| `text-primary` | `#cbd5e1` | 主文字 (slate-300) |
| `text-secondary` | `#64748b` | 次级文字 (slate-500) |
| 字体 | Inter + Microsoft YaHei | display font |

---

## 各区域设计规范

### 1. 顶部工具栏

- 高度: `h-10`（40px），与编辑器 Header 一致
- 背景: `bg-header-dark`
- 边框: `border-b border-border-dark`
- 左侧: 返回按钮 + 竖分隔线 `w-px h-4 bg-border-dark` + `device_hub` 图标 + 面包屑 `节点材质 / {materialName}`
- 右侧: undo/redo 图标按钮（`hover:bg-white/5 rounded`） + 竖分隔线 + 保存按钮
- 保存按钮状态色:
  - idle: `bg-accent-blue hover:bg-accent-blue/90`
  - saving: `animate-pulse bg-accent-blue/70`
  - saved: `bg-green-600` + `check` 图标
  - error: `bg-red-600`

### 2. 节点库面板

- 宽度: `w-52`（208px）
- 背景: `bg-panel-dark`
- 边框: `border-r border-border-dark`
- 顶部标题: `px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500` + `NODES` 文字
- 搜索框: `bg-bg-dark border-border-dark focus:ring-accent-blue/50`
- 分类标题:
  - 左侧 `3px` 色条（品类颜色），行高 `py-1.5`
  - 背景: hover `bg-white/5`
  - 展开/收起图标
- 节点项:
  - 左侧 `8px` 彩色圆点（品类颜色）
  - hover: `bg-white/5` + 文字变 `text-white`
  - 带 `draggable` + `onDoubleClick` 双触发

### 3. 节点卡片（BaseNode）

- 最小宽度: `min-w-[172px]`
- 卡片体: `bg-[#1a1e28]`、`rounded-md`、`shadow-xl shadow-black/60`
- 边框:
  - 默认: `border border-border-dark`
  - 选中: `border-accent-blue ring-2 ring-accent-blue/30`
- 标题栏:
  - 背景: 品类色
  - 内容: category icon + label，`text-[11px] font-semibold`，`py-1.5 px-2.5`
  - 圆角: `rounded-t-md`
- 分隔线: `border-b border-black/30`
- Body padding: `py-2`
- 输入 Port 区（左）:
  - Port handle: `!rounded-full !w-3 !h-3 !border-2 !border-white/30`，填充品类色，`hover:scale-125 transition-transform`
  - label: `text-[11px] text-slate-400 ml-3.5 mr-2`
- 输出 Port 区（右）:
  - Port handle: 同上
  - label: `text-[11px] text-slate-200 mr-3.5 ml-2`
- 内联编辑控件:
  - 输入框: `bg-bg-dark border-border-dark text-white text-[11px]`
  - 颜色选择器: 带颜色预览块

### 4. React Flow 画布

- 背景: `bg-bg-dark`
- Background 插件: `BackgroundVariant.Dots`, color=`#2d333f`, gap=24, size=1.5
- 连接线:
  - `connectionLineType="smoothstep"`（SmoothStep 贝塞尔）
  - 边默认 strokeWidth=2，颜色 `#4d5566`
  - animated=false（保持简洁，不用流动动画）
- Controls 控件: 深色样式覆盖（inline style 注入，因 ReactFlow Controls 不支持 className 深度覆盖）
  - 背景 `#161922`，边框 `#2d333f`，图标颜色 `#94a3b8`
- MiniMap 新增:
  - 位置右下角，`bg-header-dark border border-border-dark rounded`
  - 节点颜色: 按 category 颜色映射
  - 宽 120px，高 80px

### 5. 属性面板（PropertyPanel）

- 背景: `bg-panel-dark`
- 标题区: `px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-b border-border-dark`
- 字段行: label（`text-[11px] text-slate-400`）+ input（下一行，全宽，`bg-bg-dark border-border-dark`）
- "未选中节点"占位: 带图标居中

### 6. 预览面板（PreviewPanel）

- 高度: `h-52`（208px）
- 顶部标题行: `px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 border-b border-border-dark flex items-center gap-1.5`
  - 图标: `sphere` 或 `view_in_ar`
  - 文字: `PREVIEW`
- Canvas 区域: 占满剩余高度，`bg-black`
- 错误浮层: `absolute inset-x-2 bottom-2` + 红色图标 + `text-[10px]` 错误文字

### 7. 底部状态栏

- 高度: `h-6`（24px），与三维编辑器 footer 完全一致
- 背景: `bg-header-dark`
- 边框: `border-t border-border-dark`
- 字号: `text-[9px] text-slate-500`
- 左侧: 状态图标 + 文字（idle/saving/saved/error）
- 右侧: 节点数统计（`{n} 节点 · {e} 连线`）

---

## 文件修改清单

| 文件 | 修改内容 |
|---|---|
| `NodeMaterialEditor.tsx` | 顶栏、状态栏、主容器样式 |
| `NodeLibraryPanel.tsx` | 面板背景、分类标题、节点项样式 |
| `NodeCanvas.tsx` | ReactFlow props、Background、Controls 样式、MiniMap、connectionLineType |
| `BaseNode.tsx` | 卡片结构、port 样式、选中效果、分隔线 |
| `PropertyPanel.tsx` | 背景、标题区、字段布局 |
| `PreviewPanel.tsx` | 标题行、错误浮层、高度 |
| `InputNode.tsx` | 内联控件样式对齐 |

---

## 不变内容

- 所有逻辑/Hook/Store 不变
- 测试文件不变
- 节点颜色体系（PORT_COLORS、CATEGORY colors）保留但视觉尺寸优化
