# Plan 04 — MaterialFieldRenderer + MaterialProp 重构

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 新建 Schema 驱动的通用字段渲染器，将 MaterialProp.tsx 重构为按 Schema 渲染的可折叠分组布局。

**前置条件：** Plan 01（Schema）、Plan 02（ColorInput/Vector2Field）、Plan 03（TexturePicker）全部完成

---

## Task 1: MaterialFieldRenderer.tsx

**Files:**
- Create: `packages/client/src/components/inspector/MaterialFieldRenderer.tsx`
- Create: `packages/client/src/components/inspector/MaterialFieldRenderer.test.tsx`

### Step 1: 写测试

```tsx
// packages/client/src/components/inspector/MaterialFieldRenderer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaterialFieldRenderer } from './MaterialFieldRenderer';
import type { MaterialFieldDef } from '@/features/materials/materialSchema';

// mock TexturePicker
vi.mock('./TexturePicker', () => ({
  TexturePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

const mockProjectId = 1;

describe('MaterialFieldRenderer', () => {
  it('number 类型渲染 NumberInput', () => {
    const field: MaterialFieldDef = {
      key: 'roughness', type: 'number', group: 'pbr', label: '粗糙度', min: 0, max: 1, step: 0.01
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={0.5}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('粗糙度')).toBeTruthy();
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('0.5');
  });

  it('color 类型渲染颜色选择器', () => {
    const field: MaterialFieldDef = {
      key: 'emissive', type: 'color', group: 'base', label: '自发光颜色'
    };
    const { container } = render(
      <MaterialFieldRenderer
        field={field}
        value="#ff0000"
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('自发光颜色')).toBeTruthy();
    expect(container.querySelector('input[type="color"]')).toBeTruthy();
  });

  it('boolean 类型渲染 Checkbox', () => {
    const field: MaterialFieldDef = {
      key: 'flatShading', type: 'boolean', group: 'base', label: '平面着色'
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={false}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('平面着色')).toBeTruthy();
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('texture 类型渲染 TexturePicker', () => {
    const field: MaterialFieldDef = {
      key: 'map', type: 'texture', group: 'maps', label: '漫反射贴图'
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={null}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('漫反射贴图')).toBeTruthy();
  });

  it('vector2 类型渲染 Vector2Field', () => {
    const field: MaterialFieldDef = {
      key: 'normalScale', type: 'vector2', group: 'pbr', label: '法线缩放', step: 0.01
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={[1, 1]}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('法线缩放')).toBeTruthy();
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBe(2);
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/components/inspector/MaterialFieldRenderer.test.tsx
```

### Step 3: 实现 MaterialFieldRenderer.tsx

```tsx
// packages/client/src/components/inspector/MaterialFieldRenderer.tsx
import React from 'react';
import type { MaterialFieldDef } from '@/features/materials/materialSchema';
import { NumberInput } from './common/NumberInput';
import { ColorInput } from './common/ColorInput';
import { Vector2Field } from './common/Vector2Field';
import { Checkbox } from './common/Checkbox';
import { TexturePicker } from './TexturePicker';
import type { TextureRef } from './TexturePicker';

interface MaterialFieldRendererProps {
  field: MaterialFieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  projectId: number;
}

export const MaterialFieldRenderer: React.FC<MaterialFieldRendererProps> = ({
  field,
  value,
  onChange,
  projectId,
}) => {
  const { key, type, label, min, max, step } = field;

  switch (type) {
    case 'number':
      return (
        <NumberInput
          label={label}
          value={typeof value === 'number' ? value : 0}
          onChange={(v) => onChange(key, v)}
          step={step !== undefined ? String(step) : '0.01'}
          min={min}
          max={max}
        />
      );

    case 'color':
      return (
        <ColorInput
          label={label}
          value={typeof value === 'string' ? value : '#ffffff'}
          onChange={(v) => onChange(key, v)}
        />
      );

    case 'boolean':
      return (
        <Checkbox
          label={label}
          checked={typeof value === 'boolean' ? value : false}
          onChange={(v) => onChange(key, v)}
        />
      );

    case 'vector2': {
      const v2 = Array.isArray(value) && value.length === 2
        ? (value as [number, number])
        : [0, 0] as [number, number];
      return (
        <Vector2Field
          label={label}
          value={v2}
          onChange={(v) => onChange(key, v)}
          step={step !== undefined ? String(step) : '0.01'}
          min={min}
          max={max}
        />
      );
    }

    case 'texture':
      return (
        <TexturePicker
          label={label}
          value={(value as TextureRef | null) ?? null}
          onChange={(v) => onChange(key, v)}
          projectId={projectId}
        />
      );

    default:
      return null;
  }
};
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/components/inspector/MaterialFieldRenderer.test.tsx
```

### Step 5: Commit

```bash
git add packages/client/src/components/inspector/MaterialFieldRenderer.tsx \
        packages/client/src/components/inspector/MaterialFieldRenderer.test.tsx
git commit -m "feat(inspector): add schema-driven MaterialFieldRenderer"
```

---

## Task 2: 重构 MaterialProp.tsx 为 Schema 驱动

**Files:**
- Modify: `packages/client/src/components/inspector/MaterialProp.tsx`
- Modify: `packages/client/src/components/inspector/MaterialProp.test.tsx`

### Step 1: 在测试文件中追加新测试（先追加，确认失败）

```tsx
// 追加到 MaterialProp.test.tsx 末尾（查看已有测试，追加而非覆盖）

// mock TexturePicker
vi.mock('./TexturePicker', () => ({
  TexturePicker: ({ label }: any) => <div data-testid="texture-picker">{label}</div>,
}));

it('MeshStandardMaterial 渲染 emissive、flatShading、normalScale 字段', () => {
  // 需要在 sceneStore 中设置 material type 为 Standard
  // 参照已有测试的 store mock 方式
  // ... 断言 screen.getByText('自发光颜色')、'平面着色' 存在
});

it('MeshPhysicalMaterial 额外渲染 clearcoat、sheen、iridescence 字段', () => {
  // 断言 'clearcoat'/'清漆强度' 存在
});

it('贴图 group 默认折叠，点击展开后显示 TexturePicker', () => {
  // 断言初始不显示 texture-picker，点击"贴图"折叠标题后显示
});
```

**注意：** 查看 `MaterialProp.test.tsx` 现有结构，按已有 mock 方式补充测试。

### Step 2: 运行测试确认新测试失败

```bash
pnpm --filter client test -- --run src/components/inspector/MaterialProp.test.tsx
```

### Step 3: 重构 MaterialProp.tsx

下面是完整重构后的 MaterialProp.tsx：

```tsx
// packages/client/src/components/inspector/MaterialProp.tsx
import React, { useState, useMemo } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useProjectStore } from '@/stores/projectStore';
import type { MaterialSpec, MaterialType } from '@/types';
import { ChangeMaterialTypeCommand } from '@/features/editor/commands/ChangeMaterialTypeCommand';
import { UpdateMaterialPropsCommand } from '@/features/editor/commands/UpdateMaterialPropsCommand';
import {
  getFieldsForType,
  type FieldGroup,
} from '@/features/materials/materialSchema';
import { MaterialFieldRenderer } from './MaterialFieldRenderer';

const MATERIAL_TYPES: readonly MaterialType[] = [
  'MeshStandardMaterial',
  'MeshPhysicalMaterial',
  'MeshPhongMaterial',
  'MeshLambertMaterial',
  'MeshBasicMaterial',
] as const;

const GROUP_LABELS: Record<FieldGroup, string> = {
  base:      '基础 (Base)',
  pbr:       'PBR',
  physical:  '物理高级 (Physical)',
  maps:      '贴图 (Maps)',
  wireframe: '线框 (Wireframe)',
};

// Physical-only groups 默认折叠
const DEFAULT_COLLAPSED: FieldGroup[] = ['physical', 'maps', 'wireframe'];

export const MaterialProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  const material = useSceneStore(
    (state) => state.scene.objects[objectId]?.components?.mesh?.material
  ) as MaterialSpec | undefined;
  const currentProjectId = useProjectStore((s) => s.currentScene?.project_id ?? 0);

  const type = material?.type ?? 'MeshStandardMaterial';
  const props = (material?.props ?? {}) as Record<string, unknown>;

  // 折叠状态：key = group，value = 是否折叠
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of DEFAULT_COLLAPSED) init[g] = true;
    return init;
  });

  // 按 group 分组字段
  const fieldsByGroup = useMemo(() => {
    const all = getFieldsForType(type as MaterialType);
    const map = new Map<FieldGroup, typeof all>();
    for (const f of all) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return map;
  }, [type]);

  const exec = (cmd: any) => useHistoryStore.getState().execute(cmd);

  const handleTypeChange = (nextType: MaterialType) => {
    exec(new ChangeMaterialTypeCommand(objectId, nextType));
  };

  const handlePropChange = (key: string, value: unknown) => {
    exec(new UpdateMaterialPropsCommand(objectId, { [key]: value }));
  };

  const toggleGroup = (group: FieldGroup) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
      {/* 类型选择 */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[#999999] font-medium">类型</label>
        <select
          className="bg-[#0c0e14] text-[12px] text-white border border-[#2d333f] rounded px-2 py-1"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
        >
          {MATERIAL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Standard / Physical 的 Schema 字段分组 */}
      {(type === 'MeshStandardMaterial' || type === 'MeshPhysicalMaterial') && (
        <>
          {[...fieldsByGroup.entries()].map(([group, fields]) => (
            <div key={group}>
              {/* 分组标题（可折叠） */}
              <button
                className="flex items-center w-full text-left gap-1 mb-1.5"
                onClick={() => toggleGroup(group)}
              >
                <span className="text-[9px] text-slate-500">
                  {collapsed[group] ? '▶' : '▼'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {GROUP_LABELS[group] ?? group}
                </span>
              </button>

              {/* 字段列表 */}
              {!collapsed[group] && (
                <div className="space-y-2 pl-2">
                  {fields.map((field) => (
                    <MaterialFieldRenderer
                      key={field.key}
                      field={field}
                      value={props[field.key] ?? undefined}
                      onChange={handlePropChange}
                      projectId={currentProjectId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Phong / Lambert / Basic 仍用旧逻辑（简单字段，不值得 Schema 化） */}
      {type === 'MeshPhongMaterial' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-[#999999] font-medium">Color</label>
            <input
              type="color"
              value={(typeof props.color === 'string' ? props.color : '#cccccc')}
              onChange={(e) => handlePropChange('color', e.target.value)}
              className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

**注意事项：**
1. `useProjectStore` 提供 `currentProjectId`，供 `TexturePicker` 使用。如果 `currentScene` 可能为 null，用 `?? 0` 兜底。
2. 原有的 Phong/Lambert/Basic 的 color 字段保留简化版（这些材质本次不做全量扩展）。

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/components/inspector/MaterialProp.test.tsx
```

### Step 5: Commit

```bash
git add packages/client/src/components/inspector/MaterialProp.tsx \
        packages/client/src/components/inspector/MaterialProp.test.tsx
git commit -m "feat(inspector): refactor MaterialProp to schema-driven collapsible groups"
```
