# 光源系统完整实现设计文档

**日期**: 2026-03-05
**功能**: 添加菜单 → 光源子菜单（完整5种光源支持）
**方案**: 方案A（最小化扩展）

---

## 背景与目标

当前 Header.tsx 的"添加 → 光源"子菜单已有5个选项（环境光、平行光、半球光、点光源、聚光灯），但全部被设为 `disabled: true`。SceneRenderer 只渲染平行光（DirectionalLight），Inspector 只显示基本属性且未处理半球光等新类型。

**目标**：让用户能从菜单添加所有5种光源，在场景中正确渲染，并在属性检视器中显示符合 Three.js 文档的完整属性。

---

## 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `packages/client/src/types/index.ts` | 修改 | 扩展 LightComponent 接口 |
| `packages/client/src/features/scene/services/SceneManager.ts` | 修改 | 添加 createLight() 工厂方法 |
| `packages/client/src/components/layout/Header.tsx` | 修改 | 启用光源菜单项 |
| `packages/client/src/features/scene/SceneRenderer.tsx` | 修改 | 支持5种光源类型渲染 |
| `packages/client/src/components/inspector/specific/LightProp.tsx` | 修改 | 显示各类型完整属性 |
| `packages/client/src/components/panels/HierarchyPanel.tsx` | 修改（可选） | 按光源类型显示不同图标 |

---

## 类型系统设计

### LightComponent 扩展

```typescript
// packages/client/src/types/index.ts
export interface LightComponent {
  // 所有光源
  color: string;        // 主颜色（半球光为天空色 skyColor）
  intensity: number;
  type: 'directional' | 'point' | 'spot' | 'ambient' | 'hemisphere';

  // 仅 hemisphere
  groundColor?: string;  // 地面色，默认 '#444444'

  // point / spot 共有
  castShadow?: boolean;  // 也用于 directional（保持兼容）
  range?: number;        // Three.js distance，0 = 无限衰减
  decay?: number;        // 默认 2（符合物理衰减）

  // 仅 spot
  angle?: number;        // 锥角（0~π/2），默认 π/6
  penumbra?: number;     // 柔边（0~1），默认 0.1

  // 阴影设置（directional / point / spot）
  shadowMapSize?: 512 | 1024 | 2048 | 4096;
  shadowBias?: number;
  shadowNormalBias?: number;
  shadowRadius?: number;

  // directional 专有阴影摄像机范围
  shadowCameraSize?: number;
  shadowNear?: number;
  shadowFar?: number;
}
```

**注意**：`ambient` 和 `hemisphere` 不支持阴影，在 Inspector 中隐藏相关属性。

---

## 工厂方法设计

### SceneManager.createLight()

```typescript
static createLight(name: string, lightType: LightComponent['type']): SceneObject {
  const defaults: Record<LightComponent['type'], Partial<LightComponent>> = {
    ambient:     { color: '#ffffff', intensity: 0.5, type: 'ambient' },
    directional: { color: '#ffffff', intensity: 1, type: 'directional', castShadow: true,
                   shadowCameraSize: 10, shadowNear: 0.5, shadowFar: 500,
                   shadowMapSize: 1024, shadowBias: -0.001, shadowNormalBias: 0.02, shadowRadius: 1 },
    hemisphere:  { color: '#ffffff', intensity: 0.6, type: 'hemisphere', groundColor: '#444444' },
    point:       { color: '#ffffff', intensity: 1, type: 'point', range: 0, decay: 2, castShadow: false,
                   shadowMapSize: 1024, shadowBias: -0.001, shadowNormalBias: 0.02, shadowRadius: 1 },
    spot:        { color: '#ffffff', intensity: 1, type: 'spot', range: 10, angle: Math.PI / 6,
                   penumbra: 0.1, decay: 2, castShadow: false,
                   shadowMapSize: 1024, shadowBias: -0.001, shadowNormalBias: 0.02, shadowRadius: 1 },
  };
  // 返回带默认位置 [0,3,0] 的 SceneObject（type=LIGHT）
}
```

---

## Scene View 渲染设计

### SceneRenderer.tsx 光源类型处理

在 `ObjectRenderer` 中，原 `{object.type === ObjectType.LIGHT}` 分支扩展为按 `light.type` 渲染：

```
ambient     → <ambientLight>            无 Helper，无位置 Gizmo
directional → <directionalLight>        DirectionalLightHelper（已有）+ 方向 Gizmo
hemisphere  → <hemisphereLight>         HemisphereLightHelper
point       → <pointLight>              PointLightHelper
spot        → <spotLight>               SpotLightHelper
```

**Gizmo 球体**：所有光源在选中时显示黄色球体占位（现有实现），保持场景中可见可选中。

**useHelper 多类型支持**：`useHelper` 只能绑定一个 ref，光源类型固定后渲染器会有多个 ref（lightRef 类型可以为 THREE.Light 的各子类）。策略：使用单个 `lightRef`，根据类型调用不同 Helper。

**阴影配置**（point/spot）：
```jsx
<pointLight
  shadow-camera-near={light.shadowNear ?? 0.5}
  shadow-camera-far={light.shadowFar ?? 500}
  shadow-mapSize-width={light.shadowMapSize ?? 1024}
  shadow-mapSize-height={light.shadowMapSize ?? 1024}
  shadow-bias={light.shadowBias ?? -0.001}
  shadow-normalBias={light.shadowNormalBias ?? 0.02}
  shadow-radius={light.shadowRadius ?? 1}
/>
```

---

## 属性检视器设计

### LightProp.tsx 属性可见性矩阵

| 属性分组 | ambient | directional | hemisphere | point | spot |
|---------|---------|-------------|------------|-------|------|
| Color（主色/天空色） | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ground Color | - | - | ✓ | - | - |
| Intensity | ✓ | ✓ | ✓ | ✓ | ✓ |
| Range | - | - | - | ✓ | ✓ |
| Decay | - | - | - | ✓ | ✓ |
| Angle | - | - | - | - | ✓ |
| Penumbra | - | - | - | - | ✓ |
| Cast Shadow | - | ✓ | - | ✓ | ✓ |
| 阴影 Camera Size | - | ✓ | - | - | - |
| 阴影 Near/Far | - | ✓ | - | ✓ | ✓ |
| 阴影 Map Resolution | - | ✓ | - | ✓ | ✓ |
| 阴影 Bias/NormalBias/Radius | - | ✓ | - | ✓ | ✓ |

**展示逻辑**：
- 阴影详细设置展开条件：`castShadow === true && (isDirectional || isPoint || isSpot)`
- DirectionalLight 额外显示 Camera Size（正交投影摄像机尺寸）

---

## 选中联动设计

现有机制已完整支持：
- **HierarchyPanel** → 点击 → `editorStore.select([id])` → `InspectorPanel` 响应 `activeId`
- **SceneView** → 点击光源 Gizmo（球体 mesh）→ `select([id])` → 三处联动
- **InspectorPanel** → `isAllLights` 时渲染 `<LightProp>`

无需额外联动代码，现有 Zustand 订阅机制自动处理。

---

## 层级视图图标设计（可选优化）

在 `HierarchyPanel.tsx` 的 `getIcon()` 函数中，对 `ObjectType.LIGHT` 按 `light.type` 细分：

```typescript
case ObjectType.LIGHT: {
  const lt = object.components?.light?.type;
  if (lt === 'ambient') return { icon: 'wb_twilight', color: 'text-yellow-300' };
  if (lt === 'hemisphere') return { icon: 'gradient', color: 'text-blue-300' };
  if (lt === 'point') return { icon: 'lightbulb', color: 'text-yellow-400' };
  if (lt === 'spot') return { icon: 'flashlight_on', color: 'text-yellow-400' };
  return { icon: 'light_mode', color: 'text-yellow-400' }; // directional
}
```

---

## 不在此次范围内

- **RectAreaLight**：菜单中未列出，不实现
- **光源 target 位置**：DirectionalLight 的 target 由旋转 Gizmo 驱动，保持现有设计
- **光源可见性 Gizmo**：已有黄色球体，无需额外 billboard 图标
- **命令系统集成**：添加光源直接调用 `addObject()`（与 addMesh 保持一致），不走 historyStore

---

## 实现验证标准

1. 点击"添加 → 光源 → 环境光"，层级视图出现新条目，场景亮度变化
2. 点击"添加 → 光源 → 半球光"，Inspector 显示 Color + Ground Color + Intensity
3. 点击"添加 → 光源 → 点光源"，场景出现点光效果，Inspector 显示 Range/Decay/Shadow
4. 点击"添加 → 光源 → 聚光灯"，Inspector 显示 Angle/Penumbra
5. 点击层级视图中光源条目 → Inspector 自动更新
6. 点击 Scene View 中光源 Gizmo → Inspector 自动更新
