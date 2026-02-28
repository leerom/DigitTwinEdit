# 材质属性视图全量参数扩展 — 实施计划索引

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 在 Inspector 属性视图中为 MeshStandardMaterial 和 MeshPhysicalMaterial 补全所有缺失的标量（数值/颜色/布尔）参数及贴图槽位，支持用户修改参数并实时反映到场景视图中的三维对象。

**Architecture:** Schema 驱动方案——以字段元数据（`MaterialFieldDef[]`）驱动通用 UI 渲染器，渲染层通过 `applyTextureProps` 处理异步贴图加载。贴图引用以 `{assetId, url}` 序列化存储于 `MaterialSpec.props`。

**Tech Stack:** React + TypeScript + Three.js r173 + Zustand + @react-three/fiber + Vitest

**设计文档:** `docs/plans/2026-02-28-material-inspector-design.md`

---

## 执行顺序（严格依序，每步依赖前步）

| 计划 | 文件 | 主要内容 | 依赖 |
|------|------|---------|------|
| [Plan 01](./plan-01-schema-normalize.md) | materialSchema.ts + normalizeMaterialProps.ts | 字段 Schema 定义 + 白名单扩展 | 无 |
| [Plan 02](./plan-02-ui-primitives.md) | ColorInput.tsx + Vector2Field.tsx | 通用 UI 原子组件 | 无 |
| [Plan 03](./plan-03-texture-picker.md) | TexturePicker.tsx | 贴图选取/上传弹出层 | Plan 01 |
| [Plan 04](./plan-04-material-prop.md) | MaterialFieldRenderer.tsx + MaterialProp.tsx | Schema 驱动渲染器 + Inspector 改造 | Plan 01, 02, 03 |
| [Plan 05](./plan-05-factory-renderer.md) | materialFactory.ts + SceneRenderer.tsx | 贴图异步加载 + 渲染层更新 | Plan 01 |
| [Plan 06](./plan-06-subnode.md) | SubNodeInspector.tsx | 子节点材质区域扩展 | Plan 04, 05 |

---

## 前置知识

### 关键文件速查

```
packages/client/src/
  features/materials/
    materialFactory.ts          — createThreeMaterial()，直接传 props 给 Three.js 构造函数
    normalizeMaterialProps.ts   — 材质类型切换时的白名单过滤 + 默认值
  components/inspector/
    MaterialProp.tsx            — 材质 Inspector UI（当前：8 字段硬编码）
    SubNodeInspector.tsx        — GLTF 子节点 Inspector（当前：3 字段硬编码）
    common/
      NumberInput.tsx           — 带 clamp 的数值输入框（已有）
      Checkbox.tsx              — 布尔复选框（已有）
  features/scene/
    SceneRenderer.tsx           — ObjectRenderer：materialRef 管理 + props 同步逻辑
  features/editor/commands/
    UpdateMaterialPropsCommand.ts — 材质属性变更命令（支持 undo/redo + merge）
  types/index.ts                — MaterialSpec = {type, props: Record<string,unknown>}
```

### 测试命令

```bash
# 运行单个测试文件
pnpm --filter client test -- --run src/features/materials/materialSchema.test.ts

# 运行所有材质相关测试
pnpm --filter client test -- --run src/features/materials

# 运行 Inspector 相关测试
pnpm --filter client test -- --run src/components/inspector
```

### 渲染层材质更新机制（重要）

`SceneRenderer.ObjectRenderer` 用两种策略同步材质变化：
- **类型变更**：dispose 旧材质，`createThreeMaterial(spec)` 重建新实例
- **Props 变更**：`useEffect` 中遍历 props，逐项赋值到现有材质实例，最后 `mat.needsUpdate = true`

贴图 props（`{assetId, url}` 对象）需在 props 遍历时特殊处理：跳过赋值，改为异步 `TextureLoader.load` + 完成后设 `mat[key] = tex; mat.needsUpdate = true`。
