# 设计 & 实施计划索引

本目录按功能域分组，每个功能通常包含两个文件：
- `*-design.md` — 设计文档（需求、架构、数据流、边界情况）
- `*.md`（无 -design 后缀）— 逐步实施计划（TDD 任务清单）

---

## 目录结构

| 子目录 | 内容 | 文件数 |
|--------|------|--------|
| [scene/](#scene-场景管理--视口) | 场景管理、视口交互、渲染模式 | 12 |
| [inspector/](#inspector-检视器) | 属性检视器、右键菜单、快捷键 | 5 |
| [materials/](#materials-材质系统) | 材质编辑器、检视器、预览 | 4 |
| [hierarchy/](#hierarchy-层级--子节点) | 模型层级、缩略图、子节点 Gizmo | 5 |
| [textures/](#textures-纹理) | 纹理重导入、纹理检视 | 2 |
| [backend/](#backend-后端--基础设施) | 认证系统、资产存储 | 2 |

---

## scene/ 场景管理 & 视口

| 日期 | 设计 | 实施计划 | 描述 |
|------|------|----------|------|
| 2026-01-21 | [scene-import-design](scene/2026-01-21-scene-import-design.md) | [scene-import](scene/2026-01-21-scene-import.md) | FBX 场景导入管线 |
| 2026-01-22 | [hide-scene-root-design](scene/2026-01-22-hide-scene-root-design.md) | [hide-scene-root](scene/2026-01-22-hide-scene-root.md) | 隐藏场景根节点 |
| 2026-01-22 | [new-scene-feature-design](scene/2026-01-22-new-scene-feature-design.md) | [new-scene-feature](scene/2026-01-22-new-scene-feature.md) | 新建场景功能 |
| 2026-01-22 | [sceneview-keyboard-mouse-interaction-design](scene/2026-01-22-sceneview-keyboard-mouse-interaction-design.md) | — | 视口键鼠交互设计 |
| 2026-02-10 | — | [wireframe-fix](scene/2026-02-10-wireframe-fix.md) | 线框渲染模式修复 |
| 2026-02-12 | [scene-menu-new-scene-redesign](scene/2026-02-12-scene-menu-new-scene-redesign.md) | [scene-menu-new-scene-implementation](scene/2026-02-12-scene-menu-new-scene-implementation.md) | 场景菜单新建场景重设计 |
| 2026-02-18 | [scenes-context-menu-new-scene-design](scene/2026-02-18-scenes-context-menu-new-scene-design.md) | [scenes-context-menu-new-scene](scene/2026-02-18-scenes-context-menu-new-scene.md) | 场景列表右键菜单新建场景 |

---

## inspector/ 检视器

| 日期 | 设计 | 实施计划 | 描述 |
|------|------|----------|------|
| 2026-01-22 | [inspector-enhancement-design](inspector/2026-01-22-inspector-enhancement-design.md) | [inspector-enhancement](inspector/2026-01-22-inspector-enhancement.md) | Inspector 属性增强 |
| 2026-01-24 | [delete-shortcut-design](inspector/2026-01-24-delete-shortcut-design.md) | — | Delete 快捷键删除对象 |
| 2026-02-11 | [context-menu-design](inspector/2026-02-11-context-menu-design.md) | [context-menu](inspector/2026-02-11-context-menu.md) | 右键上下文菜单系统 |

---

## materials/ 材质系统

| 日期 | 设计 | 实施计划 | 描述 |
|------|------|----------|------|
| 2026-01-27 | [materials-editor-design](materials/2026-01-27-materials-editor-design.md) | [materials-editor](materials/2026-01-27-materials-editor.md) | 材质资产编辑器 |
| 2026-02-28 | [material-inspector-design](materials/2026-02-28-material-inspector-design.md) | — | 材质属性检视器（Schema 化字段） |
| 2026-03-03 | [material-preview-design](materials/2026-03-03-material-preview-design.md) | — | Inspector 底部材质预览面板 ✅ 已实施 |

---

## hierarchy/ 层级 & 子节点

| 日期 | 设计 | 实施计划 | 描述 |
|------|------|----------|------|
| 2026-02-26 | [hierarchy-submodel-design](hierarchy/2026-02-26-hierarchy-submodel-design.md) | — | 子模型层级展示设计 |
| 2026-02-26 | [model-hierarchy-thumbnail-design](hierarchy/2026-02-26-model-hierarchy-thumbnail-design.md) | [model-hierarchy-thumbnail](hierarchy/2026-02-26-model-hierarchy-thumbnail.md) | 模型层级缩略图 |
| 2026-02-27 | [subnode-gizmo-design](hierarchy/2026-02-27-subnode-gizmo-design.md) | [subnode-gizmo-impl](hierarchy/2026-02-27-subnode-gizmo-impl.md) | 子节点变换 Gizmo |

---

## textures/ 纹理

| 日期 | 设计 | 实施计划 | 描述 |
|------|------|----------|------|
| 2026-03-02 | [texture-reimport-inspector-design](textures/2026-03-02-texture-reimport-inspector-design.md) | [texture-reimport-inspector](textures/2026-03-02-texture-reimport-inspector.md) | 纹理重导入 & 检视器 |

---

## backend/ 后端 & 基础设施

| 日期 | 文件 | 描述 |
|------|------|------|
| 2026-01-31 | [backend-auth-system](backend/2026-01-31-backend-auth-system.md) | 后端认证系统（Session + PostgreSQL） |
| 2026-02-01 | [asset-storage-system](backend/2026-02-01-asset-storage-system.md) | 资产存储系统 |

---

## 命名规范

```
YYYY-MM-DD-<feature-name>-design.md   ← 设计文档
YYYY-MM-DD-<feature-name>.md          ← 实施计划
YYYY-MM-DD-<feature-name>-impl.md     ← 实施计划（少数情况使用 -impl 后缀）
```

文档状态标记：**✅ 已实施** / **🚧 进行中** / 无标记 = 待实施或仅供参考
