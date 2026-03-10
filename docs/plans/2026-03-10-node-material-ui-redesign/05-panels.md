# Phase 5: 属性面板 & 预览面板

> 上级索引：[README.md](./README.md)

---

## Task 7: PropertyPanel 对齐 InspectorPanel {#task-7}

**文件:**
- Modify: `packages/client/src/features/nodeMaterial/PropertyPanel.tsx`

**目标:** bg-panel-dark、section header 对齐 Inspector 样式、带图标的空状态占位、字段布局统一

### Step 1: 完整替换文件内容

```tsx
// packages/client/src/features/nodeMaterial/PropertyPanel.tsx
import React from 'react';
import type { Node } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { NODE_REGISTRY } from './nodes/nodeRegistry';
import type { NodeRFData } from '@/types';

interface Props {
  selectedNodes: Node[];
}

export const PropertyPanel: React.FC<Props> = ({ selectedNodes }) => {
  const { updateNodeData } = useReactFlow();

  if (!selectedNodes.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-panel-dark text-slate-600 select-none">
        <span className="material-symbols-outlined text-[32px]">touch_app</span>
        <span className="text-[11px]">点击节点查看属性</span>
      </div>
    );
  }

  const node = selectedNodes[0];
  const d = node.data as unknown as NodeRFData;
  const typeDef = NODE_REGISTRY[d.typeKey];
  if (!typeDef) return null;

  const setParam = (key: string, value: unknown) => {
    updateNodeData(node.id, {
      ...d,
      params: { ...d.params, [key]: value },
    } as unknown as Record<string, unknown>);
  };

  const inputCls =
    'bg-bg-dark border border-border-dark text-white text-[11px] px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent-blue/40 w-full';

  return (
    <div className="flex-1 overflow-y-auto bg-panel-dark custom-scrollbar">
      {/* Section 标题 */}
      <div className="px-3 py-2 border-b border-border-dark sticky top-0 bg-panel-dark z-10">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
          属性
        </div>
        <div className="text-[12px] text-slate-200 font-medium truncate">
          {typeDef.label}
        </div>
      </div>

      {/* 属性字段 */}
      <div className="p-3 space-y-3">
        {Object.entries(d.params).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {key}
            </label>
            {typeof value === 'number' ? (
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setParam(key, parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            ) : typeof value === 'string' && value.startsWith('#') ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setParam(key, e.target.value)}
                    className="w-8 h-8 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent p-0"
                  />
                </div>
                <span className="text-[11px] text-slate-300 font-mono">{value.toUpperCase()}</span>
              </div>
            ) : typeof value === 'string' && key === 'space' ? (
              <select
                value={value}
                onChange={(e) => setParam(key, e.target.value)}
                className={inputCls}
              >
                <option value="local">Local</option>
                <option value="world">World</option>
                <option value="view">View</option>
              </select>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Step 2: 运行测试确认无回归

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/PropertyPanel.test.tsx 2>&1 | tail -8
```

Expected: 2 tests PASS

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/PropertyPanel.tsx
git commit -m "style(nodeMaterial): redesign PropertyPanel - panel-dark bg, inspector-style section header, icon placeholder"
```

---

## Task 8: PreviewPanel 标题行 & 错误浮层 {#task-8}

**文件:**
- Modify: `packages/client/src/features/nodeMaterial/PreviewPanel.tsx`

**目标:** PREVIEW 标题行（10px uppercase）+ h-52 + 错误浮层带 error 图标

### Step 1: 完整替换文件内容

```tsx
// packages/client/src/features/nodeMaterial/PreviewPanel.tsx
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PreviewMesh: React.FC<{ material: any | null }> = ({ material }) => {
  const ref = useRef<THREE.Mesh>(null);
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      {material ? (
        <primitive object={material} attach="material" />
      ) : (
        <meshStandardMaterial color="#3a3f4b" roughness={0.5} metalness={0.2} />
      )}
    </mesh>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { material: any | null; error: string | null }

export const PreviewPanel: React.FC<Props> = ({ material, error }) => (
  <div className="h-52 bg-black border-t border-border-dark relative shrink-0 flex flex-col">
    {/* 标题行 */}
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border-dark bg-panel-dark shrink-0">
      <span className="material-symbols-outlined text-[13px] text-slate-500">view_in_ar</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        预览
      </span>
    </div>

    {/* 3D Canvas */}
    <div className="flex-1 relative overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} />
        <directionalLight position={[-2, -1, -2]} intensity={0.3} />
        <PreviewMesh material={material} />
        <OrbitControls enableZoom={false} />
      </Canvas>

      {/* 编译错误浮层 */}
      {error && (
        <div className="absolute inset-x-2 bottom-2 flex items-start gap-1.5 text-[10px] text-red-400 bg-red-950/80 border border-red-800/50 px-2 py-1.5 rounded backdrop-blur-sm">
          <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">error</span>
          <span className="line-clamp-2 leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  </div>
);
```

### Step 2: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: 4（无新增）

### Step 3: 运行全量测试

```bash
pnpm --filter client test -- --run 2>&1 | tail -5
```

Expected: 全部测试通过，无回归

### Step 4: Commit

```bash
git add packages/client/src/features/nodeMaterial/PreviewPanel.tsx
git commit -m "style(nodeMaterial): redesign PreviewPanel - PREVIEW title bar, error overlay with icon, extra light"
```

---

## Phase 5 完成后

执行最终验证：

```bash
# 类型检查
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
# Expected: 4

# 全量测试
pnpm --filter client test -- --run 2>&1 | tail -5
# Expected: 所有测试通过
```

然后调用 `superpowers:finishing-a-development-branch` 完成开发。
