# 开发快速入门 (Quickstart)

**分支**: `001-3d-scene-editor`

本指南将帮助你快速搭建数字孪生三维场景编辑器的开发环境并运行项目。

## 环境要求

- **Node.js**: v18.0.0 或更高版本
- **包管理器**: pnpm (推荐) 或 npm
- **浏览器**: Chrome 120+ 或支持 WebGL 2.0 的现代浏览器
- **IDE**: VS Code (推荐安装 ESLint, Prettier, Tailwind CSS IntelliSense 插件)

## 安装步骤

1. **克隆仓库** (如果尚未克隆):
   ```bash
   git clone <repository-url>
   cd DigitTwinEdit
   ```

2. **切换到功能分支**:
   ```bash
   git checkout 001-3d-scene-editor
   ```

3. **安装依赖**:
   ```bash
   pnpm install
   # 或者
   npm install
   ```

## 运行项目

### 启动开发服务器
```bash
pnpm dev
```
访问 `http://localhost:5173` 查看编辑器。

### 运行测试
```bash
# 运行单元测试
pnpm test

# 运行 UI 测试模式
pnpm test:ui

# 运行覆盖率报告
pnpm coverage
```

## 开发指南

### 目录结构导航
- **`src/features/editor`**: 编辑器核心逻辑（工具、命令、状态机）。
- **`src/features/scene`**: 场景图数据结构与操作。
- **`src/components/viewport`**: R3F 场景渲染组件。
- **`src/stores`**: Zustand 全局状态定义。

### 常用命令
- `pnpm lint`: 代码风格检查
- `pnpm build`: 构建生产版本
- `pnpm preview`: 预览构建产物

### 调试技巧
- **Three.js 调试**: 场景中已集成 `<Perf />` (r3f-perf)，点击右上角可查看 Draw Calls 和 FPS。
- **状态调试**: 安装 Redux DevTools 浏览器插件，可查看 Zustand 状态变化（如果开启了 devtools 中间件）。
- **React 渲染**: 使用 React Developer Tools 查看组件重渲染情况，优化性能。

## 注意事项
- 提交代码前请确保通过所有测试 (`pnpm test`)。
- 遵循 "中文优先" 原则，注释和文档请使用中文。
- 遇到 3D 渲染问题，请优先检查浏览器控制台是否有 WebGL 错误。
