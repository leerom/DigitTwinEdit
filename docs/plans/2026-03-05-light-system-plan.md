# Light System Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 启用"添加 → 光源"菜单中的5种光源（环境光、平行光、半球光、点光源、聚光灯），实现层级视图/场景视图/属性检视器三处联动，属性遵循 Three.js 文档规范。

**Architecture:** 方案A最小化扩展——在现有 LightComponent 接口添加新类型和属性；SceneManager 新增 createLight() 工厂；SceneRenderer 按 light.type 条件渲染不同 Three.js 光源；LightProp 按类型显示对应属性分组。

**Tech Stack:** React, TypeScript, Three.js, @react-three/fiber, @react-three/drei (useHelper), Zustand, Vitest

---

## 设计参考

设计文档：`docs/plans/2026-03-05-light-system-design.md`

### 光源属性速查表

| 光源类型 | Three.js 类 | 特有属性 | 支持阴影 |
|---------|------------|---------|---------|
| ambient | AmbientLight | - | 否 |
| directional | DirectionalLight | shadowCameraSize | 是（正交摄像机） |
| hemisphere | HemisphereLight | groundColor | 否 |
| point | PointLight | range(distance), decay | 是（透视摄像机） |
| spot | SpotLight | range, angle, penumbra, decay | 是（透视摄像机） |

---

## Task 1: 扩展 LightComponent 类型接口

**Files:**
- Modify: `packages/client/src/types/index.ts:64-80`

### Step 1: 修改 LightComponent 接口

将 `types/index.ts` 中 `LightComponent` 替换为：

```typescript
export interface LightComponent {
  color: string;           // 所有光源（半球光为天空色 skyColor）
  intensity: number;       // 所有光源
  type: 'directional' | 'point' | 'spot' | 'ambient' | 'hemisphere';

  // 仅 hemisphere
  groundColor?: string;    // 地面色，默认 '#444444'

  // directional / point / spot
  castShadow?: boolean;

  // point / spot
  range?: number;          // Three.js distance，0 = 无限
  decay?: number;          // 默认 2

  // 仅 spot
  angle?: number;          // 锥角 0~π/2，默认 π/6
  penumbra?: number;       // 柔边 0~1，默认 0.1

  // 阴影参数（directional / point / spot，castShadow=true 时生效）
  shadowMapSize?: 512 | 1024 | 2048 | 4096;
  shadowBias?: number;
  shadowNormalBias?: number;
  shadowRadius?: number;

  // 仅 directional 阴影正交摄像机
  shadowCameraSize?: number;
  shadowNear?: number;
  shadowFar?: number;
}
```

### Step 2: 运行类型检查确认无新增错误

```bash
cd C:/2026/DigitTwinEdit
pnpm --filter client exec tsc --noEmit 2>&1 | head -50
```

预期：原有已知错误不增加（TS6133等）；新增的 `penumbra`、`groundColor` 等属性不报错。

### Step 3: Commit

```bash
git add packages/client/src/types/index.ts
git commit -m "feat(types): extend LightComponent to support hemisphere/point/spot properties"
```

---

## Task 2: SceneManager 添加 createLight() 工厂方法

**Files:**
- Modify: `packages/client/src/features/scene/services/SceneManager.ts`
- Test: `packages/client/src/features/scene/services/SceneManager.test.ts`

### Step 1: 在测试文件末尾添加 createLight 测试

在 `SceneManager.test.ts` 的最后 `});` 之前插入：

```typescript
  describe('createLight', () => {
    it('ambient: type=LIGHT, light.type=ambient, no castShadow', () => {
      const obj = SceneManager.createLight('Ambient Light', 'ambient');
      expect(obj.type).toBe(ObjectType.LIGHT);
      expect(obj.components?.light?.type).toBe('ambient');
      expect(obj.components?.light?.castShadow).toBeUndefined();
    });

    it('hemisphere: has groundColor, no castShadow', () => {
      const obj = SceneManager.createLight('Hemisphere Light', 'hemisphere');
      expect(obj.components?.light?.type).toBe('hemisphere');
      expect(obj.components?.light?.groundColor).toBe('#444444');
      expect(obj.components?.light?.castShadow).toBeUndefined();
    });

    it('point: has range, decay, no castShadow by default', () => {
      const obj = SceneManager.createLight('Point Light', 'point');
      expect(obj.components?.light?.type).toBe('point');
      expect(obj.components?.light?.decay).toBe(2);
      expect(obj.components?.light?.castShadow).toBe(false);
    });

    it('spot: has angle, penumbra, decay', () => {
      const obj = SceneManager.createLight('Spot Light', 'spot');
      expect(obj.components?.light?.type).toBe('spot');
      expect(obj.components?.light?.angle).toBeCloseTo(Math.PI / 6);
      expect(obj.components?.light?.penumbra).toBe(0.1);
    });

    it('directional: has castShadow=true and shadow defaults', () => {
      const obj = SceneManager.createLight('Directional Light', 'directional');
      expect(obj.components?.light?.castShadow).toBe(true);
      expect(obj.components?.light?.shadowMapSize).toBe(1024);
      expect(obj.components?.light?.shadowCameraSize).toBe(10);
    });

    it('returned object has required SceneObject fields', () => {
      const obj = SceneManager.createLight('Test', 'point');
      expect(obj.id).toBeTruthy();
      expect(obj.parentId).toBeNull();
      expect(obj.children).toEqual([]);
      expect(obj.transform.position).toEqual([0, 3, 0]);
    });
  });
```

### Step 2: 运行测试确认失败

```bash
cd C:/2026/DigitTwinEdit
pnpm --filter client test -- --run src/features/scene/services/SceneManager.test.ts
```

预期：`createLight` 相关用例 FAIL（方法不存在）。

### Step 3: 在 SceneManager.ts 中实现 createLight()

在 `createMesh()` 方法之后、类结束 `}` 之前添加：

```typescript
  static createLight(
    name: string,
    lightType: LightComponent['type']
  ): SceneObject {
    const id = uuidv4();

    const lightDefaults: Record<LightComponent['type'], Partial<LightComponent>> = {
      ambient: {
        type: 'ambient',
        color: '#ffffff',
        intensity: 0.5,
      },
      directional: {
        type: 'directional',
        color: '#ffffff',
        intensity: 1,
        castShadow: true,
        shadowCameraSize: 10,
        shadowNear: 0.5,
        shadowFar: 500,
        shadowMapSize: 1024,
        shadowBias: -0.001,
        shadowNormalBias: 0.02,
        shadowRadius: 1,
      },
      hemisphere: {
        type: 'hemisphere',
        color: '#ffffff',
        intensity: 0.6,
        groundColor: '#444444',
      },
      point: {
        type: 'point',
        color: '#ffffff',
        intensity: 1,
        range: 0,
        decay: 2,
        castShadow: false,
        shadowMapSize: 1024,
        shadowBias: -0.001,
        shadowNormalBias: 0.02,
        shadowRadius: 1,
      },
      spot: {
        type: 'spot',
        color: '#ffffff',
        intensity: 1,
        range: 10,
        angle: Math.PI / 6,
        penumbra: 0.1,
        decay: 2,
        castShadow: false,
        shadowMapSize: 1024,
        shadowBias: -0.001,
        shadowNormalBias: 0.02,
        shadowRadius: 1,
      },
    };

    return {
      id,
      name,
      type: ObjectType.LIGHT,
      parentId: null,
      children: [],
      visible: true,
      locked: false,
      transform: {
        position: [0, 3, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: {
        light: lightDefaults[lightType] as LightComponent,
      },
    };
  }
```

注意：`SceneManager.ts` 顶部已导入 `LightComponent`，无需新增导入。

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/features/scene/services/SceneManager.test.ts
```

预期：全部 PASS。

### Step 5: Commit

```bash
git add packages/client/src/features/scene/services/SceneManager.ts packages/client/src/features/scene/services/SceneManager.test.ts
git commit -m "feat(scene): add SceneManager.createLight() factory for all light types"
```

---

## Task 3: Header.tsx 启用光源菜单项

**Files:**
- Modify: `packages/client/src/components/layout/Header.tsx:91-99` (handleAddMesh区域)

### Step 1: 在 Header.tsx 中添加 handleAddLight 函数

在 `handleAddMesh` 函数（约第91行）之后添加：

```typescript
  const handleAddLight = (
    name: string,
    lightType: import('@/types').LightComponent['type']
  ) => {
    const newObject = SceneManager.createLight(name, lightType);
    addObject(newObject);
    select([newObject.id], false);
    setActiveTool('translate');
  };
```

### Step 2: 启用 addMenuItems 中的光源子菜单

将 `addMenuItems` 中的光源子菜单从：

```typescript
    {
      label: '光源',
      icon: <Sun className="w-3 h-3" />,
      children: [
        { label: '环境光 (Ambient)', disabled: true },
        { label: '平行光 (Directional)', disabled: true },
        { label: '半球光 (Hemisphere)', disabled: true },
        { label: '点光源 (Point)', disabled: true },
        { label: '聚光灯 (Spot)', disabled: true },
      ]
    },
```

替换为：

```typescript
    {
      label: '光源',
      icon: <Sun className="w-3 h-3" />,
      children: [
        {
          label: '环境光 (Ambient)',
          onClick: () => handleAddLight('Ambient Light', 'ambient'),
          icon: <Sun className="w-3 h-3" />,
        },
        {
          label: '平行光 (Directional)',
          onClick: () => handleAddLight('Directional Light', 'directional'),
          icon: <Sun className="w-3 h-3" />,
        },
        {
          label: '半球光 (Hemisphere)',
          onClick: () => handleAddLight('Hemisphere Light', 'hemisphere'),
          icon: <Sun className="w-3 h-3" />,
        },
        {
          label: '点光源 (Point)',
          onClick: () => handleAddLight('Point Light', 'point'),
          icon: <Sun className="w-3 h-3" />,
        },
        {
          label: '聚光灯 (Spot)',
          onClick: () => handleAddLight('Spot Light', 'spot'),
          icon: <Sun className="w-3 h-3" />,
        },
      ]
    },
```

### Step 3: 手动测试（浏览器）

启动开发服务器，点击"添加 → 光源 → 环境光"，确认层级视图中出现新条目。

### Step 4: Commit

```bash
git add packages/client/src/components/layout/Header.tsx
git commit -m "feat(header): enable Add > Light submenu items for all 5 light types"
```

---

## Task 4: SceneRenderer 支持5种光源类型渲染

**Files:**
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx:257-527`

**注意**：这是最复杂的 Task，需小心处理 `useHelper` hooks 规则。

### 背景

当前 `ObjectRenderer` 中：
1. 所有光源对象都渲染 `directionalLight`（第495-527行），不判断 `light.type`
2. `useHelper` 在第272行调用，只处理 DirectionalLight

### Step 1: 扩展 lightRef 类型和新增 refs

在 `ObjectRenderer` 中，当前第257-260行：
```typescript
  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const lightTargetRef = useRef<THREE.Object3D>(null!);
  const cameraRef = useRef<THREE.Camera>(null!);
  const groupRef = useRef<THREE.Group>(null!);
```

将 `lightRef` 类型扩展为通用 Light：
```typescript
  const lightRef = useRef<THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight | THREE.HemisphereLight>(null!);
  const lightTargetRef = useRef<THREE.Object3D>(null!);
  const cameraRef = useRef<THREE.Camera>(null!);
  const groupRef = useRef<THREE.Group>(null!);
```

### Step 2: 更新 useHelper 调用以支持多类型

当前第272行：
```typescript
  useHelper(isSelected && object?.type === ObjectType.LIGHT ? lightRef : null, THREE.DirectionalLightHelper, 1, 'yellow');
```

替换为按光源类型使用不同 Helper（需要3次 useHelper 调用，保持调用次数稳定）：

```typescript
  const lightType = object?.components?.light?.type;

  // Hooks 必须每次渲染保持一致调用次数，不能在 if 内调用
  useHelper(
    isSelected && object?.type === ObjectType.LIGHT && lightType === 'directional'
      ? (lightRef as React.MutableRefObject<THREE.DirectionalLight>)
      : null,
    THREE.DirectionalLightHelper,
    1
  );
  useHelper(
    isSelected && object?.type === ObjectType.LIGHT && lightType === 'point'
      ? (lightRef as React.MutableRefObject<THREE.PointLight>)
      : null,
    THREE.PointLightHelper,
    0.5
  );
  useHelper(
    isSelected && object?.type === ObjectType.LIGHT && lightType === 'spot'
      ? (lightRef as React.MutableRefObject<THREE.SpotLight>)
      : null,
    THREE.SpotLightHelper
  );
```

**注意**：删除原来那行单独的 `useHelper` 调用（第272行）。

### Step 3: 将 useEffect 中 lightRef.current.target 赋值改为仅 directional 执行

当前第265行：
```typescript
  useEffect(() => {
    if (lightRef.current && lightTargetRef.current) {
      lightRef.current.target = lightTargetRef.current;
    }
  }, []);
```

更新为：
```typescript
  useEffect(() => {
    const lt = object?.components?.light?.type;
    if (lt === 'directional' && lightRef.current && lightTargetRef.current) {
      (lightRef.current as THREE.DirectionalLight).target = lightTargetRef.current;
    }
  }, [object?.components?.light?.type]);
```

### Step 4: 替换光源渲染 JSX（第489-527行）

将整个 `{object?.type === ObjectType.LIGHT && (...)}`  块替换为：

```tsx
      {object?.type === ObjectType.LIGHT && (() => {
        const light = object.components?.light;
        const lt = light?.type ?? 'directional';

        return (
          <group>
            {/* 光源占位球体（所有类型可见可选中） */}
            <mesh>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshBasicMaterial color="#ffff00" />
            </mesh>

            {lt === 'ambient' && (
              <ambientLight
                color={light?.color ?? '#ffffff'}
                intensity={light?.intensity ?? 0.5}
              />
            )}

            {lt === 'directional' && (
              <>
                <directionalLight
                  ref={lightRef as React.RefObject<THREE.DirectionalLight>}
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
                <object3D ref={lightTargetRef} />
                {/* 方向指示线（沿 local -Z 轴） */}
                <group>
                  {[0, Math.PI/2, Math.PI, -Math.PI/2].map((angle, i) => (
                    <mesh key={i} rotation={[0, 0, angle]} position={[Math.cos(angle)*0.4, Math.sin(angle)*0.4, 0]}>
                      <cylinderGeometry args={[0.02, 0.02, 0.3]} />
                      <meshBasicMaterial color="#ffff00" />
                    </mesh>
                  ))}
                </group>
              </>
            )}

            {lt === 'hemisphere' && (
              <hemisphereLight
                ref={lightRef as React.RefObject<THREE.HemisphereLight>}
                args={[light?.color ?? '#ffffff', light?.groundColor ?? '#444444', light?.intensity ?? 0.6]}
              />
            )}

            {lt === 'point' && (
              <pointLight
                ref={lightRef as React.RefObject<THREE.PointLight>}
                color={light?.color ?? '#ffffff'}
                intensity={light?.intensity ?? 1}
                distance={light?.range ?? 0}
                decay={light?.decay ?? 2}
                castShadow={light?.castShadow ?? false}
                shadow-camera-near={0.5}
                shadow-camera-far={light?.range && light.range > 0 ? light.range : 500}
                shadow-mapSize-width={light?.shadowMapSize ?? 1024}
                shadow-mapSize-height={light?.shadowMapSize ?? 1024}
                shadow-bias={light?.shadowBias ?? -0.001}
                shadow-normalBias={light?.shadowNormalBias ?? 0.02}
                shadow-radius={light?.shadowRadius ?? 1}
              />
            )}

            {lt === 'spot' && (
              <>
                <spotLight
                  ref={lightRef as React.RefObject<THREE.SpotLight>}
                  color={light?.color ?? '#ffffff'}
                  intensity={light?.intensity ?? 1}
                  distance={light?.range ?? 10}
                  angle={light?.angle ?? Math.PI / 6}
                  penumbra={light?.penumbra ?? 0.1}
                  decay={light?.decay ?? 2}
                  castShadow={light?.castShadow ?? false}
                  shadow-camera-near={0.5}
                  shadow-camera-far={light?.range && light.range > 0 ? light.range : 500}
                  shadow-mapSize-width={light?.shadowMapSize ?? 1024}
                  shadow-mapSize-height={light?.shadowMapSize ?? 1024}
                  shadow-bias={light?.shadowBias ?? -0.001}
                  shadow-normalBias={light?.shadowNormalBias ?? 0.02}
                  shadow-radius={light?.shadowRadius ?? 1}
                />
                <object3D ref={lightTargetRef} />
              </>
            )}
          </group>
        );
      })()}
```

**关键**：用 IIFE `(() => {...})()` 包裹，保持 JSX 结构有效。

### Step 5: 运行类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "SceneRenderer" | head -20
```

预期：无新增类型错误。

### Step 6: 手动测试（浏览器）

1. 添加点光源 → 场景出现点光效果（周围网格变亮）
2. 添加聚光灯 → 出现锥形光照
3. 添加环境光 → 整体亮度变化
4. 添加半球光 → 天地色差效果
5. 选中各光源 → 显示对应 Helper

### Step 7: Commit

```bash
git add packages/client/src/features/scene/SceneRenderer.tsx
git commit -m "feat(renderer): support all 5 light types in SceneRenderer with type-specific helpers"
```

---

## Task 5: LightProp.tsx 扩展属性检视器

**Files:**
- Modify: `packages/client/src/components/inspector/specific/LightProp.tsx`
- Modify: `packages/client/src/components/inspector/specific/LightProp.test.tsx`

### Step 1: 添加新测试用例

在 `LightProp.test.tsx` 末尾，现有 `describe` 块之后添加：

```typescript
describe('LightProp — 半球光', () => {
  it('显示 Ground Color 颜色选择器', () => {
    setupStore({ type: 'hemisphere', groundColor: '#444444' });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('Ground Color')).toBeTruthy();
  });

  it('不显示 Cast Shadow', () => {
    setupStore({ type: 'hemisphere' });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('Cast Shadow')).toBeNull();
  });
});

describe('LightProp — 点光源', () => {
  it('显示 Range 和 Decay', () => {
    setupStore({ type: 'point', range: 10, decay: 2 });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('Range')).toBeTruthy();
    expect(screen.getByText('Decay')).toBeTruthy();
  });

  it('castShadow=true 时显示阴影设置（无 Camera Size）', () => {
    setupStore({ type: 'point', castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('阴影设置 (Shadow)')).toBeTruthy();
    expect(screen.queryByText('Camera Size')).toBeNull();
  });
});

describe('LightProp — 聚光灯', () => {
  it('显示 Angle 和 Penumbra', () => {
    setupStore({ type: 'spot', angle: Math.PI / 6, penumbra: 0.1 });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('Angle')).toBeTruthy();
    expect(screen.getByText('Penumbra')).toBeTruthy();
  });
});

describe('LightProp — 已有直射光阴影测试更新', () => {
  it('直射光 castShadow=true 显示 Camera Size', () => {
    setupStore({ type: 'directional', castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('Camera Size')).toBeTruthy();
  });

  // 注意：原有测试 '非直射光不显示阴影设置区（即使 castShadow=true）' 需要更新
  // point/spot 现在 castShadow=true 时会显示阴影设置
  it('环境光不显示 Cast Shadow', () => {
    setupStore({ type: 'ambient' });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('Cast Shadow')).toBeNull();
  });
});
```

**注意**：原测试 `'非直射光不显示阴影设置区（即使 castShadow=true）'` 逻辑已变——点光源和聚光灯现在会显示阴影设置。需将该测试改为只测 `ambient`/`hemisphere` 类型：

将原测试从：
```typescript
  it('非直射光不显示阴影设置区（即使 castShadow=true）', () => {
    setupStore({ type: 'point', castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('阴影设置 (Shadow)')).toBeNull();
  });
```

改为：
```typescript
  it('环境光不显示阴影设置区（即使 castShadow 属性存在）', () => {
    setupStore({ type: 'ambient' });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('阴影设置 (Shadow)')).toBeNull();
  });
```

### Step 2: 运行测试确认新增用例失败

```bash
pnpm --filter client test -- --run src/components/inspector/specific/LightProp.test.tsx
```

预期：新增的 `groundColor`、`penumbra` 等用例 FAIL。

### Step 3: 重写 LightProp.tsx

完整替换 `LightProp.tsx` 内容：

```tsx
import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType, LightComponent } from '@/types';
import { getCommonValue, MIXED_VALUE } from '../utils/inspectorUtils';
import { NumberInput } from '../common/NumberInput';

interface LightPropProps {
  objectIds: string[];
}

export const LightProp: React.FC<LightPropProps> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);

  const selectedLights = objectIds
    .map((id) => objects[id])
    .filter((obj) => obj && obj.type === ObjectType.LIGHT);

  if (selectedLights.length === 0) return null;

  const getLightValue = <K extends keyof LightComponent>(key: K) => {
    const values = selectedLights.map((obj) => obj.components?.light?.[key]);
    const definedValues = values.filter((v): v is NonNullable<typeof v> => v !== undefined);
    if (definedValues.length === 0) return undefined;
    if (definedValues.length !== selectedLights.length) return MIXED_VALUE;
    return getCommonValue(definedValues);
  };

  const type = getLightValue('type');
  const color = getLightValue('color');
  const intensity = getLightValue('intensity');
  const groundColor = getLightValue('groundColor');
  const range = getLightValue('range');
  const decay = getLightValue('decay');
  const angle = getLightValue('angle');
  const penumbra = getLightValue('penumbra');
  const castShadow = getLightValue('castShadow');
  const shadowCameraSize = getLightValue('shadowCameraSize');
  const shadowNear = getLightValue('shadowNear');
  const shadowFar = getLightValue('shadowFar');
  const shadowMapSize = getLightValue('shadowMapSize');
  const shadowBias = getLightValue('shadowBias');
  const shadowNormalBias = getLightValue('shadowNormalBias');
  const shadowRadius = getLightValue('shadowRadius');

  const isAmbient = type === 'ambient';
  const isDirectional = type === 'directional';
  const isHemisphere = type === 'hemisphere';
  const isPoint = type === 'point';
  const isSpot = type === 'spot';

  const supportsRangeDecay = isPoint || isSpot || type === MIXED_VALUE;
  const supportsAngle = isSpot || type === MIXED_VALUE;
  const supportsShadow = !isAmbient && !isHemisphere;
  const showShadowSettings = supportsShadow && castShadow === true;
  const showCameraSize = showShadowSettings && isDirectional;

  const handleUpdate = (key: string, value: unknown) => {
    selectedLights.forEach((obj) => {
      updateComponent(obj.id, 'light', { [key]: value });
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold text-slate-300">灯光设置 (Light)</h3>

      {/* 主色（天空色） */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">
          {isHemisphere ? 'Sky Color' : 'Color'}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color === MIXED_VALUE ? '#000000' : (color as string) || '#ffffff'}
            onChange={(e) => handleUpdate('color', e.target.value)}
            className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
          />
          {color === MIXED_VALUE && (
            <span className="text-xs text-slate-500 italic">Mixed</span>
          )}
        </div>
      </div>

      {/* 半球光地面色 */}
      {isHemisphere && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">Ground Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={groundColor === MIXED_VALUE ? '#000000' : (groundColor as string) || '#444444'}
              onChange={(e) => handleUpdate('groundColor', e.target.value)}
              className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
            />
            {groundColor === MIXED_VALUE && (
              <span className="text-xs text-slate-500 italic">Mixed</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="Intensity"
          value={intensity === undefined ? 1 : (intensity as number)}
          onChange={(val) => handleUpdate('intensity', val)}
          step="0.1"
        />

        {supportsRangeDecay && (
          <>
            <NumberInput
              label="Range"
              value={range === undefined ? 0 : (range as number)}
              onChange={(val) => handleUpdate('range', val)}
              step="1"
            />
            <NumberInput
              label="Decay"
              value={decay === undefined ? 2 : (decay as number)}
              onChange={(val) => handleUpdate('decay', val)}
              step="0.1"
            />
          </>
        )}

        {supportsAngle && (
          <>
            <NumberInput
              label="Angle"
              value={angle === undefined ? Math.PI / 6 : (angle as number)}
              onChange={(val) => handleUpdate('angle', val)}
              step="0.01"
            />
            <NumberInput
              label="Penumbra"
              value={penumbra === undefined ? 0.1 : (penumbra as number)}
              onChange={(val) => handleUpdate('penumbra', val)}
              step="0.01"
            />
          </>
        )}
      </div>

      {/* Cast Shadow 开关（仅 directional / point / spot） */}
      {supportsShadow && (
        <div className="flex items-center justify-between pt-1">
          <label className="text-xs text-slate-400">Cast Shadow</label>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={castShadow === true}
              ref={(input) => {
                if (input) input.indeterminate = castShadow === MIXED_VALUE;
              }}
              onChange={(e) => handleUpdate('castShadow', e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-slate-700 text-blue-500 focus:ring-offset-slate-800"
            />
            {castShadow === MIXED_VALUE && (
              <span className="ml-2 text-xs text-slate-500 italic">Mixed</span>
            )}
          </div>
        </div>
      )}

      {/* 阴影详细设置 */}
      {showShadowSettings && (
        <div className="flex flex-col gap-2 pl-2 border-l border-slate-600 mt-1">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            阴影设置 (Shadow)
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Camera Size 仅直射光（正交投影摄像机） */}
            {showCameraSize && (
              <NumberInput
                label="Camera Size"
                value={shadowCameraSize === undefined ? 10 : (shadowCameraSize as number)}
                onChange={(val) => handleUpdate('shadowCameraSize', val)}
                step="1"
              />
            )}

            <NumberInput
              label="Near"
              value={shadowNear === undefined ? 0.5 : (shadowNear as number)}
              onChange={(val) => handleUpdate('shadowNear', val)}
              step="0.1"
            />
            <NumberInput
              label="Far"
              value={shadowFar === undefined ? 500 : (shadowFar as number)}
              onChange={(val) => handleUpdate('shadowFar', val)}
              step="10"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Map Resolution</label>
              <select
                value={shadowMapSize === undefined ? 1024 : (shadowMapSize as number)}
                onChange={(e) =>
                  handleUpdate(
                    'shadowMapSize',
                    Number(e.target.value) as 512 | 1024 | 2048 | 4096
                  )
                }
                className="bg-slate-700 border border-slate-600 text-xs text-slate-200 rounded px-1 py-1 w-full"
              >
                <option value={512}>512</option>
                <option value={1024}>1024</option>
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
              </select>
            </div>

            <NumberInput
              label="Bias"
              value={shadowBias === undefined ? -0.001 : (shadowBias as number)}
              onChange={(val) => handleUpdate('shadowBias', val)}
              step="0.001"
            />
            <NumberInput
              label="Normal Bias"
              value={shadowNormalBias === undefined ? 0.02 : (shadowNormalBias as number)}
              onChange={(val) => handleUpdate('shadowNormalBias', val)}
              step="0.01"
            />
            <NumberInput
              label="Radius"
              value={shadowRadius === undefined ? 1 : (shadowRadius as number)}
              onChange={(val) => handleUpdate('shadowRadius', val)}
              step="0.5"
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

### Step 4: 运行测试确认全部通过

```bash
pnpm --filter client test -- --run src/components/inspector/specific/LightProp.test.tsx
```

预期：全部 PASS（包含原有和新增测试）。

### Step 5: Commit

```bash
git add packages/client/src/components/inspector/specific/LightProp.tsx packages/client/src/components/inspector/specific/LightProp.test.tsx
git commit -m "feat(inspector): extend LightProp to support all 5 light types with full shadow settings"
```

---

## Task 6: HierarchyPanel 光源图标按类型区分

**Files:**
- Modify: `packages/client/src/components/panels/HierarchyPanel.tsx:127-138`

### Step 1: 更新 getIcon() 函数中的 LIGHT case

将 `HierarchyPanel.tsx` 中 `getIcon()` 函数的 `ObjectType.LIGHT` 分支：

```typescript
      case ObjectType.LIGHT:
        return { icon: 'light_mode', color: 'text-yellow-400' };
```

替换为：

```typescript
      case ObjectType.LIGHT: {
        const lt = object.components?.light?.type;
        if (lt === 'ambient') return { icon: 'wb_twilight', color: 'text-yellow-300' };
        if (lt === 'hemisphere') return { icon: 'gradient', color: 'text-blue-300' };
        if (lt === 'point') return { icon: 'lightbulb', color: 'text-yellow-400' };
        if (lt === 'spot') return { icon: 'flashlight_on', color: 'text-yellow-400' };
        return { icon: 'light_mode', color: 'text-yellow-400' }; // directional 默认
      }
```

### Step 2: 运行全量测试确认无回归

```bash
pnpm --filter client test -- --run
```

预期：所有测试 PASS（或与修改前相同的已知失败数）。

### Step 3: Commit

```bash
git add packages/client/src/components/panels/HierarchyPanel.tsx
git commit -m "feat(hierarchy): show different icons for each light type in HierarchyPanel"
```

---

## Task 7: 端到端验证

### Step 1: 启动开发服务器

```bash
pnpm dev:all
```

浏览器打开 `http://localhost:5173`，登录后进入编辑器。

### Step 2: 验证每种光源

按顺序验证：

**环境光（Ambient）**
- 添加 → 层级视图出现 "Ambient Light"（wb_twilight 图标）
- Inspector 显示：Color, Intensity（无 Cast Shadow）
- 场景整体亮度变化

**平行光（Directional）**
- 添加 → 层级视图出现 "Directional Light"（light_mode 图标）
- Inspector 显示：Color, Intensity, Cast Shadow，Shadow Detail（含 Camera Size）
- 选中时显示 DirectionalLightHelper

**半球光（Hemisphere）**
- 添加 → 层级视图出现 "Hemisphere Light"（gradient 图标）
- Inspector 显示：Sky Color, Ground Color, Intensity（无 Cast Shadow）
- 修改 Ground Color → 场景地面色调变化

**点光源（Point）**
- 添加 → 层级视图出现 "Point Light"（lightbulb 图标）
- Inspector 显示：Color, Intensity, Range, Decay, Cast Shadow
- 开启 Cast Shadow → 显示阴影设置（无 Camera Size）
- 选中时显示 PointLightHelper 球体辅助线

**聚光灯（Spot）**
- 添加 → 层级视图出现 "Spot Light"（flashlight_on 图标）
- Inspector 显示：Color, Intensity, Range, Decay, Angle, Penumbra, Cast Shadow
- 选中时显示 SpotLightHelper 锥形辅助线

### Step 3: 验证选中联动

- 点击层级视图中光源 → Inspector 自动切换为该光源属性
- 点击 Scene View 中光源球体 Gizmo → 层级视图高亮 + Inspector 更新
- Inspector 修改颜色/强度 → Scene View 实时生效

### Step 4: 运行完整测试套件

```bash
pnpm --filter client test -- --run
```

---

## 完成标准

- [ ] 5种光源可以从菜单添加到场景
- [ ] 每种光源在 Scene View 渲染正确（不再统一渲染 DirectionalLight）
- [ ] HierarchyPanel 图标按光源类型显示
- [ ] Inspector 按光源类型显示对应属性（含 groundColor, penumbra）
- [ ] 阴影详细设置：directional 有 Camera Size，point/spot 没有
- [ ] 三处联动正常（层级 ↔ Scene View ↔ Inspector）
- [ ] 所有测试 PASS
