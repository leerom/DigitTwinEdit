# 直射光阴影属性补充 — 设计文档

**日期**: 2026-03-04
**范围**: Inspector 面板 + SceneRenderer + 类型定义

---

## 背景

当前 Inspector 对直射光（DirectionalLight）仅提供 Color、Intensity、Cast Shadow 三个属性。存在一个已知 Bug：`castShadow` 字段虽然存在于类型定义和 Inspector UI 中，但在 `SceneRenderer.tsx` 的 `<directionalLight>` JSX 中未被传入，导致阴影始终不生效。

本次目标：修复该 Bug，并补充完整的阴影配置属性。

---

## 数据模型变更

### `packages/client/src/types/index.ts` — `LightComponent`

新增以下可选字段（仅对 directional 类型有意义）：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shadowCameraSize` | `number` | `10` | 阴影相机正交范围，映射到 ±left/right/top/bottom |
| `shadowNear` | `number` | `0.5` | 阴影相机近裁面 |
| `shadowFar` | `number` | `500` | 阴影相机远裁面 |
| `shadowMapSize` | `512\|1024\|2048\|4096` | `1024` | 阴影贴图分辨率 |
| `shadowBias` | `number` | `-0.001` | 减少阴影条纹伪影 |
| `shadowNormalBias` | `number` | `0.02` | 减少斜面阴影伪影 |
| `shadowRadius` | `number` | `1` | 软阴影半径（>1 产生模糊边缘） |

---

## Inspector UI 变更

### `packages/client/src/components/inspector/specific/LightProp.tsx`

- 读取新增字段，使用现有 `getLightValue` 工具函数
- 新增条件渲染：当 `type === 'directional'` 且 `castShadow === true` 时，在 Cast Shadow 下方展示"阴影设置"分组
- Map Resolution 使用 `<select>` 下拉（选项：512、1024、2048、4096）
- 其余字段使用现有 `<NumberInput>` 组件

UI 布局（直射光且 castShadow=true 时）：

```
[Cast Shadow]  ✅

 阴影设置 (Shadow)
 ┌─────────────────────────────────┐
 │ Camera Size      [  10  ]       │
 │ Near             [ 0.5  ]       │
 │ Far              [ 500  ]       │
 │ Map Resolution   [1024 ▼]       │
 │ Bias             [-0.001]       │
 │ Normal Bias      [ 0.02 ]       │
 │ Radius           [  1   ]       │
 └─────────────────────────────────┘
```

---

## SceneRenderer 变更

### `packages/client/src/features/scene/SceneRenderer.tsx`

**修复**：`<directionalLight>` 补充 `castShadow` prop（修复现有 Bug）。

**新增**：通过 R3F 的 dash-case prop 语法传入阴影属性：

```jsx
<directionalLight
  ref={lightRef}
  position={[0, 0, 2]}
  color={light?.color ?? '#ffffff'}
  intensity={light?.intensity ?? 1}
  castShadow={light?.castShadow ?? false}
  shadow-camera-left={-(light?.shadowCameraSize ?? 10)}
  shadow-camera-right={light?.shadowCameraSize ?? 10}
  shadow-camera-top={light?.shadowCameraSize ?? 10}
  shadow-camera-bottom={-(light?.shadowCameraSize ?? 10)}
  shadow-camera-near={light?.shadowNear ?? 0.5}
  shadow-camera-far={light?.shadowFar ?? 500}
  shadow-mapSize-width={light?.shadowMapSize ?? 1024}
  shadow-mapSize-height={light?.shadowMapSize ?? 1024}
  shadow-bias={light?.shadowBias ?? -0.001}
  shadow-normalBias={light?.shadowNormalBias ?? 0.02}
  shadow-radius={light?.shadowRadius ?? 1}
/>
```

---

## 涉及文件

1. `packages/client/src/types/index.ts` — 扩展 `LightComponent` 接口
2. `packages/client/src/components/inspector/specific/LightProp.tsx` — 新增阴影属性 UI
3. `packages/client/src/features/scene/SceneRenderer.tsx` — 修复 Bug + 应用阴影属性

---

## 不在本次范围内

- 其他灯光类型（point/spot/ambient）的阴影扩展
- 命令系统（undo/redo）集成（与现有 `updateComponent` 调用方式保持一致）
- 阴影相机 Helper 可视化
