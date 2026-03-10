# Phase 3: 节点卡片

> 上级索引：[README.md](./README.md)

---

## Task 4: BaseNode 全面重设计 {#task-4}

**文件:**
- Modify: `packages/client/src/features/nodeMaterial/nodes/components/BaseNode.tsx`

**目标:** 圆角卡片 + 阴影 + ring 选中光晕 + 圆形 port + 分类图标标题栏 + 分隔线

### Step 1: 完整替换文件内容

```tsx
// packages/client/src/features/nodeMaterial/nodes/components/BaseNode.tsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeTypeDef, NodePortDef } from '@/types';
import { CATEGORY_MAP } from '../nodeCategories';

const PORT_COLORS: Record<string, string> = {
  float: '#4ade80', int: '#86efac', bool: '#fcd34d',
  vec2: '#60a5fa', vec3: '#a78bfa', vec4: '#f472b6',
  color: '#fb923c', texture: '#38bdf8', mat4: '#94a3b8', any: '#9ca3af',
};
const pc = (type: string) => PORT_COLORS[type] ?? '#9ca3af';

interface BaseNodeProps {
  typeDef: NodeTypeDef;
  selected?: boolean;
  children?: React.ReactNode;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ typeDef, selected = false, children }) => {
  const cat = CATEGORY_MAP.get(typeDef.category);
  const headerBg = cat?.color ?? '#374151';

  return (
    <div
      className={`min-w-[176px] rounded-md text-[11px] shadow-xl shadow-black/60 transition-shadow ${
        selected
          ? 'ring-2 ring-accent-blue/60 ring-offset-1 ring-offset-bg-dark border border-accent-blue'
          : 'border border-border-dark hover:border-slate-600'
      }`}
      style={{ background: '#1a1e28' }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md select-none"
        style={{ background: headerBg }}
      >
        {cat?.icon && (
          <span className="material-symbols-outlined text-[13px] text-white/80 shrink-0">
            {cat.icon}
          </span>
        )}
        <span className="text-[11px] font-semibold text-white truncate">
          {typeDef.label}
        </span>
      </div>

      {/* 分隔线 */}
      <div className="border-b border-black/30" />

      {/* Body */}
      <div className="flex py-2 min-h-[28px]">
        {/* 左：输入 handles */}
        <div className="flex flex-col gap-2 shrink-0">
          {typeDef.inputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center h-5">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className="!rounded-full !w-3 !h-3 !border-2 !border-white/20 transition-transform hover:scale-125"
                style={{ background: pc(port.type) }}
              />
              <span className="ml-4 mr-2 text-slate-400 whitespace-nowrap text-[11px]">
                {port.label}
              </span>
            </div>
          ))}
        </div>

        {/* 中：内联编辑控件 */}
        {children && (
          <div className="flex-1 flex flex-col gap-1 px-2 min-w-0 justify-center">
            {children}
          </div>
        )}

        {/* 右：输出 handles */}
        <div className="flex flex-col gap-2 ml-auto shrink-0">
          {typeDef.outputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center justify-end h-5">
              <span className="mr-4 ml-2 text-slate-200 whitespace-nowrap text-[11px]">
                {port.label}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                className="!rounded-full !w-3 !h-3 !border-2 !border-white/20 transition-transform hover:scale-125"
                style={{ background: pc(port.type) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Step 2: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: 4（无新增）

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/nodes/components/BaseNode.tsx
git commit -m "style(nodeMaterial): redesign BaseNode - rounded card, ring selection, circular ports, category icon header"
```

---

## Task 5: InputNode 内联控件样式对齐 {#task-5}

**文件:**
- Modify: `packages/client/src/features/nodeMaterial/nodes/components/InputNode.tsx`

**目标:** 内联控件使用 bg-bg-dark + border-border-dark，ColorInput 带色块预览更美观

### Step 1: 只替换 `inputCls` 变量定义和 ColorInput 渲染

找到第 25–26 行，替换 `inputCls`：

```typescript
    const inputCls =
      'bg-bg-dark border border-border-dark text-white text-[11px] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-accent-blue/40 nodrag';
```

找到 ColorInput 的 return（约第 39–49 行），替换为：

```tsx
      case 'ColorInput':
        return (
          <div className="flex items-center gap-1.5 nodrag">
            <div
              className="w-5 h-5 rounded border border-white/20 cursor-pointer shrink-0 overflow-hidden"
            >
              <input
                type="color"
                value={p.value as string ?? '#ffffff'}
                onChange={(e) => setParam('value', e.target.value)}
                className="w-8 h-8 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent p-0"
              />
            </div>
            <span className="text-slate-400 text-[10px] font-mono">
              {(p.value as string ?? '#ffffff').toUpperCase()}
            </span>
          </div>
        );
```

### Step 2: 运行测试

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/ 2>&1 | tail -8
```

Expected: 所有 nodeMaterial 测试通过

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/nodes/components/InputNode.tsx
git commit -m "style(nodeMaterial): align InputNode inline controls to design system (bg-bg-dark, ring focus)"
```
