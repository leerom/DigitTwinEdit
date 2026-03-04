# 直射光阴影属性补充 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在属性检视器中为直射光补充完整的阴影配置属性，并修复 castShadow 未传入渲染器的 Bug。

**Architecture:** 分三步：(1) 扩展 `LightComponent` 类型，(2) 修复 SceneRenderer 并应用所有阴影属性，(3) 在 Inspector UI 中添加阴影设置区。所有新字段均为可选，带合理默认值，向后兼容。

**Tech Stack:** React, TypeScript, @react-three/fiber, Zustand, Vitest + @testing-library/react

---

### Task 1: 扩展 LightComponent 类型

**Files:**
- Modify: `packages/client/src/types/index.ts:62-70`

**Step 1: 在 `LightComponent` 接口中添加阴影字段**

将 `LightComponent` 从：
```typescript
export interface LightComponent {
  color: string;
  intensity: number;
  type: 'directional' | 'point' | 'spot' | 'ambient';
  castShadow?: boolean;
  range?: number;
  decay?: number;
  angle?: number;
}
```
修改为：
```typescript
export interface LightComponent {
  color: string;
  intensity: number;
  type: 'directional' | 'point' | 'spot' | 'ambient';
  castShadow?: boolean;
  range?: number;
  decay?: number;
  angle?: number;
  // directional light shadow properties
  shadowCameraSize?: number;
  shadowNear?: number;
  shadowFar?: number;
  shadowMapSize?: 512 | 1024 | 2048 | 4096;
  shadowBias?: number;
  shadowNormalBias?: number;
  shadowRadius?: number;
}
```

**Step 2: 验证类型编译无错误**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | head -20
```
预期：无新增错误。

**Step 3: 提交**

```bash
git add packages/client/src/types/index.ts
git commit -m "feat(types): 扩展 LightComponent 新增直射光阴影属性字段"
```

---

### Task 2: 修复 SceneRenderer — 应用 castShadow 及阴影属性

**Files:**
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx:471-476`

**Step 1: 定位并替换 `<directionalLight>` JSX**

找到（约第 471 行）：
```jsx
<directionalLight
  ref={lightRef}
  position={[0, 0, 2]}
  color={object.components?.light?.color ?? '#ffffff'}
  intensity={object.components?.light?.intensity ?? 1}
/>
```

替换为（在 JSX 中先提取 light 引用以减少重复）：
```jsx
<directionalLight
  ref={lightRef}
  position={[0, 0, 2]}
  color={object.components?.light?.color ?? '#ffffff'}
  intensity={object.components?.light?.intensity ?? 1}
  castShadow={object.components?.light?.castShadow ?? false}
  shadow-camera-left={-(object.components?.light?.shadowCameraSize ?? 10)}
  shadow-camera-right={object.components?.light?.shadowCameraSize ?? 10}
  shadow-camera-top={object.components?.light?.shadowCameraSize ?? 10}
  shadow-camera-bottom={-(object.components?.light?.shadowCameraSize ?? 10)}
  shadow-camera-near={object.components?.light?.shadowNear ?? 0.5}
  shadow-camera-far={object.components?.light?.shadowFar ?? 500}
  shadow-mapSize-width={object.components?.light?.shadowMapSize ?? 1024}
  shadow-mapSize-height={object.components?.light?.shadowMapSize ?? 1024}
  shadow-bias={object.components?.light?.shadowBias ?? -0.001}
  shadow-normalBias={object.components?.light?.shadowNormalBias ?? 0.02}
  shadow-radius={object.components?.light?.shadowRadius ?? 1}
/>
```

**Step 2: 验证编译**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | head -20
```
预期：无新增错误。

**Step 3: 提交**

```bash
git add packages/client/src/features/scene/SceneRenderer.tsx
git commit -m "fix(scene): 修复直射光 castShadow 未传入，补充所有阴影属性到渲染器"
```

---

### Task 3: Inspector UI — 新增阴影设置区

**Files:**
- Modify: `packages/client/src/components/inspector/specific/LightProp.tsx`
- Create: `packages/client/src/components/inspector/specific/LightProp.test.tsx`

**Step 1: 先写测试（TDD）**

创建 `packages/client/src/components/inspector/specific/LightProp.test.tsx`：

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LightProp } from './LightProp';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType } from '@/types';

vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: vi.fn(),
}));

function setupStore(lightProps: Record<string, unknown> = {}) {
  (useSceneStore as any).mockImplementation((selector: any) => {
    const state = {
      scene: {
        objects: {
          light1: {
            id: 'light1',
            type: ObjectType.LIGHT,
            components: {
              light: {
                color: '#ffffff',
                intensity: 1,
                type: 'directional',
                castShadow: false,
                ...lightProps,
              },
            },
          },
        },
      },
      updateComponent: vi.fn(),
    };
    return selector(state);
  });
}

describe('LightProp — 直射光阴影设置', () => {
  beforeEach(() => {
    setupStore();
  });

  it('castShadow=false 时不显示阴影设置区', () => {
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('阴影设置 (Shadow)')).toBeNull();
  });

  it('castShadow=true 时显示阴影设置区', () => {
    setupStore({ castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('阴影设置 (Shadow)')).toBeTruthy();
  });

  it('阴影设置区包含所有必要字段标签', () => {
    setupStore({ castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('Camera Size')).toBeTruthy();
    expect(screen.getByText('Near')).toBeTruthy();
    expect(screen.getByText('Far')).toBeTruthy();
    expect(screen.getByText('Map Resolution')).toBeTruthy();
    expect(screen.getByText('Bias')).toBeTruthy();
    expect(screen.getByText('Normal Bias')).toBeTruthy();
    expect(screen.getByText('Radius')).toBeTruthy();
  });

  it('非直射光不显示阴影设置区（即使 castShadow=true）', () => {
    setupStore({ type: 'point', castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('阴影设置 (Shadow)')).toBeNull();
  });

  it('修改 Camera Size 时调用 updateComponent', () => {
    const mockUpdateComponent = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            light1: {
              id: 'light1',
              type: ObjectType.LIGHT,
              components: {
                light: { color: '#ffffff', intensity: 1, type: 'directional', castShadow: true },
              },
            },
          },
        },
        updateComponent: mockUpdateComponent,
      };
      return selector(state);
    });
    render(<LightProp objectIds={['light1']} />);
    const input = screen.getByDisplayValue('10'); // Camera Size 默认值
    fireEvent.change(input, { target: { value: '20' } });
    expect(mockUpdateComponent).toHaveBeenCalledWith('light1', 'light', { shadowCameraSize: 20 });
  });
});
```

**Step 2: 运行测试确认失败**

```bash
pnpm --filter client test -- --run src/components/inspector/specific/LightProp.test.tsx
```
预期：FAIL（字段和组件尚未实现）

**Step 3: 实现 LightProp.tsx 的阴影设置区**

在 `LightProp.tsx` 中，在现有 `const castShadow = getLightValue('castShadow');` 下方添加阴影字段读取：

```typescript
// 阴影属性（仅直射光）
const shadowCameraSize = getLightValue('shadowCameraSize');
const shadowNear = getLightValue('shadowNear');
const shadowFar = getLightValue('shadowFar');
const shadowMapSize = getLightValue('shadowMapSize');
const shadowBias = getLightValue('shadowBias');
const shadowNormalBias = getLightValue('shadowNormalBias');
const shadowRadius = getLightValue('shadowRadius');

const isDirectional = type === 'directional';
const showShadowSettings = isDirectional && castShadow === true;
```

在组件 return 中，在 Cast Shadow 复选框 `</div>` 之后添加：

```tsx
{showShadowSettings && (
  <div className="flex flex-col gap-2 pl-2 border-l border-slate-600 mt-1">
    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
      阴影设置 (Shadow)
    </h4>
    <div className="grid grid-cols-2 gap-2">
      <NumberInput
        label="Camera Size"
        value={shadowCameraSize === undefined ? 10 : shadowCameraSize as number}
        onChange={(val) => handleUpdate('shadowCameraSize', val)}
        step="1"
      />
      <NumberInput
        label="Near"
        value={shadowNear === undefined ? 0.5 : shadowNear as number}
        onChange={(val) => handleUpdate('shadowNear', val)}
        step="0.1"
      />
      <NumberInput
        label="Far"
        value={shadowFar === undefined ? 500 : shadowFar as number}
        onChange={(val) => handleUpdate('shadowFar', val)}
        step="10"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Map Resolution</label>
        <select
          value={shadowMapSize === undefined ? 1024 : shadowMapSize as number}
          onChange={(e) => handleUpdate('shadowMapSize', Number(e.target.value) as 512 | 1024 | 2048 | 4096)}
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
        value={shadowBias === undefined ? -0.001 : shadowBias as number}
        onChange={(val) => handleUpdate('shadowBias', val)}
        step="0.001"
      />
      <NumberInput
        label="Normal Bias"
        value={shadowNormalBias === undefined ? 0.02 : shadowNormalBias as number}
        onChange={(val) => handleUpdate('shadowNormalBias', val)}
        step="0.01"
      />
      <NumberInput
        label="Radius"
        value={shadowRadius === undefined ? 1 : shadowRadius as number}
        onChange={(val) => handleUpdate('shadowRadius', val)}
        step="0.5"
      />
    </div>
  </div>
)}
```

**Step 4: 运行测试确认通过**

```bash
pnpm --filter client test -- --run src/components/inspector/specific/LightProp.test.tsx
```
预期：全部 PASS

**Step 5: 验证编译**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | head -20
```
预期：无新增错误。

**Step 6: 提交**

```bash
git add packages/client/src/components/inspector/specific/LightProp.tsx \
        packages/client/src/components/inspector/specific/LightProp.test.tsx
git commit -m "feat(inspector): 直射光 Inspector 补充完整阴影设置 UI"
```

---

## 验收标准

1. 在场景中选中一个直射光对象，Inspector 面板显示 Cast Shadow 复选框
2. 勾选 Cast Shadow 后，下方出现"阴影设置 (Shadow)"分组，包含 7 个控件
3. 取消勾选 Cast Shadow，阴影设置区消失
4. 修改 Camera Size / Map Resolution 等值后，3D 视口中阴影范围/质量实时变化
5. 选中 point/spot 灯光时，阴影设置区不出现
6. 所有 `LightProp.test.tsx` 测试通过
