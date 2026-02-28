# Plan 02 — UI 原子组件：ColorInput + Vector2Field

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 将 MaterialProp 内联的 color picker 抽取为独立组件，并新建 Vector2Field（两组 NumberInput）。

**前置条件：** 无（可与 Plan 01 并行执行）

---

## Task 1: ColorInput.tsx

**Files:**
- Create: `packages/client/src/components/inspector/common/ColorInput.tsx`
- Create: `packages/client/src/components/inspector/common/ColorInput.test.tsx`

### Step 1: 写测试

```tsx
// packages/client/src/components/inspector/common/ColorInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ColorInput } from './ColorInput';

describe('ColorInput', () => {
  it('渲染 label 和颜色值', () => {
    const { getByText } = render(
      <ColorInput label="自发光颜色" value="#ff0000" onChange={vi.fn()} />
    );
    expect(getByText('自发光颜色')).toBeTruthy();
    expect(getByText('#ff0000')).toBeTruthy();
  });

  it('color input 改变时调用 onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorInput label="颜色" value="#ffffff" onChange={onChange} />
    );
    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#aabbcc' } });
    expect(onChange).toHaveBeenCalledWith('#aabbcc');
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/components/inspector/common/ColorInput.test.tsx
```

期望：FAIL

### Step 3: 实现 ColorInput.tsx

```tsx
// packages/client/src/components/inspector/common/ColorInput.tsx
import React from 'react';

interface ColorInputProps {
  label: string;
  value: string;   // hex string, e.g. "#ffffff"
  onChange: (value: string) => void;
}

export const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-[11px] text-[#999999] font-medium">{label}</label>
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
      />
      <span className="text-[10px] font-mono text-slate-400">{value}</span>
    </div>
  </div>
);
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/components/inspector/common/ColorInput.test.tsx
```

### Step 5: Commit

```bash
git add packages/client/src/components/inspector/common/ColorInput.tsx \
        packages/client/src/components/inspector/common/ColorInput.test.tsx
git commit -m "feat(inspector): extract ColorInput common component"
```

---

## Task 2: Vector2Field.tsx

**Files:**
- Create: `packages/client/src/components/inspector/common/Vector2Field.tsx`
- Create: `packages/client/src/components/inspector/common/Vector2Field.test.tsx`

### Step 1: 写测试

```tsx
// packages/client/src/components/inspector/common/Vector2Field.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Vector2Field } from './Vector2Field';

describe('Vector2Field', () => {
  it('渲染 label 和两个输入框', () => {
    const { getByText, getAllByRole } = render(
      <Vector2Field label="法线缩放" value={[1, 2]} onChange={vi.fn()} step={0.01} />
    );
    expect(getByText('法线缩放')).toBeTruthy();
    const inputs = getAllByRole('spinbutton');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('1');
    expect((inputs[1] as HTMLInputElement).value).toBe('2');
  });

  it('修改 X 值时 onChange 接收 [newX, oldY]', () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(
      <Vector2Field label="法线缩放" value={[1, 2]} onChange={onChange} step={0.01} />
    );
    const inputs = getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '0.5' } });
    fireEvent.blur(inputs[0]);
    expect(onChange).toHaveBeenCalledWith([0.5, 2]);
  });

  it('修改 Y 值时 onChange 接收 [oldX, newY]', () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(
      <Vector2Field label="法线缩放" value={[1, 2]} onChange={onChange} step={0.01} />
    );
    const inputs = getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '3' } });
    fireEvent.blur(inputs[1]);
    expect(onChange).toHaveBeenCalledWith([1, 3]);
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/components/inspector/common/Vector2Field.test.tsx
```

期望：FAIL

### Step 3: 实现 Vector2Field.tsx

```tsx
// packages/client/src/components/inspector/common/Vector2Field.tsx
import React from 'react';
import { NumberInput } from './NumberInput';

interface Vector2FieldProps {
  label: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: string;
  min?: number;
  max?: number;
}

export const Vector2Field: React.FC<Vector2FieldProps> = ({
  label,
  value,
  onChange,
  step = '0.01',
  min,
  max,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] text-[#999999] font-medium">{label}</label>
    <div className="flex gap-2">
      <NumberInput
        label="X"
        value={value[0]}
        onChange={(v) => onChange([v, value[1]])}
        step={step}
        min={min}
        max={max}
        className="flex-1"
      />
      <NumberInput
        label="Y"
        value={value[1]}
        onChange={(v) => onChange([value[0], v])}
        step={step}
        min={min}
        max={max}
        className="flex-1"
      />
    </div>
  </div>
);
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/components/inspector/common/Vector2Field.test.tsx
```

### Step 5: Commit

```bash
git add packages/client/src/components/inspector/common/Vector2Field.tsx \
        packages/client/src/components/inspector/common/Vector2Field.test.tsx
git commit -m "feat(inspector): add Vector2Field common component"
```
